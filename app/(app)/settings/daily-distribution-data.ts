import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentProfile } from "@/lib/profile-types";
import { getAssignableTeam, type TeamMember } from "@/app/(app)/leads/upload/data";
import type {
  DistributionRun,
  DistributionSchedule,
  RunAgentLine,
  RunStatus,
  RunTrigger,
  SplitMode,
} from "@/lib/daily-distribution-shared";

export type PoolSummary = {
  id: string;
  filename: string | null;
  createdAt: string;
  // Valid rows the list started with.
  total: number;
  // Rows still waiting in the pool.
  remaining: number;
  // Rows already handed out.
  handedOut: number;
};

export type DailyDistributionData = {
  schedule: DistributionSchedule | null;
  team: TeamMember[];
  pools: PoolSummary[];
  poolRemaining: number;
  runs: DistributionRun[];
  migrationReady: boolean;
};

// Postgres / PostgREST codes for "that table or column isn't there yet".
const MISSING_CODES = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);
export function isMissingSchemaError(error: { code?: string } | null | undefined): boolean {
  return Boolean(error?.code && MISSING_CODES.has(error.code));
}

function asNumberArray(v: unknown): number[] {
  return Array.isArray(v) ? v.map(Number).filter((n) => Number.isInteger(n)) : [];
}

function asSplitValues(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === "number" && Number.isFinite(val)) out[k] = val;
    }
  }
  return out;
}

function asAgentLines(v: unknown): RunAgentLine[] {
  if (!Array.isArray(v)) return [];
  const out: RunAgentLine[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    out.push({
      agent_id: String(r.agent_id ?? ""),
      name: String(r.name ?? ""),
      count: Number(r.count ?? 0),
    });
  }
  return out;
}

const EMPTY = (team: TeamMember[], migrationReady: boolean): DailyDistributionData => ({
  schedule: null,
  team,
  pools: [],
  poolRemaining: 0,
  runs: [],
  migrationReady,
});

export async function getDailyDistribution(profile: CurrentProfile): Promise<DailyDistributionData> {
  const admin = createAdminClient();

  const { data: sched, error: schedError } = await admin
    .from("lead_distribution_schedules")
    .select("id, owner_id, is_active, daily_count, run_hour, days_of_week, mode, recipients, split_values, last_run_date")
    .eq("owner_id", profile.id)
    .maybeSingle();
  if (schedError) {
    if (isMissingSchemaError(schedError)) return EMPTY([], false);
    console.error("getDailyDistribution: schedule query failed", schedError);
    return EMPTY([], true);
  }

  const schedule: DistributionSchedule | null = sched
    ? {
        id: sched.id as string,
        ownerId: sched.owner_id as string,
        isActive: Boolean(sched.is_active),
        dailyCount: Number(sched.daily_count),
        runHour: Number(sched.run_hour),
        daysOfWeek: asNumberArray(sched.days_of_week),
        mode: sched.mode as SplitMode,
        recipients: Array.isArray(sched.recipients) ? (sched.recipients as string[]) : [],
        splitValues: asSplitValues(sched.split_values),
        lastRunDate: (sched.last_run_date as string | null) ?? null,
      }
    : null;

  const [team, batchRes, runRes] = await Promise.all([
    getAssignableTeam(profile, { withLoad: true }),
    admin
      .from("lead_import_batches")
      .select("id, filename, created_at, valid_rows, inserted_rows")
      .eq("created_by", profile.id)
      .eq("status", "pooled")
      .order("created_at", { ascending: true }),
    schedule
      ? admin
          .from("lead_distribution_runs")
          .select(
            "id, run_date, trigger, status, requested, distributed, per_agent, pool_remaining, note, started_at, finished_at",
          )
          .eq("schedule_id", schedule.id)
          .order("started_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ]);

  if (isMissingSchemaError(batchRes.error) || isMissingSchemaError(runRes.error)) return EMPTY(team, false);

  const pools: PoolSummary[] = [];
  let poolRemaining = 0;
  const batches = batchRes.data ?? [];
  // One cheap head-count per pooled list: rows with no agent yet are the ones
  // still waiting.
  await Promise.all(
    batches.map(async (b) => {
      const { count } = await admin
        .from("lead_import_rows")
        .select("idx", { count: "exact", head: true })
        .eq("batch_id", b.id as string)
        .is("agent_id", null);
      const remaining = count ?? 0;
      pools.push({
        id: b.id as string,
        filename: (b.filename as string | null) ?? null,
        createdAt: b.created_at as string,
        total: Number(b.valid_rows ?? 0),
        remaining,
        handedOut: Number(b.inserted_rows ?? 0),
      });
      poolRemaining += remaining;
    }),
  );
  pools.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const runs: DistributionRun[] = (runRes.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    runDate: r.run_date as string,
    trigger: r.trigger as RunTrigger,
    status: r.status as RunStatus,
    requested: Number(r.requested ?? 0),
    distributed: Number(r.distributed ?? 0),
    perAgent: asAgentLines(r.per_agent),
    poolRemaining: r.pool_remaining === null || r.pool_remaining === undefined ? null : Number(r.pool_remaining),
    note: (r.note as string | null) ?? null,
    startedAt: r.started_at as string,
    finishedAt: (r.finished_at as string | null) ?? null,
  }));

  return { schedule, team, pools, poolRemaining, runs, migrationReady: true };
}
