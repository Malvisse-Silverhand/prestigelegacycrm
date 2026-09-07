import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/lib/profile-types";
import { withDefaults, type LandingContent, type LandingProduct } from "@/lib/landing-content";

export type LandingPageRow = {
  id: string;
  slug: string;
  name: string;
  product: LandingProduct;
  isPublished: boolean;
  viewCount: number;
  leadCount: number;
  agentId: string;
  agentName: string;
  createdAt: string;
};

export type LandingPageDetail = LandingPageRow & { content: LandingContent };

// RLS (can_manage_landing_page) already scopes this to the caller's own pages
// plus anyone beneath them, so there is no scope logic to repeat here.
export async function getLandingPages(): Promise<LandingPageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("landing_pages")
    .select("id, slug, name, product, is_published, view_count, lead_count, agent_id, created_at, profiles!landing_pages_agent_id_fkey(full_name)")
    .order("created_at", { ascending: false });

  return (data ?? []).map(toRow);
}

export async function getLandingPage(id: string): Promise<LandingPageDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("landing_pages")
    .select("id, slug, name, product, is_published, view_count, lead_count, agent_id, content, created_at, profiles!landing_pages_agent_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  return { ...toRow(data), content: withDefaults(data.content) };
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
  is_published: boolean;
  view_count: number;
  lead_count: number;
  agent_id: string;
  created_at: string;
  profiles?: unknown;
};

function toRow(data: RawRow): LandingPageRow {
  const agent = data.profiles as unknown as { full_name: string } | null;
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    product: (data.product as LandingProduct) ?? "both",
    isPublished: data.is_published,
    viewCount: data.view_count ?? 0,
    leadCount: data.lead_count ?? 0,
    agentId: data.agent_id,
    agentName: agent?.full_name ?? "—",
    createdAt: data.created_at,
  };
}
