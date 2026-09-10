import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/lib/supabase/profile";
import { leadPotentialAnc, type AncQuotation } from "@/lib/lead-anc";
import { malaysiaDayKey, malaysiaDaysAgo } from "@/lib/malaysia-date";
import { upcomingBirthdays, malaysiaToday, type Birthday } from "@/lib/birthdays";

type LeadRow = {
  id: string;
  lead_no: number;
  full_name: string;
  phone: string;
  date_of_birth: string | null;
  status: "hot" | "warm" | "cold" | "unassigned" | "closed";
  pipeline_stage:
    | "new"
    | "contacted"
    | "follow_up"
    | "quoted"
    | "appointment"
    | "closed_won"
    | "servicing"
    | "closed_lost";
  agent_id: string | null;
  lead_source: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
  profiles: { full_name: string; avatar_initials: string | null } | null;
};

// Enough of a quotation to work out one lead's potential ANC without
// dragging the whole calculator payload along -- see lib/lead-anc.
type QuotationForPipeline = {
  id: string;
  lead_id: string;
  updated_at: string;
  is_customizer: string | null;
  quotation_plans: { sort_order: number; monthly_contribution: number | null; annual_contribution: number | null }[];
};

const OPEN_STAGES = ["new", "contacted", "follow_up", "quoted", "appointment"];
// Business already won. Servicing counts too -- that client was still closed,
// they have simply moved on to being looked after.
const WON_STAGES = ["closed_won", "servicing"];

// created_at/updated_at are nullable in the schema -- they carry defaults, not
// NOT NULL -- and rows do exist with a null updated_at. Returning "" rather
// than throwing keeps one such row from taking the whole dashboard down: ""
// sorts before every real key, so those rows simply fall outside every
// period comparison instead of landing in the wrong bucket.
// Every key here is a Malaysia calendar day, not a UTC one. This app's
// server functions run on Vercel in UTC, and Malaysia is UTC+8 -- the old
// toISOString().slice(0, 10) shortcut reported yesterday's date for the
// first eight hours of every Malaysian day, so a lead created at 7am in KL
// landed in yesterday's bucket and a follow-up due today did not read as due
// yet. See lib/malaysia-date for the one shared definition of "what day is
// it" the rest of the app uses too.
function dayKey(iso: string | null | undefined) {
  return iso ? malaysiaDayKey(iso) : "";
}

function todayKey() {
  return malaysiaDayKey();
}

function daysAgoKey(n: number) {
  return malaysiaDaysAgo(n);
}

// How far back the activity calendar can look. A year view needs 12 months,
// and the widget can page back one step from there, so 13 months of history
// is fetched and the widget clamps navigation to it.
const CALENDAR_MONTHS = 13;

export type CalendarLeadItem = { id: string; fullName: string };
// A closed case carries its ANC so the month/week money figures can be summed
// from the same per-day rows the calendar draws, exactly like the counts are.
export type CalendarSaleItem = CalendarLeadItem & { anc: number };
export type CalendarActivityItem = { id: string; label: string; leadId: string | null; leadName: string | null };
export type CalendarAppointmentItem = {
  id: string;
  leadId: string;
  leadName: string;
  time: string;
  location: string | null;
};
// Full items, not counts -- the calendar cell shows counts derived from these
// (leads.length etc.), and clicking a day opens them in a modal without a
// second round trip.
export type CalendarDay = {
  key: string;
  leads: CalendarLeadItem[];
  sales: CalendarSaleItem[];
  activities: CalendarActivityItem[];
  appointments: CalendarAppointmentItem[];
};

function activityLabel(activityType: string, content: string | null) {
  switch (activityType) {
    case "wa_sent": return "WhatsApp sent";
    case "assigned": return content ?? "Reassigned";
    case "stage_change": return content ?? "Stage changed";
    case "created": return "Lead created";
    case "quotation_created": return content ?? "Quotation created";
    default: return content ?? "Note added";
  }
}

export type MonitorScope = { agentId?: string; unitId?: string };

export async function getDashboardStats(profile: CurrentProfile, monitorScope?: MonitorScope) {
  const supabase = await createClient();

  let leadsQuery = supabase
    .from("leads")
    .select(
      // leads now has two FKs to profiles (agent_id and deleted_by), so the
      // embed has to name which one -- a bare profiles(...) is ambiguous and
      // PostgREST returns nothing at all for it.
      "id, lead_no, full_name, phone, date_of_birth, status, pipeline_stage, agent_id, lead_source, follow_up_date, created_at, updated_at, profiles!leads_agent_id_fkey(full_name, avatar_initials)",
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
    { data: appointmentRows },
    { data: campaignRow },
  ] = await Promise.all([
      leadsQuery.returns<LeadRow[]>(),
      supabase
        .from("quotations")
        .select(
          "id, lead_id, updated_at, is_customizer:raw_payload->>__customizer, quotation_plans(sort_order, monthly_contribution, annual_contribution)",
        )
        .returns<QuotationForPipeline[]>(),
      supabase
        .from("targets")
        .select("agent_id, noc_target, anc_target, approach_target")
        .eq("month", `${todayKey().slice(0, 7)}-01`),
      supabase.from("profiles").select("id"),
      // RLS ("activity visible if lead visible") scopes this to the same leads
      // the caller can already see, so no extra filtering is needed here.
      supabase
        .from("lead_activity")
        .select("id, created_at, lead_id, activity_type, content")
        .gte("created_at", calendarStartKey),
      // Same story for appointments: their RLS is inherited from leads, so the
      // caller only ever sees the ones on leads they can already open.
      supabase
        .from("appointments")
        .select("id, lead_id, scheduled_at, location, status, leads(full_name)")
        .neq("status", "cancelled")
        .gte("scheduled_at", calendarStartKey),
      // The viewer's own goal, not the team's: a campaign is a personal
      // commitment, so a manager looking at team numbers still sees their
      // own road to target above them.
      supabase
        .from("anc_campaigns")
        .select("name, target_anc, start_date, deadline")
        .eq("agent_id", profile.id)
        .eq("is_active", true)
        .maybeSingle(),
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
  const targetsInScope = (targets ?? []).filter((t) => teamProfileIds.has(t.agent_id));
  const monthTarget = targetsInScope.reduce((sum, t) => sum + (t.noc_target ?? 0), 0);
  // The money and approach equivalents of monthTarget, scoped the same way:
  // an agent sees their own row, a manager the sum across their team.
  const monthAncTarget = targetsInScope.reduce((sum, t) => sum + Number(t.anc_target ?? 0), 0);
  const approachTargetPerDay = targetsInScope.reduce((sum, t) => sum + (t.approach_target ?? 0), 0);

  const openLeadIds = new Set(
    allLeads.filter((l) => OPEN_STAGES.includes(l.pipeline_stage)).map((l) => l.id),
  );
  // One figure per lead, not per quotation. This used to sum every quotation
  // row regardless of which lead it belonged to, so a lead carrying both a
  // calculator estimate and a customizer quotation (or a couple of resaves
  // of either) had its contribution counted twice. leadPotentialAnc picks
  // the single winning quotation per lead -- the customizer one over the
  // estimate, most recent within either kind -- the same rule every lead
  // card and the pipeline board already use, so this figure can no longer
  // disagree with them for that reason. (It can still differ from the
  // pipeline board's own total: this counts only leads still open --
  // OPEN_STAGES above -- on purpose, as "potential" money not yet closed
  // either way, where the board's total also includes what has already
  // closed.)
  // Every lead's quotations, not just the open ones: the same per-lead figure
  // answers both "what is still in play" (open leads, below) and "what has
  // actually closed" (won leads, for the goal card and the money on each
  // closed day in the calendar).
  const quotationsByLead = new Map<string, AncQuotation[]>();
  for (const q of quotations ?? []) {
    const entry: AncQuotation = {
      is_customizer: q.is_customizer,
      updated_at: q.updated_at,
      quotation_plans: q.quotation_plans ?? [],
    };
    const list = quotationsByLead.get(q.lead_id);
    if (list) list.push(entry);
    else quotationsByLead.set(q.lead_id, [entry]);
  }
  const ancByLead = new Map<string, number>();
  for (const [leadId, leadQuotations] of quotationsByLead) {
    const potential = leadPotentialAnc(leadQuotations);
    if (potential) ancByLead.set(leadId, potential.anc);
  }
  let pipelineValue = 0;
  for (const [leadId, anc] of ancByLead) {
    if (openLeadIds.has(leadId)) pipelineValue += anc;
  }

  // ---- Goal tracking -------------------------------------------------------
  // A won lead's close date is the day it was last moved -- the same stand-in
  // the activity calendar already uses, so the goal card and the calendar can
  // never disagree about which month a case landed in.
  const wonLeads = allLeads.filter((l) => WON_STAGES.includes(l.pipeline_stage));
  const ancOf = (leadId: string) => ancByLead.get(leadId) ?? 0;
  const closedAncAllTime = wonLeads.reduce((sum, l) => sum + ancOf(l.id), 0);
  const monthClosed = wonLeads.filter((l) => dayKey(l.updated_at).startsWith(monthPrefix));
  const monthAnc = monthClosed.reduce((sum, l) => sum + ancOf(l.id), 0);
  const weekAnc = wonLeads
    .filter((l) => dayKey(l.updated_at) >= weekStart)
    .reduce((sum, l) => sum + ancOf(l.id), 0);

  // Only cases that actually carry a figure count toward the average -- a won
  // lead with no quotation on file would otherwise drag it toward zero and
  // make "how many more cases do I need" nonsense.
  const casesWithAnc = wonLeads.filter((l) => ancOf(l.id) > 0);
  const avgCaseSize = casesWithAnc.length > 0
    ? Math.round(closedAncAllTime / casesWithAnc.length)
    : null;

  const campaign = campaignRow
    ? (() => {
        const targetAnc = Number(campaignRow.target_anc);
        const start = campaignRow.start_date as string;
        const deadline = campaignRow.deadline as string;
        // Closings inside the campaign window only, so an old push's numbers
        // don't inflate the new one.
        const currentAnc = wonLeads
          .filter((l) => {
            const key = dayKey(l.updated_at);
            return key >= start && key <= deadline;
          })
          .reduce((sum, l) => sum + ancOf(l.id), 0);
        const remaining = Math.max(0, targetAnc - currentAnc);
        const daysLeft = Math.max(
          0,
          Math.ceil((new Date(deadline).getTime() - new Date(today).getTime()) / 86400000),
        );
        // Round up: a partial week still has to carry its share, and pacing
        // against a rounded-down week count would quietly under-set the bar.
        const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
        return {
          name: campaignRow.name as string,
          targetAnc,
          startDate: start,
          deadline,
          currentAnc,
          remaining,
          achievementPct: targetAnc > 0 ? Math.round((currentAnc / targetAnc) * 1000) / 10 : 0,
          daysLeft,
          weeksLeft,
          weeklyNeeded: Math.round(remaining / weeksLeft),
          casesNeeded: avgCaseSize && avgCaseSize > 0 ? Math.ceil(remaining / avgCaseSize) : null,
        };
      })()
    : null;

  // Weeks left in the calendar month, for pacing the monthly target the same
  // way the campaign paces its own remainder.
  const [yr, mo] = monthPrefix.split("-").map(Number);
  const daysInMonth = new Date(yr, mo, 0).getDate();
  const dayOfMonth = Number(today.slice(8, 10));
  const monthWeeksLeft = Math.max(1, Math.ceil((daysInMonth - dayOfMonth + 1) / 7));
  const monthAncRemaining = Math.max(0, monthAncTarget - monthAnc);

  const goal = {
    campaign,
    monthAncTarget,
    monthAnc,
    monthAncRemaining,
    monthAncPct: monthAncTarget > 0 ? Math.round((monthAnc / monthAncTarget) * 1000) / 10 : null,
    // Auto-paced from what is left rather than a flat target/4: by the last
    // week of a month behind plan, a flat figure understates the real ask.
    weekAncTarget: monthAncTarget > 0 ? Math.round(monthAncRemaining / monthWeeksLeft) : 0,
    weekAnc,
    avgCaseSize,
    casesNeededThisMonth:
      avgCaseSize && avgCaseSize > 0 ? Math.ceil(monthAncRemaining / avgCaseSize) : null,
    approachTargetPerDay,
    closedAncAllTime,
  };

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

  const closedWonCount = allLeads.filter((l) => WON_STAGES.includes(l.pipeline_stage)).length;
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
    if (WON_STAGES.includes(l.pipeline_stage)) entry.closed++;
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
      (l) => WON_STAGES.includes(l.pipeline_stage) && dayKey(l.updated_at) === key,
    ).length;
    return { key, day: new Date(key).getDate(), inCount, outCount };
  });
  const maxDaily = Math.max(1, ...dailyBuckets.flatMap((d) => [d.inCount, d.outCount]));

  // Per-day items for the activity calendar. Only days with something on them
  // are stored; the widget fills the gaps, so an empty year costs nothing.
  const calendarMap = new Map<string, CalendarDay>();
  const dayEntry = (key: string) => {
    let entry = calendarMap.get(key);
    if (!entry) {
      entry = { key, leads: [], sales: [], activities: [], appointments: [] };
      calendarMap.set(key, entry);
    }
    return entry;
  };
  const leadNameById = new Map(allLeads.map((l) => [l.id, l.full_name]));
  for (const l of allLeads) {
    const createdKey = dayKey(l.created_at);
    if (createdKey >= calendarStartKey) dayEntry(createdKey).leads.push({ id: l.id, fullName: l.full_name });
    // A closed-won lead counts as a sale on the day it was last moved -- the
    // closest thing to a close date without a dedicated column. Only read
    // updated_at for those: most leads have never been moved and carry null.
    if (WON_STAGES.includes(l.pipeline_stage)) {
      const updatedKey = dayKey(l.updated_at);
      if (updatedKey >= calendarStartKey) {
        dayEntry(updatedKey).sales.push({
          id: l.id,
          fullName: l.full_name,
          anc: ancByLead.get(l.id) ?? 0,
        });
      }
    }
  }
  // Monitor scope narrows the leads query but not lead_activity, so drop
  // activity belonging to leads outside the scoped set.
  const visibleLeadIds = new Set(allLeads.map((l) => l.id));
  for (const a of activityRows ?? []) {
    const leadId = a.lead_id as string | null;
    if (leadId && !visibleLeadIds.has(leadId)) continue;
    const key = dayKey(a.created_at as string);
    if (key < calendarStartKey) continue;
    dayEntry(key).activities.push({
      id: a.id as string,
      label: activityLabel(a.activity_type as string, a.content as string | null),
      leadId,
      leadName: leadId ? (leadNameById.get(leadId) ?? null) : null,
    });
  }
  for (const a of appointmentRows ?? []) {
    const key = dayKey(a.scheduled_at as string);
    if (key < calendarStartKey) continue;
    const lead = a.leads as unknown as { full_name: string } | null;
    dayEntry(key).appointments.push({
      id: a.id as string,
      leadId: a.lead_id as string,
      leadName: lead?.full_name ?? "Unknown lead",
      time: new Date(a.scheduled_at as string).toLocaleTimeString("en-MY", {
        hour: "numeric", minute: "2-digit", hour12: true,
      }),
      location: (a.location as string | null) ?? null,
    });
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

  // Birthdays of the leads and clients this person can already see -- the
  // list is RLS-scoped like everything else on this page. A month ahead is
  // enough to plan around without the card becoming a wall of names.
  const birthdays: Birthday[] = upcomingBirthdays(
    allLeads.map((l) => ({
      id: l.id,
      full_name: l.full_name,
      phone: l.phone,
      date_of_birth: l.date_of_birth,
      pipeline_stage: l.pipeline_stage,
    })),
    malaysiaToday(),
    30,
  );

  // The next few appointments, so the dashboard answers "where do I have to
  // be" without opening the calendar. Cancelled ones are already excluded by
  // the query; this drops the ones that have been and gone.
  const nowIso = new Date().toISOString();
  const upcomingAppointments = (appointmentRows ?? [])
    .filter((a) => (a.scheduled_at as string) >= nowIso)
    .sort((a, b) => (a.scheduled_at as string).localeCompare(b.scheduled_at as string))
    .slice(0, 5)
    .map((a) => ({
      id: a.id as string,
      leadId: a.lead_id as string,
      leadName: ((a.leads as unknown as { full_name: string } | null)?.full_name) ?? "Unknown lead",
      scheduledAt: a.scheduled_at as string,
      location: (a.location as string | null) ?? null,
    }));

  // allLeads already comes back newest first.
  const recentLeads = allLeads.slice(0, 5).map((l) => ({
    id: l.id,
    leadNo: l.lead_no,
    fullName: l.full_name,
    status: l.status,
    stage: l.pipeline_stage,
    agentName: l.profiles?.full_name ?? null,
    createdAt: l.created_at,
  }));

  return {
    totalLeads: allLeads.length,
    birthdays,
    upcomingAppointments,
    recentLeads,
    teamSize: (teamProfiles ?? []).length,
    todayCount,
    todayDelta: todayCount - yesterdayCount,
    weekCount,
    weekDeltaPct,
    monthCount,
    monthTarget,
    goal,
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
