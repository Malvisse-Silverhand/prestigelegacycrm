"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { slugify, DEFAULT_CONTENT, type LandingContent, type LandingLayout, type LandingProduct } from "@/lib/landing-content";
import { RESERVED_AGENT_SLUGS, isValidAgentSlug, landingPath } from "@/lib/agent-slug";

const PRODUCTS: LandingProduct[] = ["medical", "hibah", "both"];
const LAYOUTS: LandingLayout[] = ["full", "quickquote", "medical", "agent"];

// Tolerant: agent_slug only exists once the 20260927090000 migration has run.
// Used to revalidate a page's agent-namespaced URL after a save -- if the
// column isn't there yet, there's no agent URL to revalidate.
async function tryAgentSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agentId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.from("profiles").select("agent_slug").eq("id", agentId).maybeSingle();
    if (error || !data) return null;
    return (data.agent_slug as string | null) ?? null;
  } catch {
    return null;
  }
}

// The slug is the public URL, so a collision would silently hand one agent's
// traffic to another. Uniqueness is enforced by the table; this finds the
// next free variant rather than failing the save.
async function freeSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  desired: string,
  excludeId?: string,
) {
  const base = slugify(desired) || "landing";
  for (let i = 0; i < 25; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    let q = supabase.from("landing_pages").select("id").eq("slug", candidate);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createLandingPage(input: {
  name: string;
  product: string;
  ownerId: string;
  layout?: LandingLayout;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in.", id: null };

  const name = input.name.trim();
  if (name.length < 2) return { error: "Give this landing page a name.", id: null };
  const product = PRODUCTS.includes(input.product as LandingProduct)
    ? (input.product as LandingProduct)
    : "both";
  // An agent can only ever file a page under themselves; RLS enforces the
  // same rule for everyone else, this is the friendly version of it.
  const ownerId = profile.role === "agent" ? profile.id : input.ownerId || profile.id;

  const supabase = await createClient();
  const slug = await freeSlug(supabase, name);

  const { data, error } = await supabase
    .from("landing_pages")
    .insert({
      agent_id: ownerId,
      slug,
      name,
      product,
      layout: LAYOUTS.includes(input.layout as LandingLayout) ? input.layout : "full",
      content: DEFAULT_CONTENT,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    Sentry.captureException(error ?? new Error("landing page insert matched no row"), {
      tags: { action: "createLandingPage" },
    });
    return { error: "Couldn't create this landing page. Please try again.", id: null };
  }

  revalidatePath("/lead-generation");
  return { error: null, id: data.id as string };
}

export async function saveLandingContent(id: string, content: LandingContent) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("landing_pages")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, slug, agent_id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't save your changes." };

  const agentSlug = await tryAgentSlug(supabase, data.agent_id as string);
  revalidatePath("/lead-generation");
  revalidatePath(`/lead-generation/${id}`);
  revalidatePath(`/p/${data.slug as string}`);
  revalidatePath(landingPath(agentSlug, data.slug as string));
  return { error: null };
}

export async function saveLandingSettings(input: {
  id: string;
  name: string;
  slug: string;
  product: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in.", slug: null };

  const name = input.name.trim();
  if (name.length < 2) return { error: "Give this landing page a name.", slug: null };
  const product = PRODUCTS.includes(input.product as LandingProduct)
    ? (input.product as LandingProduct)
    : "both";

  const supabase = await createClient();
  const slug = await freeSlug(supabase, input.slug || name, input.id);

  const { data, error } = await supabase
    .from("landing_pages")
    .update({ name, slug, product, updated_at: new Date().toISOString() })
    .eq("id", input.id)
    .select("id, agent_id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't save these settings.", slug: null };

  const agentSlug = await tryAgentSlug(supabase, data.agent_id as string);
  revalidatePath("/lead-generation");
  revalidatePath(`/lead-generation/${input.id}`);
  revalidatePath(`/p/${slug}`);
  revalidatePath(landingPath(agentSlug, slug));
  return { error: null, slug };
}

export async function setLandingPublished(id: string, isPublished: boolean) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("landing_pages")
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, slug")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't update the status." };

  revalidatePath("/lead-generation");
  revalidatePath(`/p/${data.slug as string}`);
  return { error: null };
}

// The agent link is per-agent, not per-page: changing it moves every landing
// page that agent owns to the new /<slug>/... namespace at once. /p/<slug>
// links are unaffected -- they never depended on this.
export async function saveAgentSlug(
  pageId: string,
  raw: string,
): Promise<{ error: string | null; agentSlug: string | null }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in.", agentSlug: null };

  const supabase = await createClient();
  // RLS limits this to pages the caller can manage, so a page that doesn't
  // resolve here is either someone else's or doesn't exist -- same message
  // either way.
  const { data: page, error: pageError } = await supabase
    .from("landing_pages")
    .select("agent_id")
    .eq("id", pageId)
    .maybeSingle();
  if (pageError || !page) return { error: "Not found.", agentSlug: null };

  const slug = slugify(raw);
  if (slug.length < 3) return { error: "Use 3–60 lowercase letters, numbers or dashes.", agentSlug: null };
  if (RESERVED_AGENT_SLUGS.has(slug)) {
    return { error: "That word is reserved — choose another.", agentSlug: null };
  }
  if (!isValidAgentSlug(slug)) {
    return { error: "Use 3–60 lowercase letters, numbers or dashes.", agentSlug: null };
  }

  const admin = createAdminClient();
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("agent_slug", slug)
    .neq("id", page.agent_id as string)
    .maybeSingle();
  if (taken) return { error: "That link is already taken.", agentSlug: null };

  const { error: updateError } = await admin
    .from("profiles")
    .update({ agent_slug: slug })
    .eq("id", page.agent_id as string);
  if (updateError) {
    if ((updateError as { code?: string }).code === "42703") {
      return { error: "Run the latest database migration first.", agentSlug: null };
    }
    Sentry.captureException(updateError, { tags: { action: "saveAgentSlug" } });
    return { error: "Couldn't save this link.", agentSlug: null };
  }

  revalidatePath("/lead-generation");
  return { error: null, agentSlug: slug };
}

export async function deleteLandingPage(id: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("landing_pages").delete().eq("id", id);
  if (error) return { error: "Couldn't delete this landing page." };

  revalidatePath("/lead-generation");
  return { error: null };
}
