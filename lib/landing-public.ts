import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { withDefaults, type LandingContent, type LandingProduct } from "@/lib/landing-content";

export type PublicLandingPage = {
  id: string;
  slug: string;
  product: LandingProduct;
  content: LandingContent;
  agent: {
    id: string;
    fullName: string;
    firstName: string;
    initials: string;
    phone: string | null;
    email: string;
    waNumber: string;
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

// Resolves a public /p/<slug>. Runs through the service role deliberately: the
// visitor has no account and no session, and an anon-readable policy on
// landing_pages would expose every agent's unpublished drafts and lead counts.
// Only published pages ever resolve.
export async function getPublicLandingPage(slug: string): Promise<PublicLandingPage | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("landing_pages")
    .select("id, slug, product, content, is_published, profiles!landing_pages_agent_id_fkey(id, full_name, phone, email)")
    .eq("slug", slug)
    .maybeSingle();

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

  return {
    id: data.id as string,
    slug: data.slug as string,
    product: (data.product as LandingProduct) ?? "both",
    content: withDefaults(data.content),
    agent: {
      id: agent.id,
      fullName: agent.full_name,
      firstName: parts[0] || agent.full_name,
      initials: initials.toUpperCase() || "?",
      phone: agent.phone,
      email: agent.email,
      waNumber: toWaNumber(agent.phone),
    },
  };
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
