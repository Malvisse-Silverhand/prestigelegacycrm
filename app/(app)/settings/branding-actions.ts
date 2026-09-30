"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { DEFAULT_BRAND, isHexColor, normalizeHex, readableWithWhite } from "@/lib/brand-theme";

// --- My Profile: landing page images --------------------------------------
//
// Self-service, same shape as updateMyProfile: only ever the caller's OWN
// row, taken from getCurrentProfile() rather than an argument. The images
// themselves are uploaded straight from the browser to Supabase Storage by
// ImageUploadField (Server Actions cap out at 1 MB); this action only ever
// sees the resulting public URL.
//
// Runs through the admin client for the same reason updateMyProfile does --
// the authenticated grant on `profiles` covers only `is_active`.
export async function saveMyLandingImages(input: { logoUrl: string; headerUrl: string; photoUrl: string }) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const logoUrl = input.logoUrl.trim();
  const headerUrl = input.headerUrl.trim();
  const photoUrl = input.photoUrl.trim();

  const bucketPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/landing-assets/`;
  const ownPrefix = `${bucketPrefix}${profile.id}/`;
  const isOwn = (url: string) => url === "" || url.startsWith(ownPrefix);
  if (!isOwn(logoUrl) || !isOwn(headerUrl) || !isOwn(photoUrl)) {
    return { error: "Invalid image." };
  }

  const admin = createAdminClient();

  // Read the previous URLs first, so the old objects can be cleaned up once
  // the new ones are saved -- best effort, and only for a bucket that has
  // been created by the migration (the same 42703 check as the update below
  // covers this, since it's the same columns on the same row).
  const { data: current, error: readError } = await admin
    .from("profiles")
    .select("landing_logo_url, landing_header_url, landing_photo_url")
    .eq("id", profile.id)
    .maybeSingle();
  if (readError) {
    if (readError.code === "42703") return { error: "Run the latest database migration first." };
    Sentry.captureException(readError, { tags: { action: "saveMyLandingImages" } });
    return { error: "Couldn't save your images. Please try again." };
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      landing_logo_url: logoUrl || null,
      landing_header_url: headerUrl || null,
      landing_photo_url: photoUrl || null,
    })
    .eq("id", profile.id);
  if (updateError) {
    if (updateError.code === "42703") return { error: "Run the latest database migration first." };
    Sentry.captureException(updateError, { tags: { action: "saveMyLandingImages" } });
    return { error: "Couldn't save your images. Please try again." };
  }

  // Best effort: drop the object each new URL replaced. The startsWith(ownPrefix)
  // check is "the old path is inside <profile.id>/" -- never anything else,
  // even if the stored URL somehow points elsewhere. remove() wants paths
  // relative to the bucket root (`<profile.id>/file.webp`), so only the
  // bucket name is stripped off, not the uid folder.
  const stale: string[] = [];
  for (const [oldUrl, newUrl] of [
    [current?.landing_logo_url as string | null | undefined, logoUrl],
    [current?.landing_header_url as string | null | undefined, headerUrl],
    [current?.landing_photo_url as string | null | undefined, photoUrl],
  ] as const) {
    if (!oldUrl || oldUrl === newUrl || !oldUrl.startsWith(ownPrefix)) continue;
    stale.push(oldUrl.slice(bucketPrefix.length));
  }
  if (stale.length > 0) {
    const { error: removeError } = await admin.storage.from("landing-assets").remove(stale);
    if (removeError) console.error("saveMyLandingImages: stale object removal failed", removeError);
  }

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: profile.id,
    target_id: profile.id,
    action: "profile_landing_images",
  });
  if (auditError) console.error("saveMyLandingImages: audit_log insert failed", auditError);

  revalidatePath("/settings");
  return { error: null };
}

// --- Site Branding: the insurer logo on Agent Landing Pages ----------------
//
// SuperAdmin only -- this is the one logo shared by every agent's page, not a
// per-profile default like saveMyLandingImages above, so it lives on the
// site_settings singleton next to the tracking code. Checked here as well as
// in RLS, same as saveTrackingCode.
//
// The uploaded file itself still goes through ImageUploadField straight to
// the uploader's own folder in Storage (Server Actions cap out at 1 MB) --
// this action only ever sees the resulting public URL, and only accepts one
// that actually lives under that folder.
export async function saveBrandLogo(url: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") return { error: "Not allowed." };

  const trimmed = url.trim();
  const ownPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/landing-assets/${profile.id}/`;
  if (trimmed !== "" && !trimmed.startsWith(ownPrefix)) return { error: "Invalid image." };

  const logoUrl = trimmed || null;
  const admin = createAdminClient();
  const { error } = await admin
    .from("site_settings")
    .update({
      brand_logo_url: logoUrl,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("id", true);

  if (error) {
    if (error.code === "42703") return { error: "Run the latest database migration first." };
    Sentry.captureException(error, { tags: { action: "saveBrandLogo" } });
    return { error: "Couldn't save the logo. Please try again." };
  }

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: profile.id,
    action: "site_brand_logo",
    metadata: { has_logo: logoUrl !== null },
  });
  if (auditError) console.error("saveBrandLogo: audit_log insert failed", auditError);

  revalidatePath("/settings");
  return { error: null };
}

// --- Site Branding: the landing page header cover --------------------------
//
// Same shape as saveBrandLogo -- one shared value on site_settings, SuperAdmin
// only, checked here and in RLS. This is the header background an Agent
// Landing Page uses when neither the page's own settings nor the agent's
// profile has a header image of its own (see the priority order in
// app/p/[slug]/agent-view.tsx). Replacing it re-themes every such page at
// once; the built-in red pattern is what every page already showed before
// this setting existed, so leaving it unset changes nothing.
export async function saveBrandCover(url: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") return { error: "Not allowed." };

  const trimmed = url.trim();
  const ownPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/landing-assets/${profile.id}/`;
  if (trimmed !== "" && !trimmed.startsWith(ownPrefix)) return { error: "Invalid image." };

  const coverUrl = trimmed || null;
  const admin = createAdminClient();
  const { error } = await admin
    .from("site_settings")
    .update({
      brand_cover_url: coverUrl,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("id", true);

  if (error) {
    if (error.code === "42703") return { error: "Run the latest database migration first." };
    Sentry.captureException(error, { tags: { action: "saveBrandCover" } });
    return { error: "Couldn't save the cover image. Please try again." };
  }

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: profile.id,
    action: "site_brand_cover",
    metadata: { has_cover: coverUrl !== null },
  });
  if (auditError) console.error("saveBrandCover: audit_log insert failed", auditError);

  revalidatePath("/settings");
  return { error: null };
}

// --- Site Branding: the system-wide colour ----------------------------------
//
// SuperAdmin only, checked here as well as in RLS, same as the logo and cover.
// The value ends up inside a CSS custom property that app/layout.tsx writes
// into a <style> tag on every page, so it is validated as strictly as
// anything in this file: exactly "#" plus six hex digits (isHexColor), then
// stored lower-cased. Nothing else is accepted, which is what keeps the CSS
// it lands in from ever being anything but a colour. The database has the
// same check as a second wall (site_settings_brand_primary_hex).
//
// A colour too light for the white text that sits on it (the sidebar, the
// dark cards, the primary buttons) is refused too, rather than saved and left
// for every agent to squint at.
export async function saveBrandPrimary(hex: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") return { error: "Not allowed." };

  if (typeof hex !== "string") return { error: "Choose a colour in the form #rrggbb." };
  const value = hex.trim();
  if (!isHexColor(value)) return { error: "Choose a colour in the form #rrggbb." };
  const normalized = normalizeHex(value);
  if (!readableWithWhite(normalized)) {
    return { error: "That colour is too light -- white text on it would be hard to read. Pick a darker one." };
  }

  // Prestige Blue is the built-in default, so choosing it clears the setting
  // rather than storing a value that matches what the stylesheet already says.
  const stored = normalized === DEFAULT_BRAND ? null : normalized;

  const admin = createAdminClient();
  // .select("id") so a missing settings row (zero rows updated, which is not
  // an error to Postgres) is reported instead of showing "Saved".
  const { data: updated, error } = await admin
    .from("site_settings")
    .update({ brand_primary: stored, updated_at: new Date().toISOString(), updated_by: profile.id })
    .eq("id", true)
    .select("id");

  if (error) {
    if (error.code === "42703") return { error: "Run the latest database migration first." };
    Sentry.captureException(error, { tags: { action: "saveBrandPrimary" } });
    return { error: "Couldn't save the colour. Please try again." };
  }
  if (!updated || updated.length === 0) return { error: "Couldn't save the colour -- the site settings row is missing." };

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: profile.id,
    action: "site_brand_primary",
    metadata: { color: stored ?? DEFAULT_BRAND },
  });
  if (auditError) console.error("saveBrandPrimary: audit_log insert failed", auditError);

  // Every page renders the colour from the root layout, so refresh them all.
  revalidatePath("/", "layout");
  return { error: null };
}
