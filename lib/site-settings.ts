import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

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
