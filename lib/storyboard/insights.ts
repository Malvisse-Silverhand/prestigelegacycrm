// Storyboard "My Insights": pure aggregation over rows the database already
// scoped with RLS. No database or React here, so it is unit-tested.

import { BUILT_MODULES, type BuiltModule } from "./modules";
import { readStepStatus } from "./progress";
import {
  STORYBOARD_OUTCOMES,
  STORYBOARD_STEPS,
  type StepStatus,
  type StoryboardModule,
  type StoryboardOutcome,
  type StoryboardStep,
} from "./types";

export const INSIGHT_RANGES = [30, 90, 365] as const;
export type InsightRange = (typeof INSIGHT_RANGES)[number];
export const DEFAULT_RANGE: InsightRange = 30;

/** `?range=` value to a supported range; anything else is the default. */
export function parseRange(v: unknown): InsightRange {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return (INSIGHT_RANGES as readonly number[]).includes(n) ? (n as InsightRange) : DEFAULT_RANGE;
}

export type InsightRow = {
  module: StoryboardModule;
  /** True for a practice session (no lead). */
  practice: boolean;
  /** Who did the work: the practice owner, or the lead's agent. */
  actorId: string | null;
  stepStatus: StepStatus;
  outcome: StoryboardOutcome | null;
  createdAt: string;
};

/** Rows created in the last `days` days (inclusive of the boundary instant). */
export function inRange(rows: InsightRow[], days: number, now: Date = new Date()): InsightRow[] {
  const since = now.getTime() - days * 24 * 60 * 60 * 1000;
  return rows.filter((r) => {
    const t = Date.parse(r.createdAt);
    return !Number.isNaN(t) && t >= since && t <= now.getTime();
  });
}

export type ModuleCount = { module: BuiltModule; practice: number; lead: number; total: number };

export type Insights = {
  total: number;
  practice: number;
  lead: number;
  byModule: ModuleCount[];
  /** How many sessions have each step saved. */
  steps: Record<StoryboardStep, number>;
  stepsCompleted: number;
  outcomes: Record<StoryboardOutcome, number>;
  outcomesRecorded: number;
  /** Sessions whose Step 4 (objections) is saved. */
  reachedStep4: number;
  /** reachedStep4 / total, 0..1; 0 when there are no sessions. */
  reachedStep4Share: number;
};

export function summarise(rows: InsightRow[]): Insights {
  const byModule: ModuleCount[] = BUILT_MODULES.map((module) => ({ module, practice: 0, lead: 0, total: 0 }));
  const steps = Object.fromEntries(STORYBOARD_STEPS.map((s) => [s, 0])) as Record<StoryboardStep, number>;
  const outcomes = Object.fromEntries(STORYBOARD_OUTCOMES.map((o) => [o, 0])) as Record<StoryboardOutcome, number>;
  let practice = 0;
  let lead = 0;
  let reachedStep4 = 0;

  for (const r of rows) {
    if (r.practice) practice += 1;
    else lead += 1;
    const m = byModule.find((x) => x.module === r.module);
    if (m) {
      if (r.practice) m.practice += 1;
      else m.lead += 1;
      m.total += 1;
    }
    const status = readStepStatus(r.stepStatus);
    for (const s of STORYBOARD_STEPS) if (status[s] === "saved") steps[s] += 1;
    if (status.objections === "saved") reachedStep4 += 1;
    if (r.outcome && r.outcome in outcomes) outcomes[r.outcome] += 1;
  }

  const total = rows.length;
  return {
    total,
    practice,
    lead,
    byModule,
    steps,
    stepsCompleted: STORYBOARD_STEPS.reduce((n, s) => n + steps[s], 0),
    outcomes,
    outcomesRecorded: STORYBOARD_OUTCOMES.reduce((n, o) => n + outcomes[o], 0),
    reachedStep4,
    reachedStep4Share: total === 0 ? 0 : reachedStep4 / total,
  };
}

export type TeamRow = {
  agentId: string;
  name: string;
  sessions: number;
  practice: number;
  withOutcome: number;
  readyForQuote: number;
};

/**
 * One row per agent, busiest first (ties by name). `names` maps profile id to
 * full name; a missing name shows as `unknownName`. Rows with no actor are skipped.
 */
export function teamTable(rows: InsightRow[], names: ReadonlyMap<string, string>, unknownName = "Unknown"): TeamRow[] {
  const by = new Map<string, TeamRow>();
  for (const r of rows) {
    if (!r.actorId) continue;
    let row = by.get(r.actorId);
    if (!row) {
      row = { agentId: r.actorId, name: names.get(r.actorId) ?? unknownName, sessions: 0, practice: 0, withOutcome: 0, readyForQuote: 0 };
      by.set(r.actorId, row);
    }
    row.sessions += 1;
    if (r.practice) row.practice += 1;
    if (r.outcome) row.withOutcome += 1;
    if (r.outcome === "ready_for_quote") row.readyForQuote += 1;
  }
  return [...by.values()].sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));
}

/** Whole-number percentage for display. */
export function pct(share: number): number {
  return Math.round(Math.max(0, Math.min(1, share)) * 100);
}
