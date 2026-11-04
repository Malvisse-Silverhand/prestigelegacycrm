import "server-only";
import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { appOrigin } from "@/lib/app-url";
import { sendEmail } from "@/lib/email";
import { dailyDistributionReportEmail } from "@/lib/email-templates/daily-distribution-report";
import { insertStagedRows, type InsertedLead } from "@/lib/lead-batch-insert";
import { planAssignments, type PlanMember } from "@/lib/lead-assignment-plan";
import { queueBulkAssignmentEmails, type BulkRecipient } from "@/lib/bulk-assignment-email";
import type { StagedRow } from "@/lib/lead-import";
import { getAssignableTeamForOwner } from "@/app/(app)/leads/upload/data";
import {
  effectiveSplit,
  isDistributorRole,
  isDue,
  mytClock,
  type DistributionRun,
  type DistributionSchedule,
  type RunAgentLine,
  type RunStatus,
  type RunTrigger,
  type SplitMode,
} from "@/lib/daily-distribution-shared";

// The daily lead distribution: once a day, per schedule, take the next N leads
// from the owner's pool (upload batches parked as "pooled"), split them between
// the chosen agents, create the leads, tell the agents, and email the upline.
//
// Runs with the service role and no user session (the hourly cron calls it), so
// every check a signed-in action would get from RLS is repeated here: the owner
// must be an active distributor, and recipients are re-checked against the
// owner's team at the moment of the run.
//
// "One run a day" is enforced by an atomic claim on the schedule row
// (last_run_date), so the hourly tick, the Vercel fallback and a manual
// "Run now" can never double-distribute.

const TIME_BUDGET_MS = 45_000;
const REPORT_SPACING_MS = 600;
const ALREADY_RAN = "Today's distribution has already run.";

type Admin = ReturnType<typeof createAdminClient>;

type ScheduleRow = {
  id: string;
  owner_id: string;
  is_active: boolean;
  daily_count: number;
  run_hour: number;
  days_of_week: number[];
  mode: SplitMode;
  recipients: string[];
  split_values: Record<string, number> | null;
  last_run_date: string | null;
};

type OwnerRow = {
  id: string;
  full_name: string;
  role: string;
  unit_id: string | null;
  is_active: boolean;
  email: string | null;
};

type RunRow = {
  id: string;
  run_date: string;
  trigger: RunTrigger;
  status: RunStatus;
  requested: number;
  distributed: number;
  per_agent: RunAgentLine[] | null;
  pool_remaining: number | null;
  note: string | null;
  started_at: string;
  finished_at: string | null;
};

const SCHEDULE_COLUMNS =
  "id, owner_id, is_active, daily_count, run_hour, days_of_week, mode, recipients, split_values, last_run_date";
const RUN_COLUMNS =
  "id, run_date, trigger, status, requested, distributed, per_agent, pool_remaining, note, started_at, finished_at";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toSchedule(r: ScheduleRow): DistributionSchedule {
  return {
    id: r.id,
    ownerId: r.owner_id,
    isActive: r.is_active,
    dailyCount: r.daily_count,
    runHour: r.run_hour,
    daysOfWeek: (r.days_of_week ?? []).map(Number),
    mode: r.mode,
    recipients: r.recipients ?? [],
    splitValues: r.split_values ?? {},
    lastRunDate: r.last_run_date,
  };
}

function toRun(r: RunRow): DistributionRun {
  return {
    id: r.id,
    runDate: r.run_date,
    trigger: r.trigger,
    status: r.status,
    requested: r.requested,
    distributed: r.distributed,
    perAgent: r.per_agent ?? [],
    poolRemaining: r.pool_remaining,
    note: r.note,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
  };
}

type PoolBatch = { id: string; filename: string | null; inserted_rows: number };
type PoolSlice = { batch: PoolBatch; rows: { idx: number; data: StagedRow }[] };

// The owner's pooled batches, oldest first, up to `limit` staged rows in total.
async function takeFromPool(admin: Admin, ownerId: string, limit: number): Promise<PoolSlice[]> {
  const { data: batches, error } = await admin
    .from("lead_import_batches")
    .select("id, filename, inserted_rows")
    .eq("created_by", ownerId)
    .eq("status", "pooled")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const slices: PoolSlice[] = [];
  let left = limit;
  for (const b of (batches ?? []) as PoolBatch[]) {
    if (left <= 0) break;
    const { data: rows, error: rowError } = await admin
      .from("lead_import_rows")
      .select("idx, data")
      .eq("batch_id", b.id)
      .order("idx")
      .limit(left);
    if (rowError) throw rowError;
    const list = (rows ?? []) as { idx: number; data: StagedRow }[];
    if (list.length === 0) {
      // Emptied by hand (or an earlier run): nothing left to wait for.
      await admin.from("lead_import_batches").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", b.id);
      continue;
    }
    slices.push({ batch: b, rows: list });
    left -= list.length;
  }
  return slices;
}

async function poolRemaining(admin: Admin, ownerId: string): Promise<number> {
  const { data, error } = await admin
    .from("lead_import_batches")
    .select("id")
    .eq("created_by", ownerId)
    .eq("status", "pooled");
  if (error) throw error;
  const ids = (data ?? []).map((b) => b.id as string);
  if (ids.length === 0) return 0;
  const { count, error: countError } = await admin
    .from("lead_import_rows")
    .select("idx", { count: "exact", head: true })
    .in("batch_id", ids);
  if (countError) throw countError;
  return count ?? 0;
}

async function deleteStagedRows(admin: Admin, batchId: string, idxs: number[]) {
  for (let i = 0; i < idxs.length; i += 500) {
    const { error } = await admin.from("lead_import_rows").delete().eq("batch_id", batchId).in("idx", idxs.slice(i, i + 500));
    if (error) throw error;
  }
}

type Outcome = {
  status: Exclude<RunStatus, "running">;
  requested: number;
  distributed: number;
  perAgent: RunAgentLine[];
  note: string | null;
  inserted: InsertedLead[];
};

export async function distributeForSchedule(
  scheduleId: string,
  opts: { trigger: RunTrigger; now?: Date },
): Promise<{ error: string | null; run?: DistributionRun }> {
  try {
    return await distribute(scheduleId, opts.trigger, opts.now ?? new Date());
  } catch (e) {
    Sentry.captureException(e, { tags: { area: "daily-distribution", step: "outer" } });
    return { error: "Couldn't run the distribution. Please try again." };
  }
}

async function distribute(
  scheduleId: string,
  trigger: RunTrigger,
  now: Date,
): Promise<{ error: string | null; run?: DistributionRun }> {
  const admin = createAdminClient();

  const { data: schedRow, error: schedError } = await admin
    .from("lead_distribution_schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("id", scheduleId)
    .maybeSingle();
  if (schedError) {
    Sentry.captureException(schedError, { tags: { area: "daily-distribution", step: "load-schedule" } });
    return { error: "Couldn't load the schedule." };
  }
  if (!schedRow) return { error: "Schedule not found." };
  const schedule = schedRow as ScheduleRow;
  const today = mytClock(now).date;

  // Atomic claim: only the caller that moves last_run_date up to today proceeds.
  const { data: claimed, error: claimError } = await admin
    .from("lead_distribution_schedules")
    .update({ last_run_date: today, updated_at: new Date().toISOString() })
    .eq("id", schedule.id)
    .or(`last_run_date.is.null,last_run_date.lt.${today}`)
    .select("id");
  if (claimError) {
    Sentry.captureException(claimError, { tags: { area: "daily-distribution", step: "claim" } });
    return { error: "Couldn't start the distribution." };
  }
  if (!claimed || claimed.length === 0) return { error: ALREADY_RAN };

  const { data: runRow, error: runError } = await admin
    .from("lead_distribution_runs")
    .insert({
      schedule_id: schedule.id,
      owner_id: schedule.owner_id,
      run_date: today,
      trigger,
      status: "running",
      requested: schedule.daily_count,
    })
    .select(RUN_COLUMNS)
    .maybeSingle();
  if (runError || !runRow) {
    // Another scheduled run already holds today's slot: leave the claim as is.
    if (runError?.code === "23505") return { error: ALREADY_RAN };
    // Give the day back so the next tick can try again.
    await admin
      .from("lead_distribution_schedules")
      .update({ last_run_date: schedule.last_run_date })
      .eq("id", schedule.id)
      .eq("last_run_date", today);
    Sentry.captureException(runError ?? new Error("daily distribution: run insert returned nothing"), {
      tags: { area: "daily-distribution", step: "run-insert" },
    });
    return { error: "Couldn't start the distribution." };
  }
  const run = runRow as RunRow;

  let owner: OwnerRow | null = null;
  let outcome: Outcome;
  try {
    const { data: ownerRow, error: ownerError } = await admin
      .from("profiles")
      .select("id, full_name, role, unit_id, is_active, email")
      .eq("id", schedule.owner_id)
      .maybeSingle();
    if (ownerError) throw ownerError;
    owner = (ownerRow as OwnerRow | null) ?? null;
    outcome = await execute(admin, schedule, owner);
  } catch (e) {
    Sentry.captureException(e, { tags: { area: "daily-distribution", step: "execute" } });
    outcome = {
      status: "failed",
      requested: schedule.daily_count,
      distributed: 0,
      perAgent: [],
      note: "Something went wrong while handing out leads. The error has been logged.",
      inserted: [],
    };
  }

  // Bell notification for every receiving agent other than the owner.
  const byAgent = new Map<string, InsertedLead[]>();
  for (const l of outcome.inserted) {
    const list = byAgent.get(l.agent_id);
    if (list) list.push(l);
    else byAgent.set(l.agent_id, [l]);
  }
  const receivers = [...byAgent.entries()].filter(([id]) => id !== schedule.owner_id);
  if (owner && receivers.length > 0) {
    const { error: bellError } = await admin.from("notifications").insert(
      receivers.map(([agentId, leads]) => ({
        profile_id: agentId,
        kind: "leads_assigned",
        title: `${leads.length} new lead${leads.length === 1 ? "" : "s"} assigned to you`,
        body: `Daily distribution by ${owner.full_name}`,
        href: "/leads?origin=leader",
      })),
    );
    if (bellError) Sentry.captureException(bellError, { tags: { area: "daily-distribution", step: "notify" } });
  }

  let remaining = 0;
  try {
    remaining = await poolRemaining(admin, schedule.owner_id);
  } catch (e) {
    Sentry.captureException(e, { tags: { area: "daily-distribution", step: "pool-remaining" } });
  }

  const finishedAt = new Date().toISOString();
  const { data: finished, error: finishError } = await admin
    .from("lead_distribution_runs")
    .update({
      status: outcome.status,
      requested: outcome.requested,
      distributed: outcome.distributed,
      per_agent: outcome.perAgent,
      pool_remaining: remaining,
      note: outcome.note,
      finished_at: finishedAt,
    })
    .eq("id", run.id)
    .select(RUN_COLUMNS)
    .maybeSingle();
  if (finishError) Sentry.captureException(finishError, { tags: { area: "daily-distribution", step: "finish" } });

  // Per-agent emails (paced, capped); the tally is appended to the run's note.
  if (owner && receivers.length > 0) {
    const recipients: BulkRecipient[] = receivers.map(([agentId, leads]) => ({
      agentId,
      total: leads.length,
      sample: leads.slice(0, 5).map((l) => ({ id: l.id, name: l.full_name, interest: l.interest, source: l.lead_source })),
    }));
    try {
      await queueBulkAssignmentEmails({
        byName: owner.full_name,
        recipients,
        allowed: true,
        listHref: "/leads?origin=leader",
        onDone: async (sent, skipped) => {
          const tally = `Agent emails: sent ${sent}, skipped ${skipped}`;
          const { error } = await createAdminClient()
            .from("lead_distribution_runs")
            .update({ note: outcome.note ? `${outcome.note} · ${tally}` : tally })
            .eq("id", run.id);
          if (error) Sentry.captureException(error, { tags: { area: "daily-distribution", step: "email-tally" } });
        },
      });
    } catch (e) {
      Sentry.captureException(e, { tags: { area: "daily-distribution", step: "agent-emails" } });
    }
  }

  if (owner) {
    try {
      await queueUplineReport(admin, owner, {
        date: today,
        trigger,
        status: outcome.status,
        requested: outcome.requested,
        distributed: outcome.distributed,
        perAgent: outcome.perAgent,
        poolRemaining: remaining,
        dailyCount: schedule.daily_count,
        note: outcome.note,
      });
    } catch (e) {
      Sentry.captureException(e, { tags: { area: "daily-distribution", step: "report" } });
    }

    // target_id must stay null: it is a foreign key to profiles.
    const { error: auditError } = await admin.from("audit_log").insert({
      actor_id: owner.id,
      action: "lead_daily_distribution",
      metadata: { schedule_id: schedule.id, run_id: run.id, distributed: outcome.distributed, trigger },
    });
    if (auditError) console.error("daily distribution: audit_log insert failed", auditError);
  }

  return { error: null, run: toRun((finished as RunRow | null) ?? { ...run, status: outcome.status }) };
}

// Does the actual work for one claimed run. Throws on unexpected errors; a
// failure part-way through is returned as a "failed" outcome carrying what was
// already handed out.
async function execute(admin: Admin, schedule: ScheduleRow, owner: OwnerRow | null): Promise<Outcome> {
  const empty = (status: "skipped" | "failed", note: string): Outcome => ({
    status,
    requested: schedule.daily_count,
    distributed: 0,
    perAgent: [],
    note,
    inserted: [],
  });

  if (!owner || !owner.is_active || !isDistributorRole(owner.role)) {
    return empty("skipped", "The schedule owner is inactive or can no longer run distributions");
  }

  const team = await getAssignableTeamForOwner(owner);
  const teamById = new Map(team.map((m) => [m.id, m]));
  const recipients = [...new Set(schedule.recipients)].filter((id) => teamById.has(id));
  if (recipients.length === 0) return empty("skipped", "No active agents left in this schedule");

  const slices = await takeFromPool(admin, owner.id, schedule.daily_count);
  const flat = slices.flatMap((s) => s.rows.map((r) => ({ batch: s.batch, row: r })));
  if (flat.length === 0) return empty("skipped", "Pool is empty — upload more leads");

  const splitValues = schedule.split_values ?? {};
  const eff = effectiveSplit(schedule.mode, splitValues, recipients, flat.length, schedule.daily_count);
  const members: PlanMember[] = recipients.map((id) => ({ id, name: teamById.get(id)?.name ?? "Agent", load: 0 }));
  let plan = planAssignments(flat.length, members, { mode: eff.mode, values: eff.values });
  if (plan.error !== undefined) plan = planAssignments(flat.length, members, { mode: "even" });
  if (plan.error !== undefined) throw new Error(plan.error);
  const agentByRow = plan.agentByRow;

  const allowed = new Set<string>([...recipients, owner.id]);
  const inserted: InsertedLead[] = [];
  let fallbacks = 0;
  let skippedDuplicates = 0;
  let failure: string | null = null;

  let pos = 0;
  for (const slice of slices) {
    const rows = slice.rows.map((r) => ({ idx: r.idx, data: r.data, agentId: agentByRow[pos++] }));
    const result = await insertStagedRows(admin, {
      batch: { id: slice.batch.id, filename: slice.batch.filename },
      rows,
      assigner: { id: owner.id, full_name: owner.full_name, unit_id: owner.unit_id },
      allowedAgentIds: allowed,
    });
    if (result.error) {
      failure = result.error;
      break;
    }
    inserted.push(...result.inserted);
    fallbacks += result.fallbacks;
    skippedDuplicates += result.skippedDuplicates;

    // Leads exist now: take the rows (duplicates included) out of the pool.
    await deleteStagedRows(admin, slice.batch.id, slice.rows.map((r) => r.idx));
    const { error: bumpError } = await admin
      .from("lead_import_batches")
      .update({ inserted_rows: slice.batch.inserted_rows + result.inserted.length })
      .eq("id", slice.batch.id);
    if (bumpError) Sentry.captureException(bumpError, { tags: { area: "daily-distribution", step: "bump-batch" } });
    const { count: left, error: leftError } = await admin
      .from("lead_import_rows")
      .select("idx", { count: "exact", head: true })
      .eq("batch_id", slice.batch.id);
    if (!leftError && (left ?? 0) === 0) {
      await admin
        .from("lead_import_batches")
        .update({ status: "done", finished_at: new Date().toISOString() })
        .eq("id", slice.batch.id)
        .eq("status", "pooled");
    }
  }

  const counts = new Map<string, number>();
  for (const l of inserted) counts.set(l.agent_id, (counts.get(l.agent_id) ?? 0) + 1);
  const perAgent: RunAgentLine[] = [...counts.entries()]
    .map(([agent_id, count]) => ({ agent_id, name: teamById.get(agent_id)?.name ?? owner.full_name, count }))
    .sort((a, b) => b.count - a.count);

  const notes: string[] = [];
  if (failure) notes.push(`Stopped early: ${failure}`);
  if (skippedDuplicates > 0) notes.push(`${skippedDuplicates} already in the CRM, skipped`);
  if (fallbacks > 0) notes.push(`${fallbacks} kept by ${owner.full_name} because an agent was unavailable`);

  return {
    status: failure ? "failed" : inserted.length > 0 ? "done" : "skipped",
    requested: schedule.daily_count,
    distributed: inserted.length,
    perAgent,
    note: notes.length > 0 ? notes.join(" · ") : inserted.length === 0 ? "Every lead in this batch was already in the CRM" : null,
    inserted,
  };
}

// -- Upline report --------------------------------------------------------------

async function queueUplineReport(
  admin: Admin,
  owner: OwnerRow,
  report: {
    date: string;
    trigger: RunTrigger;
    status: "done" | "skipped" | "failed";
    requested: number;
    distributed: number;
    perAgent: RunAgentLine[];
    poolRemaining: number;
    dailyCount: number;
    note: string | null;
  },
) {
  const ids = new Set<string>([owner.id]);
  if (owner.role === "unit_manager" && owner.unit_id) {
    const { data: unit } = await admin.from("units").select("group_manager_id").eq("id", owner.unit_id).maybeSingle();
    if (unit?.group_manager_id) ids.add(unit.group_manager_id as string);
  }
  const { data: admins, error: adminError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "superadmin")
    .eq("is_active", true);
  if (adminError) throw adminError;
  for (const a of admins ?? []) ids.add(a.id as string);

  const { data: people, error } = await admin
    .from("profiles")
    .select("id, email, is_active")
    .in("id", [...ids]);
  if (error) throw error;
  const emails = [
    ...new Set(
      (people ?? [])
        .filter((p) => p.is_active !== false && typeof p.email === "string" && p.email.length > 0)
        .map((p) => p.email as string),
    ),
  ];
  if (emails.length === 0) return;

  const origin = await appOrigin();
  const { subject, html } = dailyDistributionReportEmail({
    distributorName: owner.full_name,
    distributorRole: owner.role,
    date: report.date,
    trigger: report.trigger,
    status: report.status,
    requested: report.requested,
    distributed: report.distributed,
    perAgent: report.perAgent,
    poolRemaining: report.poolRemaining,
    daysLeft: report.dailyCount > 0 ? Math.floor(report.poolRemaining / report.dailyCount) : null,
    note: report.note,
    origin,
  });

  after(async () => {
    try {
      let first = true;
      for (const to of emails) {
        if (!first) await sleep(REPORT_SPACING_MS);
        first = false;
        const result = await sendEmail({ to, subject, html });
        if (!result.sent && result.error) {
          Sentry.captureMessage(`Daily distribution report not sent: ${result.error}`, {
            level: "warning",
            tags: { area: "daily-distribution" },
          });
        }
      }
    } catch (e) {
      Sentry.captureException(e, { tags: { area: "daily-distribution", step: "report-send" } });
    }
  });
}

// -- The hourly sweep -----------------------------------------------------------

export async function runDueDistributions(
  now: Date = new Date(),
): Promise<{ checked: number; ran: number; skipped: number; failed: number; deferred: number }> {
  const started = Date.now();
  const tally = { checked: 0, ran: 0, skipped: 0, failed: 0, deferred: 0 };
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("lead_distribution_schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("is_active", true);
  if (error) {
    Sentry.captureException(error, { tags: { area: "daily-distribution", step: "list-due" } });
    throw error;
  }
  const clock = mytClock(now);
  const due = ((data ?? []) as ScheduleRow[]).map(toSchedule).filter((s) => isDue(s, clock));
  tally.checked = due.length;

  for (const s of due) {
    // Not claimed, so the next hourly tick picks the rest up.
    if (Date.now() - started > TIME_BUDGET_MS) {
      tally.deferred++;
      continue;
    }
    const res = await distributeForSchedule(s.id, { trigger: "cron", now });
    if (res.error !== null) {
      if (res.error === ALREADY_RAN) tally.skipped++;
      else tally.failed++;
    } else if (res.run?.status === "done") tally.ran++;
    else if (res.run?.status === "failed") tally.failed++;
    else tally.skipped++;
  }
  return tally;
}
