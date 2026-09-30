import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isHexColor } from "@/lib/brand-theme";

export type TrackingSettings = {
  head: string;
  body: string;
  footer: string;
  enabled: boolean;
};

export const EMPTY_TRACKING: TrackingSettings = { head: "", body: "", footer: "", enabled: true };

// Read through the service role, like getPublicLandingPage: the visitor on a
// landing page has no session at all, and the RLS on site_settings is
// deliberately SuperAdmin-only. cache() keeps it to one query per request.
export const getTrackingSettings = cache(async (): Promise<TrackingSettings> => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("tracking_head, tracking_body, tracking_footer, tracking_enabled")
    .eq("id", true)
    .maybeSingle();

  if (!data) return EMPTY_TRACKING;
  return {
    head: data.tracking_head ?? "",
    body: data.tracking_body ?? "",
    footer: data.tracking_footer ?? "",
    enabled: data.tracking_enabled ?? true,
  };
});

// The insurer logo shown on every Agent Landing Page, set once by a
// SuperAdmin in Settings > Branding rather than per agent. Tolerant of the
// column not existing yet (pre-migration) and of there being no logo set at
// all -- both simply mean "show the text placeholder" to the caller.
export const getBrandLogoUrl = cache(async (): Promise<string | null> => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("site_settings").select("brand_logo_url").eq("id", true).maybeSingle();

  if (error || !data) return null;
  return (data.brand_logo_url as string | null) ?? null;
});

// The header background every Agent Landing Page falls back to when neither
// the page nor the agent's profile has its own header image. Same tolerance
// rules as getBrandLogoUrl: no column yet, or nothing uploaded, both mean
// "let the caller use its own built-in default" (the red pattern image).
export const getBrandCoverUrl = cache(async (): Promise<string | null> => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("site_settings").select("brand_cover_url").eq("id", true).maybeSingle();

  if (error || !data) return null;
  return (data.brand_cover_url as string | null) ?? null;
});

// The system-wide brand colour, or null for the default Prestige Blue. Read on
// every render by app/layout.tsx, so it is tolerant in the same way as the
// logo/cover getters (no column yet, no row, a bad value -> the default) and it
// re-validates whatever it reads: the value is written into a <style> tag, so
// nothing but a plain #rrggbb is ever allowed through.
export const getBrandPrimary = cache(async (): Promise<string | null> => {
  // This runs in the root layout, so it sits in front of EVERY page -- login
  // included. It must therefore never be able to break or stall one: any
  // failure (missing service key in a preview environment, network error,
  // Supabase slow to answer) quietly falls back to the default colour, and a
  // short timeout keeps a slow answer from holding back the first byte.
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("site_settings")
      .select("brand_primary")
      .eq("id", true)
      .abortSignal(AbortSignal.timeout(1500))
      .maybeSingle();

    if (error || !data) return null;
    const value = data.brand_primary as string | null;
    return isHexColor(value) ? value.toLowerCase() : null;
  } catch {
    return null;
  }
});
