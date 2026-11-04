// Shared, side-effect-free pieces of the daily lead distribution: the shapes the
// settings screen, the server actions and the hourly job all agree on, the
// Malaysia-time clock, and validation of a schedule a manager submits. No
// server imports, so the settings screen can show "next run" and validate as
// the manager types, with exactly the rules the server enforces.

import { computeTargets, type RebalanceMode } from "@/lib/rebalance-targets";

export const DEFAULT_RUN_HOUR = 9;
export const MAX_DAILY_COUNT = 500;
export const MIN_DAILY_COUNT = 1;
// ISO weekday numbers, Monday first.
export const WEEKDAYS: { iso: number; short: string; long: string }[] = [
  { iso: 1, short: "Mon", long: "Monday" },
  { iso: 2, short: "Tue", long: "Tuesday" },
  { iso: 3, short: "Wed", long: "Wednesday" },
  { iso: 4, short: "Thu", long: "Thursday" },
  { iso: 5, short: "Fri", long: "Friday" },
  { iso: 6, short: "Sat", long: "Saturday" },
  { iso: 7, short: "Sun", long: "Sunday" },
];

// Roles that may run a daily distribution. Aspirant UMs are deliberately not
// included (they can still upload and assign by hand).
export const DISTRIBUTOR_ROLES = ["superadmin", "group_manager", "unit_manager"] as const;
export type DistributorRole = (typeof DISTRIBUTOR_ROLES)[number];
export function isDistributorRole(role: string): role is DistributorRole {
  return (DISTRIBUTOR_ROLES as readonly string[]).includes(role);
}

export type SplitMode = RebalanceMode; // "even" | "percent" | "count"

export type DistributionSchedule = {
  id: string;
  ownerId: string;
  isActive: boolean;
  dailyCount: number;
  runHour: number;
  daysOfWeek: number[];
  mode: SplitMode;
  recipients: string[];
  // agent id -> percent (mode "percent") or daily number (mode "count").
  splitValues: Record<string, number>;
  lastRunDate: string | null;
};

// What the settings screen submits. The server re-validates all of it.
export type ScheduleInput = {
  isActive: boolean;
  dailyCount: number;
  runHour: number;
  daysOfWeek: number[];
  mode: SplitMode;
  recipients: string[];
  splitValues?: Record<string, number>;
};

export type RunTrigger = "cron" | "manual";
export type RunStatus = "running" | "done" | "skipped" | "failed";

export type RunAgentLine = { agent_id: string; name: string; count: number };

export type DistributionRun = {
  id: string;
  runDate: string;
  trigger: RunTrigger;
  status: RunStatus;
  requested: number;
  distributed: number;
  perAgent: RunAgentLine[];
  poolRemaining: number | null;
  note: string | null;
  startedAt: string;
  finishedAt: string | null;
};

// -- Malaysia time ------------------------------------------------------------
// Malaysia has no daylight saving: always UTC+8.
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

export type MytClock = {
  // Calendar date in Malaysia, YYYY-MM-DD.
  date: string;
  // Hour of day in Malaysia, 0-23.
  hour: number;
  // ISO weekday in Malaysia, 1 = Monday ... 7 = Sunday.
  isoWeekday: number;
};

export function mytClock(now: Date = new Date()): MytClock {
  const local = new Date(now.getTime() + MYT_OFFSET_MS);
  const day = local.getUTCDay(); // 0 = Sunday
  return {
    date: local.toISOString().slice(0, 10),
    hour: local.getUTCHours(),
    isoWeekday: day === 0 ? 7 : day,
  };
}

// Adds whole days to a YYYY-MM-DD date.
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ISO weekday (1-7) of a YYYY-MM-DD date.
export function isoWeekdayOf(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

// "9:00 AM" style label for an hour (0-23).
export function hourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h < 12 ? "AM" : "PM";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix}`;
}

// Is this schedule due right now? The hourly job runs anything whose hour has
// arrived today and hasn't run today -- so a missed hour (job briefly down) is
// caught up later the same day, never skipped and never run twice.
export function isDue(
  s: Pick<DistributionSchedule, "isActive" | "runHour" | "daysOfWeek" | "lastRunDate">,
  clock: MytClock,
): boolean {
  if (!s.isActive) return false;
  if (!s.daysOfWeek.includes(clock.isoWeekday)) return false;
  if (clock.hour < s.runHour) return false;
  return s.lastRunDate === null || s.lastRunDate < clock.date;
}

// The next date + hour (Malaysia time) this schedule will run, or null when it
// is switched off / has no days. Looks up to 8 days ahead.
export function nextRun(
  s: Pick<DistributionSchedule, "isActive" | "runHour" | "daysOfWeek" | "lastRunDate">,
  clock: MytClock,
): { date: string; hour: number } | null {
  if (!s.isActive || s.daysOfWeek.length === 0) return null;
  for (let i = 0; i <= 8; i++) {
    const date = addDays(clock.date, i);
    if (!s.daysOfWeek.includes(isoWeekdayOf(date))) continue;
    if (s.lastRunDate !== null && s.lastRunDate >= date) continue;
    // Today but the hour has passed (and it hasn't run): the next hourly tick.
    if (i === 0 && clock.hour >= s.runHour) return { date, hour: Math.min(23, clock.hour + 1) };
    return { date, hour: s.runHour };
  }
  return null;
}

// -- Validation ---------------------------------------------------------------

export type ScheduleValidation =
  | { ok: true; value: ScheduleInput }
  | { ok: false; error: string };

// Checks a submitted schedule against the caller's real team (`teamIds`). Used
// by the settings screen as the manager types and by the server on save.
export function validateScheduleInput(input: unknown, teamIds: ReadonlySet<string>): ScheduleValidation {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid request." };
  const i = input as Partial<ScheduleInput>;

  if (typeof i.isActive !== "boolean") return { ok: false, error: "Invalid request." };
  const dailyCount = Number(i.dailyCount);
  if (!Number.isInteger(dailyCount) || dailyCount < MIN_DAILY_COUNT || dailyCount > MAX_DAILY_COUNT) {
    return { ok: false, error: `Leads per day must be a whole number from ${MIN_DAILY_COUNT} to ${MAX_DAILY_COUNT}.` };
  }
  const runHour = Number(i.runHour);
  if (!Number.isInteger(runHour) || runHour < 0 || runHour > 23) return { ok: false, error: "Choose a time of day." };

  if (!Array.isArray(i.daysOfWeek)) return { ok: false, error: "Choose at least one day." };
  const days = [...new Set(i.daysOfWeek.map(Number))].filter((d) => Number.isInteger(d) && d >= 1 && d <= 7).sort();
  if (days.length === 0 || days.length !== i.daysOfWeek.length) return { ok: false, error: "Choose at least one day." };

  if (i.mode !== "even" && i.mode !== "percent" && i.mode !== "count") return { ok: false, error: "Invalid split." };

  if (!Array.isArray(i.recipients)) return { ok: false, error: "Choose at least one agent." };
  const recipients = [...new Set(i.recipients)];
  if (recipients.length === 0) return { ok: false, error: "Choose at least one agent to receive leads." };
  if (recipients.length > 200) return { ok: false, error: "That is too many agents for one schedule." };
  if (recipients.some((id) => typeof id !== "string" || !teamIds.has(id))) {
    return { ok: false, error: "One of the agents you chose isn't on your team." };
  }

  let splitValues: Record<string, number> | undefined;
  if (i.mode !== "even") {
    if (!i.splitValues || typeof i.splitValues !== "object" || Array.isArray(i.splitValues)) {
      return { ok: false, error: "Enter a share for each agent." };
    }
    splitValues = {};
    for (const id of recipients) {
      const v = (i.splitValues as Record<string, unknown>)[id];
      if (v === undefined) continue; // blank counts as 0
      if (typeof v !== "number" || !Number.isFinite(v)) return { ok: false, error: "Enter a number for each agent." };
      splitValues[id] = v;
    }
  }

  // Same maths the daily job uses: proves the split adds up for a full day.
  const check = computeTargets(
    i.mode,
    recipients.map((id) => ({ id, name: "this agent", current: 0 })),
    splitValues,
    dailyCount,
  );
  if (check.error !== undefined) return { ok: false, error: check.error };

  return {
    ok: true,
    value: { isActive: i.isActive, dailyCount, runHour, daysOfWeek: days, mode: i.mode, recipients, splitValues },
  };
}

// For a day when the pool holds fewer leads than the daily count: a "count"
// split (exact numbers summing to the daily count) can't be met, so it becomes
// the same proportions as a percentage. Even/percent splits apply unchanged.
export function effectiveSplit(
  mode: SplitMode,
  splitValues: Record<string, number>,
  recipients: string[],
  available: number,
  dailyCount: number,
): { mode: SplitMode; values?: Record<string, number> } {
  if (mode === "even") return { mode };
  if (mode === "percent") return { mode, values: splitValues };
  if (available >= dailyCount) return { mode, values: splitValues };
  const total = recipients.reduce((s, id) => s + (splitValues[id] ?? 0), 0);
  if (total <= 0) return { mode: "even" };
  const values: Record<string, number> = {};
  let used = 0;
  recipients.forEach((id, idx) => {
    if (idx === recipients.length - 1) values[id] = Math.round((100 - used) * 100) / 100;
    else {
      const pct = Math.round((((splitValues[id] ?? 0) / total) * 100) * 100) / 100;
      values[id] = pct;
      used += pct;
    }
  });
  return { mode: "percent", values };
}
