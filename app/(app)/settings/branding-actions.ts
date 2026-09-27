"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";

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
