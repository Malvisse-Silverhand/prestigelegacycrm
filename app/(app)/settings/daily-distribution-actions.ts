"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAssignableTeam } from "@/app/(app)/leads/upload/data";
import { distributeForSchedule } from "@/lib/daily-distribution";
import {
  isDistributorRole,
  validateScheduleInput,
  type DistributionRun,
  type ScheduleInput,
} from "@/lib/daily-distribution-shared";
import { isMissingSchemaError } from "./daily-distribution-data";

export type DistributionActionResult = { error: string | null };
export type RunNowResult = { error: string | null; run?: DistributionRun };

const MIGRATION_MSG = "Run the latest database migration first.";
const GENERIC_ERROR = "Something went wrong. Please try again.";
const NOT_ALLOWED = "You don't have permission to do that.";

async function distributor() {
  const profile = await getCurrentProfile();
  if (!profile || !isDistributorRole(profile.role)) return null;
  return profile;
}

async function logAudit(actorId: string, action: string, metadata: Record<string, unknown>) {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_log").insert({ actor_id: actorId, action, metadata });
  if (error) console.error(`${action}: audit_log insert failed`, error);
}

export async function saveDistributionSchedule(input: ScheduleInput): Promise<DistributionActionResult> {
  const profile = await distributor();
  if (!profile) return { error: NOT_ALLOWED };

  const team = await getAssignableTeam(profile);
  const checked = validateScheduleInput(input, new Set(team.map((m) => m.id)));
  if (!checked.ok) return { error: checked.error };
  const v = checked.value;

  const admin = createAdminClient();
  // last_run_date is deliberately not written, so editing the schedule never
  // lets today's run happen twice (or be skipped).
  const { error } = await admin.from("lead_distribution_schedules").upsert(
    {
      owner_id: profile.id,
      is_active: v.isActive,
      daily_count: v.dailyCount,
      run_hour: v.runHour,
      days_of_week: v.daysOfWeek,
      mode: v.mode,
      recipients: v.recipients,
      split_values: v.mode === "even" ? {} : (v.splitValues ?? {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id" },
  );
  if (error) {
    if (isMissingSchemaError(error)) return { error: MIGRATION_MSG };
    console.error("saveDistributionSchedule failed", error);
    return { error: GENERIC_ERROR };
  }

  await logAudit(profile.id, "daily_distribution_schedule_saved", {
    is_active: v.isActive,
    daily_count: v.dailyCount,
    run_hour: v.runHour,
    days_of_week: v.daysOfWeek,
    mode: v.mode,
    recipient_count: v.recipients.length,
  });
  revalidatePath("/settings");
  return { error: null };
}

export async function setDistributionActive(active: boolean): Promise<DistributionActionResult> {
  const profile = await distributor();
  if (!profile) return { error: NOT_ALLOWED };
  if (typeof active !== "boolean") return { error: "Invalid request." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("lead_distribution_schedules")
    .select("id, recipients")
    .eq("owner_id", profile.id)
    .maybeSingle();
  if (error) {
    if (isMissingSchemaError(error)) return { error: MIGRATION_MSG };
    console.error("setDistributionActive: read failed", error);
    return { error: GENERIC_ERROR };
  }
  if (!data) return { error: "Save your schedule first." };
  const recipients = Array.isArray(data.recipients) ? (data.recipients as string[]) : [];
  if (active && recipients.length === 0) return { error: "Choose at least one agent and save before turning this on." };

  const { error: updateError } = await admin
    .from("lead_distribution_schedules")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", data.id as string)
    .eq("owner_id", profile.id);
  if (updateError) {
    if (isMissingSchemaError(updateError)) return { error: MIGRATION_MSG };
    console.error("setDistributionActive: update failed", updateError);
    return { error: GENERIC_ERROR };
  }

  await logAudit(profile.id, "daily_distribution_schedule_saved", { is_active: active, toggled: true });
  revalidatePath("/settings");
  return { error: null };
}

export async function runDistributionNow(): Promise<RunNowResult> {
  const profile = await distributor();
  if (!profile) return { error: NOT_ALLOWED };

  const admin = createAdminClient();
  const { data: sched, error } = await admin
    .from("lead_distribution_schedules")
    .select("id, recipients")
    .eq("owner_id", profile.id)
    .maybeSingle();
  if (error) {
    if (isMissingSchemaError(error)) return { error: MIGRATION_MSG };
    console.error("runDistributionNow: read failed", error);
    return { error: GENERIC_ERROR };
  }
  if (!sched) return { error: "Save your schedule first." };
  const recipients = Array.isArray(sched.recipients) ? (sched.recipients as string[]) : [];
  if (recipients.length === 0) return { error: "Choose at least one agent and save first." };

  const { data: batches, error: batchError } = await admin
    .from("lead_import_batches")
    .select("id")
    .eq("created_by", profile.id)
    .eq("status", "pooled");
  if (batchError) {
    if (isMissingSchemaError(batchError)) return { error: MIGRATION_MSG };
    return { error: GENERIC_ERROR };
  }
  const ids = (batches ?? []).map((b) => b.id as string);
  let waiting = 0;
  if (ids.length > 0) {
    const { count } = await admin
      .from("lead_import_rows")
      .select("idx", { count: "exact", head: true })
      .in("batch_id", ids)
      .is("agent_id", null);
    waiting = count ?? 0;
  }
  if (waiting === 0) return { error: "The pool is empty. Add leads to the pool first." };

  const allowed = await checkRateLimit("daily-distribution-now", profile.id, 5, 3600);
  if (!allowed) return { error: "You've run this a few times already. Please try again in an hour." };

  const result = await distributeForSchedule(sched.id as string, { trigger: "manual" });
  revalidatePath("/settings");
  if (result.error) return { error: result.error };
  return { error: null, run: result.run };
}

export async function removePool(batchId: string): Promise<DistributionActionResult> {
  const profile = await distributor();
  if (!profile) return { error: NOT_ALLOWED };
  if (typeof batchId !== "string" || batchId.length === 0) return { error: "Invalid request." };

  const admin = createAdminClient();
  const { data: batch, error } = await admin
    .from("lead_import_batches")
    .select("id")
    .eq("id", batchId)
    .eq("created_by", profile.id)
    .eq("status", "pooled")
    .maybeSingle();
  if (error) {
    if (isMissingSchemaError(error)) return { error: MIGRATION_MSG };
    return { error: GENERIC_ERROR };
  }
  if (!batch) return { error: "That list is no longer in your pool." };

  const { error: rowsError } = await admin.from("lead_import_rows").delete().eq("batch_id", batchId);
  if (rowsError) {
    console.error("removePool: delete rows failed", rowsError);
    return { error: GENERIC_ERROR };
  }
  const { error: updateError } = await admin
    .from("lead_import_batches")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("id", batchId)
    .eq("created_by", profile.id);
  if (updateError) {
    if (isMissingSchemaError(updateError)) return { error: MIGRATION_MSG };
    console.error("removePool: update batch failed", updateError);
    return { error: GENERIC_ERROR };
  }

  await logAudit(profile.id, "daily_distribution_pool_removed", { batch_id: batchId });
  revalidatePath("/settings");
  return { error: null };
}
