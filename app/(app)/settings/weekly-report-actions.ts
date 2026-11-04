"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { sendWeeklyReportPreview } from "@/lib/weekly-report";

export type WeeklyReportSettings = {
  masterEnabled: boolean;
  optIn: boolean;
  canReceive: boolean;
  isSuperAdmin: boolean;
};

const MIGRATION_MSG = "Run the latest database migration first.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

function isMissingColumn(code: string | undefined): boolean {
  return code === "42703" || code === "PGRST204";
}

// Missing columns (migration not applied yet) read as "on" everywhere.
export async function getWeeklyReportSettings(): Promise<WeeklyReportSettings> {
  const profile = await getCurrentProfile();
  const off: WeeklyReportSettings = { masterEnabled: true, optIn: true, canReceive: false, isSuperAdmin: false };
  if (!profile) return off;

  const admin = createAdminClient();
  const [settings, own] = await Promise.all([
    admin
      .from("site_settings")
      .select("weekly_report_enabled")
      .eq("id", true)
      .maybeSingle<{ weekly_report_enabled: boolean | null }>(),
    admin
      .from("profiles")
      .select("weekly_report_opt_in")
      .eq("id", profile.id)
      .maybeSingle<{ weekly_report_opt_in: boolean | null }>(),
  ]);
  if (settings.error && !isMissingColumn(settings.error.code)) {
    console.error("getWeeklyReportSettings: site_settings read failed", settings.error);
  }
  if (own.error && !isMissingColumn(own.error.code)) {
    console.error("getWeeklyReportSettings: profile read failed", own.error);
  }

  return {
    masterEnabled: settings.data?.weekly_report_enabled !== false,
    optIn: own.data?.weekly_report_opt_in !== false,
    canReceive: profile.role === "superadmin" || profile.role === "group_manager",
    isSuperAdmin: profile.role === "superadmin",
  };
}

export async function setWeeklyReportEnabled(enabled: boolean): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") return { error: "Not allowed." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_settings")
    .update({
      weekly_report_enabled: Boolean(enabled),
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("id", true)
    .select("id");

  if (error) {
    if (isMissingColumn(error.code)) return { error: MIGRATION_MSG };
    Sentry.captureException(error, { tags: { action: "setWeeklyReportEnabled" } });
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) return { error: GENERIC_ERROR };

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: profile.id,
    action: "weekly_report_enabled",
    metadata: { enabled: Boolean(enabled) },
  });
  if (auditError) console.error("setWeeklyReportEnabled: audit_log insert failed", auditError);

  revalidatePath("/settings");
  return { error: null };
}

// The caller's own row only: the id comes from the session, never an argument.
export async function setWeeklyReportOptIn(optIn: boolean): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ weekly_report_opt_in: Boolean(optIn) })
    .eq("id", profile.id)
    .select("id");

  if (error) {
    if (isMissingColumn(error.code)) return { error: MIGRATION_MSG };
    Sentry.captureException(error, { tags: { action: "setWeeklyReportOptIn" } });
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) return { error: GENERIC_ERROR };

  revalidatePath("/settings");
  return { error: null };
}

export async function sendMyWeeklyReportPreview(): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  return sendWeeklyReportPreview({
    id: profile.id,
    role: profile.role,
    email: profile.email,
    full_name: profile.full_name,
  });
}
