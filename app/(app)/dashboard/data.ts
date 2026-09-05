import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/lib/supabase/profile";

type LeadRow = {
  id: string;
  full_name: string;
  status: "hot" | "warm" | "cold" | "unassigned" | "closed";
  pipeline_stage:
    | "new"
    | "contacted"
    | "follow_up"
    | "quoted"
    | "closed_won"
    | "closed_lost";
  agent_id: string | null;
  lead_source: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
  profiles: { full_name: string; avatar_initials: string | null } | null;
};

const OPEN_STAGES = ["new", "contacted", "follow_up", "quoted"];

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoKey(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// How far back the activity calendar can look. A year view needs 12 months,
// and the widget can page back one step from there, so 13 months of history
// is fetched and the widget clamps navigation to it.
const CALENDAR_MONTHS = 13;

export type CalendarDay = { key: string; leads: number; sales: number; activities: number };

export type MonitorScope = { agentId?: string; unitId?: string };

export async function getDashboardStats(profile: CurrentProfile, monitorScope?: MonitorScope) {
  const supabase = await createClient();

  let leadsQuery = supabase
    .from("leads")
    .select(
      "id, full_name, status, pipeline_stage, agent_id, lead_source, follow_up_date, created_at, updated_at, profiles(full_name, avatar_initials)",
    )
    .order("created_at", { ascending: false });
  if (monitorScope?.agentId) leadsQuery = leadsQuery.eq("agent_id", monitorScope.agentId);
  else if (monitorScope?.unitId) leadsQuery = leadsQuery.eq("unit_id", monitorScope.unitId);

  // Window for the activity calendar, as a date the DB can compare against.
  const calendarStart = new Date();
  calendarStart.setMonth(calendarStart.getMonth() - CALENDAR_MONTHS);
  calendarStart.setDate(1);
  const calendarStartKey = calendarStart.toISOString().slice(0, 10);

  const [
    { data: leads },
    { data: quotations },
    { data: targets },
    { data: teamProfiles },
    { data: activityRows },
  ] = await Promise.all([
      leadsQuery.returns<LeadRow[]>(),
      supabase
        .from("quotations")
        .select("id, lead_id, quotation_plans(sort_order, monthly_contribution)"),
      supabase
        .from("targets")
        .select("agent_id, noc_target")
        .eq("month", `${new Date().toISOString().slice(0, 7)}-01`),
      supabase.from("profiles").select("id"),
      // RLS ("activity visible if lead visible") scopes this to the same leads
      // the caller can already see, so no extra filtering is needed here.
      supabase
        .from("lead_activity")
        .select("created_at, lead_id")
        .gte("created_at", calendarStartKey),
    ]);

  const allLeads = leads ?? [];
  const today = todayKey();
  const monthPrefix = today.slice(0, 7);
  const weekStart = daysAgoKey(6);
  const prevWeekStart = daysAgoKey(13);

  const todayCount = allLeads.filter((l) => dayKey(l.created_at) === today).length;
  const yesterdayCount = allLeads.filter((l) => dayKey(l.created_at) === daysAgoKey(1)).length;

  const weekCount = allLeads.filter((l) => dayKey(l.created_at) >= weekStart).length;
  const prevWeekCount = allLeads.filter(
    (l) => dayKey(l.created_at) >= prevWeekStart && dayKey(l.created_at) < weekStart,
  ).length;
  const weekDeltaPct = prevWeekCount > 0
    ? Math.round(((weekCount - prevWeekCount) / prevWeekCount) * 100)
    : null;

  const monthCount = allLeads.filter((l) => dayKey(l.created_at).startsWith(monthPrefix)).length;
  // `targets` RLS grants any manager role read access to every row (not unit-scoped),
  // so re-scope here to the team this profile can actually see via `profiles` RLS
  // (which IS correctly unit/group-scoped) rather than trusting the raw targets rows.
  const teamProfileIds = new Set((teamProfiles ?? []).map((p) => p.id));
  const monthTarget = (targets ?? [])
    .filter((t) => teamProfileIds.has(t.agent_id))
    .reduce((sum, t) => sum + (t.noc_target ?? 0), 0);

  const openLeadIds = new Set(
    allLeads.filter((l) => OPEN_STAGES.includes(l.pipeline_stage)).map((l) => l.id),
  );
  const pipelineValue = (quotations ?? []).reduce((sum, q) => {
    if (!openLeadIds.has(q.lead_id)) return sum;
    const plans = (q.quotation_plans ?? []) as { sort_order: number; monthly_contribution: number | null }[];
    if (plans.length === 0) return sum;
    const primary = [...plans].sort((a, b) => a.sort_order - b.sort_order)[0];
    return sum + (primary.monthly_contribution ?? 0);
  }, 0);

  const overdue = allLeads.filter(
    (l) => l.follow_up_date && l.follow_up_date < today && OPEN_STAGES.includes(l.pipeline_stage),
  );
  const overdueOldestDays = overdue.reduce((max, l) => {
    const days = Math.floor(
      (new Date(today).getTime() - new Date(l.follow_up_date!).getTime()) / 86400000,
    );
    return Math.max(max, days);
  }, 0);

  const followUpToday = allLeads.filter(
    (l) => l.follow_up_date === today && OPEN_STAGES.includes(l.pipeline_stage),
  );

  const quotedLeadIds = new Set((quotations ?? []).map((q) => q.lead_id));
  const noQuotationYet = allLeads.filter(
    (l) =>
      (l.pipeline_stage === "contacted" || l.pipeline_stage === "follow_up") &&
      !quotedLeadIds.has(l.id),
  );

  const closedWonCount = allLeads.filter((l) => l.pipeline_stage === "closed_won").length;
  const conversionRatePct =
    allLeads.length > 0 ? Math.round((closedWonCount / allLeads.length) * 100) : 0;

  const statusCounts = { hot: 0, warm: 0, cold: 0, unassigned: 0 };
  for (const l of allLeads) {
    if (l.status in statusCounts) {
      statusCounts[l.status as keyof typeof statusCounts]++;
    }
  }
  const statusTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const sourceMap = new Map<string, { count: number; closed: number }>();
  for (const l of allLeads) {
    const key = l.lead_source || "Unknown";
    const entry = sourceMap.get(key) ?? { count: 0, closed: 0 };
    entry.count++;
    if (l.pipeline_stage === "closed_won") entry.closed++;
    sourceMap.set(key, entry);
  }
  const maxSourceCount = Math.max(1, ...[...sourceMap.values()].map((v) => v.count));
  const leadSources = [...sourceMap.entries()]
    .map(([source, v]) => ({
      source,
      count: v.count,
      closeRate: v.count > 0 ? Math.round((v.closed / v.count) * 100) : 0,
      volumePct: Math.round((v.count / maxSourceCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const dailyBuckets = Array.from({ length: 14 }, (_, i) => {
    const key = daysAgoKey(13 - i);
    const inCount = allLeads.filter((l) => dayKey(l.created_at) === key).length;
    const outCount = allLeads.filter(
      (l) => l.pipeline_stage === "closed_won" && dayKey(l.updated_at) === key,
    ).length;
    return { key, day: new Date(key).getDate(), inCount, outCount };
  });
  const maxDaily = Math.max(1, ...dailyBuckets.flatMap((d) => [d.inCount, d.outCount]));

  // Per-day totals for the activity calendar. Only days with something on them
  // are stored; the widget fills the gaps, so an empty year costs nothing.
  const calendarMap = new Map<string, CalendarDay>();
  const bumpDay = (key: string, field: "leads" | "sales" | "activities") => {
    if (key < calendarStartKey) return;
    const entry = calendarMap.get(key) ?? { key, leads: 0, sales: 0, activities: 0 };
    entry[field]++;
    calendarMap.set(key, entry);
  };
  for (const l of allLeads) {
    bumpDay(dayKey(l.created_at), "leads");
    // A closed-won lead counts as a sale on the day it was last moved -- the
    // closest thing to a close date without a dedicated column.
    if (l.pipeline_stage === "closed_won") bumpDay(dayKey(l.updated_at), "sales");
  }
  // Monitor scope narrows the leads query but not lead_activity, so drop
  // activity belonging to leads outside the scoped set.
  const visibleLeadIds = new Set(allLeads.map((l) => l.id));
  for (const a of activityRows ?? []) {
    if (a.lead_id && !visibleLeadIds.has(a.lead_id as string)) continue;
    bumpDay(dayKey(a.created_at as string), "activities");
  }
  const calendarDays = [...calendarMap.values()].sort((a, b) => a.key.localeCompare(b.key));

  const agentMap = new Map<
    string,
    { name: string; initials: string; count: number }
  >();
  let unassignedPool = 0;
  for (const l of allLeads) {
    if (!l.agent_id || !l.profiles) {
      unassignedPool++;
      continue;
    }
    const entry = agentMap.get(l.agent_id) ?? {
      name: l.profiles.full_name,
      initials: l.profiles.avatar_initials || l.profiles.full_name.slice(0, 2).toUpperCase(),
      count: 0,
    };
    entry.count++;
    agentMap.set(l.agent_id, entry);
  }
  const maxAgentCount = Math.max(1, ...[...agentMap.values()].map((v) => v.count));
  const assignment = [...agentMap.values()]
    .sort((a, b) => b.count - a.count)
    .map((a) => ({ ...a, barPct: Math.round((a.count / maxAgentCount) * 100) }));

  return {
    totalLeads: allLeads.length,
    teamSize: (teamProfiles ?? []).length,
    todayCount,
    todayDelta: todayCount - yesterdayCount,
    weekCount,
    weekDeltaPct,
    monthCount,
    monthTarget,
    pipelineValue,
    overdueCount: overdue.length,
    overdueOldestDays,
    followUpTodayCount: followUpToday.length,
    followUpBeforeNoon: followUpToday.length > 0 ? Math.ceil(followUpToday.length / 2) : 0,
    noQuotationCount: noQuotationYet.length,
    closedWonCount,
    conversionRatePct,
    statusCounts,
    statusTotal,
    leadSources,
    dailyBuckets,
    maxDaily,
    calendarDays,
    calendarStartKey,
    assignment,
    unassignedPool,
    isManager: profile.role !== "agent",
  };
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;
