import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/lib/profile-types";
import { withDefaults, type LandingContent, type LandingLayout, type LandingProduct } from "@/lib/landing-content";

export type LandingPageRow = {
  id: string;
  slug: string;
  name: string;
  product: LandingProduct;
  layout: LandingLayout;
  isPublished: boolean;
  viewCount: number;
  leadCount: number;
  agentId: string;
  agentName: string;
  createdAt: string;
  // The owning agent's public URL segment. Read through a separate tolerant
  // query below, so the list still renders before the 20260927090000
  // migration has added the column.
  agentSlug: string | null;
};

export type LandingPageDetail = LandingPageRow & {
  content: LandingContent;
  // The owning agent's profile-level default images (Settings > My Profile),
  // used as the fallback preview in the builder's image fields when a page
  // hasn't overridden them. Null before the migration or when the owner has
  // set none.
  ownerBranding: { logoUrl: string | null; headerUrl: string | null; photoUrl: string | null } | null;
};

// RLS (can_manage_landing_page) already scopes this to the caller's own pages
// plus anyone beneath them, so there is no scope logic to repeat here.
export async function getLandingPages(): Promise<LandingPageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("landing_pages")
    .select("id, slug, name, product, layout, is_published, view_count, lead_count, agent_id, created_at, profiles!landing_pages_agent_id_fkey(full_name)")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as RawRow[];
  const agentSlugs = await getAgentSlugs(
    supabase,
    Array.from(new Set(rows.map((r) => r.agent_id))),
  );
  return rows.map((r) => toRow(r, agentSlugs.get(r.agent_id) ?? null));
}

export async function getLandingPage(id: string): Promise<LandingPageDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("landing_pages")
    .select("id, slug, name, product, layout, is_published, view_count, lead_count, agent_id, content, created_at, profiles!landing_pages_agent_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const agentSlugs = await getAgentSlugs(supabase, [data.agent_id]);
  const ownerBranding = await getOwnerBranding(supabase, data.agent_id);

  return {
    ...toRow(data, agentSlugs.get(data.agent_id) ?? null),
    content: withDefaults(data.content),
    ownerBranding,
  };
}

// Tolerant: these columns only exist once the 20260927090000 migration has
// been applied. A failure (missing column, etc) is swallowed and every agent
// simply has no slug yet -- the list and the builder still render.
async function getAgentSlugs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agentIds: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (agentIds.length === 0) return map;
  try {
    const { data, error } = await supabase.from("profiles").select("id, agent_slug").in("id", agentIds);
    if (error || !data) return map;
    for (const row of data as { id: string; agent_slug: string | null }[]) {
      map.set(row.id, row.agent_slug ?? null);
    }
  } catch {
    // Column not there yet.
  }
  return map;
}

async function getOwnerBranding(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agentId: string,
): Promise<LandingPageDetail["ownerBranding"]> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("landing_logo_url, landing_header_url, landing_photo_url")
      .eq("id", agentId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      logoUrl: (data.landing_logo_url as string | null) ?? null,
      headerUrl: (data.landing_header_url as string | null) ?? null,
      photoUrl: (data.landing_photo_url as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

// Totals across whatever the caller can see -- the header strip on the list.
export async function getLandingStats(pages: LandingPageRow[]) {
  const views = pages.reduce((n, p) => n + p.viewCount, 0);
  const leads = pages.reduce((n, p) => n + p.leadCount, 0);
  return {
    published: pages.filter((p) => p.isPublished).length,
    views,
    leads,
    // A page with no views yet would otherwise read as a 0% conversion rate
    // rather than "nothing to measure".
    conversion: views > 0 ? Math.round((leads / views) * 1000) / 10 : null,
  };
}

// Who a manager can file a new page under. An agent only ever gets themselves.
export async function getPageOwnerOptions(profile: CurrentProfile) {
  if (profile.role === "agent") {
    return [{ id: profile.id, full_name: profile.full_name }];
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("is_active", true)
    .order("full_name");

  const rows = (data ?? []) as { id: string; full_name: string }[];
  return rows.some((r) => r.id === profile.id)
    ? rows
    : [{ id: profile.id, full_name: profile.full_name }, ...rows];
}

type RawRow = {
  id: string;
  slug: string;
  name: string;
  product: string;
  layout?: string;
  is_published: boolean;
  view_count: number;
  lead_count: number;
  agent_id: string;
  created_at: string;
  profiles?: unknown;
};

function toRow(data: RawRow, agentSlug: string | null): LandingPageRow {
  const agent = data.profiles as unknown as { full_name: string } | null;
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    product: (data.product as LandingProduct) ?? "both",
    layout: (data.layout as LandingLayout) ?? "full",
    isPublished: data.is_published,
    viewCount: data.view_count ?? 0,
    leadCount: data.lead_count ?? 0,
    agentId: data.agent_id,
    agentName: agent?.full_name ?? "—",
    createdAt: data.created_at,
    agentSlug,
  };
}
