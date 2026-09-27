import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBrandLogoUrl, getBrandCoverUrl } from "@/lib/site-settings";
import { withDefaults, type LandingContent, type LandingLayout, type LandingProduct } from "@/lib/landing-content";

export type PublicLandingPage = {
  id: string;
  slug: string;
  product: LandingProduct;
  layout: LandingLayout;
  content: LandingContent;
  // The site-wide insurer logo set by a SuperAdmin in Settings > Branding --
  // null means no logo has been uploaded (or the migration hasn't run yet),
  // and the page falls back to a text wordmark. Not per-agent, unlike
  // agent.logoUrl below.
  brandLogoUrl: string | null;
  /** Header fallback when neither the page nor the agent's profile has one. */
  brandCoverUrl: string | null;
  agent: {
    id: string;
    fullName: string;
    firstName: string;
    initials: string;
    phone: string | null;
    email: string;
    waNumber: string;
    // Per-agent URL namespace and profile-level default images, added by the
    // 20260927090000 migration. Read through a separate tolerant query below
    // so this file keeps working before that migration has been applied.
    slug: string | null;
    logoUrl: string | null;
    headerUrl: string | null;
    photoUrl: string | null;
  };
};

// Malaysian mobile numbers are stored as the agent typed them ("012-345 6789",
// "+60 12 345 6789"). wa.me wants bare international digits, so normalise:
// strip everything non-numeric, then turn a local leading 0 into 60.
export function toWaNumber(phone: string | null): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("60")) return digits;
  if (digits.startsWith("0")) return "60" + digits.slice(1);
  return digits;
}

// Shared by both public lookups below: resolves a landing_pages row filtered
// by page slug (and, for the agent-namespaced URL, by agent_id too) to a full
// PublicLandingPage or null. Published pages only.
async function loadPage(filter: { slug: string; agentId?: string }): Promise<PublicLandingPage | null> {
  const admin = createAdminClient();
  let query = admin
    .from("landing_pages")
    .select(
      "id, slug, product, layout, content, is_published, profiles!landing_pages_agent_id_fkey(id, full_name, phone, email)",
    )
    .eq("slug", filter.slug);
  if (filter.agentId) query = query.eq("agent_id", filter.agentId);
  const { data } = await query.maybeSingle();

  if (!data || !data.is_published) return null;

  const agent = data.profiles as unknown as {
    id: string;
    full_name: string;
    phone: string | null;
    email: string;
  } | null;
  if (!agent) return null;

  const parts = agent.full_name.trim().split(/\s+/);
  const initials =
    ((parts[0] || "")[0] || "") + ((parts.length > 1 ? parts[parts.length - 1] : "")[0] || "");

  // Tolerant, separate query: these columns only exist once the
  // 20260927090000 migration has been applied, and a page must still render
  // before that -- just without an agent URL or profile-level default images.
  let agentSlug: string | null = null;
  let logoUrl: string | null = null;
  let headerUrl: string | null = null;
  let photoUrl: string | null = null;
  try {
    const { data: branding, error } = await admin
      .from("profiles")
      .select("agent_slug, landing_logo_url, landing_header_url, landing_photo_url")
      .eq("id", agent.id)
      .maybeSingle();
    if (!error && branding) {
      agentSlug = (branding.agent_slug as string | null) ?? null;
      logoUrl = (branding.landing_logo_url as string | null) ?? null;
      headerUrl = (branding.landing_header_url as string | null) ?? null;
      photoUrl = (branding.landing_photo_url as string | null) ?? null;
    }
  } catch {
    // Columns not there yet -- fall through with nulls.
  }

  // Tolerant on their own (see getBrandLogoUrl/getBrandCoverUrl) -- a missing
  // column or row never blocks the page, it just falls back to the built-in
  // defaults (the text wordmark, the red pattern image).
  const [brandLogoUrl, brandCoverUrl] = await Promise.all([getBrandLogoUrl(), getBrandCoverUrl()]);

  return {
    id: data.id as string,
    slug: data.slug as string,
    product: (data.product as LandingProduct) ?? "both",
    layout: (data.layout as LandingLayout) ?? "full",
    content: withDefaults(data.content),
    brandLogoUrl,
    brandCoverUrl,
    agent: {
      id: agent.id,
      fullName: agent.full_name,
      firstName: parts[0] || agent.full_name,
      initials: initials.toUpperCase() || "?",
      phone: agent.phone,
      email: agent.email,
      waNumber: toWaNumber(agent.phone),
      slug: agentSlug,
      logoUrl,
      headerUrl,
      photoUrl,
    },
  };
}

// Resolves a public /p/<slug>. Runs through the service role deliberately: the
// visitor has no account and no session, and an anon-readable policy on
// landing_pages would expose every agent's unpublished drafts and lead counts.
// Only published pages ever resolve.
export async function getPublicLandingPage(slug: string): Promise<PublicLandingPage | null> {
  return loadPage({ slug });
}

// Resolves a public /<agent-slug>/<page-slug>. Requires the migration to have
// run (agent_slug is null for everyone before that), so this simply returns
// null -- a 404 upstream -- until then; /p/<slug> keeps working regardless.
export async function getPublicAgentLandingPage(
  agentSlug: string,
  pageSlug: string,
): Promise<PublicLandingPage | null> {
  const admin = createAdminClient();
  try {
    const { data: owner, error } = await admin
      .from("profiles")
      .select("id")
      .eq("agent_slug", agentSlug)
      .maybeSingle();
    if (error || !owner) return null;

    return loadPage({ slug: pageSlug, agentId: owner.id as string });
  } catch {
    // agent_slug column not there yet -- no agent URLs can resolve.
    return null;
  }
}

// A view is a page load by someone who isn't the owner looking at their own
// work. Best-effort: a failed counter must never take the page down.
export async function recordLandingView(pageId: string) {
  try {
    const admin = createAdminClient();
    await admin.rpc("increment_landing_view", { page_id: pageId });
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "landing", step: "view" } });
  }
}
