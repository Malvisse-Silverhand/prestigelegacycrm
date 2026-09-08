"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { slugify, DEFAULT_CONTENT, type LandingContent, type LandingLayout, type LandingProduct } from "@/lib/landing-content";

const PRODUCTS: LandingProduct[] = ["medical", "hibah", "both"];

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
      layout: input.layout === "quickquote" ? "quickquote" : "full",
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
    .select("id, slug")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't save your changes." };

  revalidatePath("/lead-generation");
  revalidatePath(`/lead-generation/${id}`);
  revalidatePath(`/p/${data.slug as string}`);
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
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't save these settings.", slug: null };

  revalidatePath("/lead-generation");
  revalidatePath(`/lead-generation/${input.id}`);
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

export async function deleteLandingPage(id: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("landing_pages").delete().eq("id", id);
  if (error) return { error: "Couldn't delete this landing page." };

  revalidatePath("/lead-generation");
  return { error: null };
}
