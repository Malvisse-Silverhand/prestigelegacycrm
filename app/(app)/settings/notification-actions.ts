"use server";

import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { isMissingSchema } from "@/lib/schema-missing";

export type NotificationPrefs = {
  /** Email me when a lead submits a form link. */
  leadFormEmail: boolean;
  /** False until the notify_lead_form_email migration has run. */
  available: boolean;
};

// Read and written with the service role, like updateMyProfile: profiles'
// column grants don't cover own-profile settings. Both only ever touch the
// signed-in user's own row.
export async function getMyNotificationPrefs(): Promise<NotificationPrefs> {
  const profile = await getCurrentProfile();
  if (!profile) return { leadFormEmail: true, available: false };

  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("notify_lead_form_email")
    .eq("id", profile.id)
    .maybeSingle();
  if (error) {
    if (!isMissingSchema(error)) Sentry.captureException(error, { tags: { action: "getMyNotificationPrefs" } });
    return { leadFormEmail: true, available: false };
  }
  return { leadFormEmail: data?.notify_lead_form_email !== false, available: true };
}

export async function setLeadFormEmail(on: boolean): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ notify_lead_form_email: on === true })
    .eq("id", profile.id);
  if (error) {
    if (isMissingSchema(error)) return { error: "This setting needs the latest database update first." };
    Sentry.captureException(error, { tags: { action: "setLeadFormEmail" } });
    return { error: "Couldn't save. Please try again." };
  }
  return { error: null };
}
