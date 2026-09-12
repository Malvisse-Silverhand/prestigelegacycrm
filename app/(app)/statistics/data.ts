import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile, Role } from "@/lib/profile-types";
import { computeAgentMetrics, type MinimalLead, type MinimalActivity } from "@/app/(app)/team/metrics";
import { WON_STAGES } from "@/lib/pipeline-stages";
import { leadPotentialAnc, type AncQuotation } from "@/lib/lead-anc";
import { malaysiaDayKey, malaysiaDaysAgo } from "@/lib/malaysia-date";

type QuotationRow = {
  id: string;
  lead_id: string;
  status: string;
  created_at: string;
  updated_at?: string | null;
  is_customizer?: string | boolean | null;
  quotation_plans: {
    sort_order: number;
    monthly_contribution: number | null;
    annual_contribution?: number | null;
  }[];
};

// Everyone this person is allowed to look at. profiles RLS is already scoped
// correctly per role (superadmin everyone, GM their units and reports, UM
// their unit, AUM their agents, agent themselves), so the query IS the
// permission check -- there is no scope rule repeated here to fall out of
// step with the database.
export type ScopedMember = {
  id: string;
  fullName: string;
  role: Role;
  avatarInitials: string | null;
  unitId: string | null;
};

export async function getScopedMembers(profile: CurrentProfile): Promise<ScopedMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, avatar_initials, unit_id")
    .eq("is_active", true)
    .order("full_name");

  const rows = (data ?? []).map((p) => ({
    id: p.id as string,
    fullName: p.full_name as string,
    role: p.role as Role,
    avatarInitials: (p.avatar_initials as string | null) ?? null,
    unitId: (p.unit_id as string | null) ?? null,
  }));

  // An agent whose own row somehow isn't readable still gets themselves --
  // the personal view is the one thing nobody should be locked out of.
  return rows.some((r) => r.id === profile.id)
    ? rows
    : [
        {
          id: profile.id,
          fullName: profile.full_name,
          role: profile.role,
          avatarInitials: profile.avatar_initials,
          unitId: profile.unit_id,
        },
        ...rows,
      ];
}

export type PersonalStats = ReturnType<typeof computePersonalStats>;

// One person's own numbers, from the same rows the team-wide charts use.
// `leads` arrives already RLS-scoped, so this only has to narrow by owner.
export function computePersonalStats(
  memberId: string,
  leads: MinimalLeadWithSource[],
  quotations: PersonalQuotation[],
  activities: MinimalActivity[],
  staleAfterDays: number,
  target: { ancTarget: number | null; nocTarget: number | null; approachTarget: number | null } | null,
) {
  const mine = leads.filter((l) => l.agent_id === memberId);
  const mineIds = new Set(mine.map((l) => l.id));
  const today = malaysiaDayKey();
  const monthPrefix = today.slice(0, 7);
  const weekStart = malaysiaDaysAgo(6);

  // Same per-lead ANC rule as the dashboard and every lead card: the
  // customizer quotation over the calculator estimate, newest within a kind.
  const byLead = new Map<string, AncQuotation[]>();
  for (const q of quotations) {
    if (!mineIds.has(q.lead_id)) continue;
    const entry: AncQuotation = {
      is_customizer: q.is_customizer ?? null,
      updated_at: q.updated_at ?? q.created_at,
      quotation_plans: (q.quotation_plans ?? []).map((p) => ({
        sort_order: p.sort_order,
        monthly_contribution: p.monthly_contribution,
        annual_contribution: p.annual_contribution ?? null,
      })),
    };
    const list = byLead.get(q.lead_id);
    if (list) list.push(entry);
    else byLead.set(q.lead_id, [entry]);
  }
  const ancOf = (leadId: string) => leadPotentialAnc(byLead.get(leadId))?.anc ?? 0;

  const won = mine.filter((l) => WON_STAGES.includes(l.pipeline_stage));
  const wonThisMonth = won.filter((l) => malaysiaDayKey(l.updated_at ?? l.created_at).startsWith(monthPrefix));

  const closedAnc = won.reduce((sum, l) => sum + ancOf(l.id), 0);
  const closedAncThisMonth = wonThisMonth.reduce((sum, l) => sum + ancOf(l.id), 0);

  const openAnc = mine
    .filter((l) => !WON_STAGES.includes(l.pipeline_stage) && l.pipeline_stage !== "closed_lost")
    .reduce((sum, l) => sum + ancOf(l.id), 0);

  const metrics = computeAgentMetrics(mine, activities, staleAfterDays).get(memberId) ?? null;

  const leadsThisMonth = mine.filter((l) => malaysiaDayKey(l.created_at).startsWith(monthPrefix)).length;
  const approachesThisWeek = mine.filter((l) => malaysiaDayKey(l.created_at) >= weekStart).length;
  const approachesToday = mine.filter((l) => malaysiaDayKey(l.created_at) === today).length;
  const quotationCount = quotations.filter((q) => mineIds.has(q.lead_id)).length;

  return {
    leadCount: mine.length,
    leadsThisMonth,
    approachesToday,
    approachesThisWeek,
    quotationCount,
    casesClosed: won.length,
    casesClosedThisMonth: wonThisMonth.length,
    closedAnc,
    closedAncThisMonth,
    openAnc,
    convRate: metrics?.convRate ?? 0,
    avgResponseHours: metrics?.avgResponseHours ?? null,
    staleCount: metrics?.staleCount ?? 0,
    ancTarget: target?.ancTarget ?? null,
    nocTarget: target?.nocTarget ?? null,
    approachTarget: target?.approachTarget ?? null,
    ancPct:
      target?.ancTarget && target.ancTarget > 0
        ? Math.round((closedAncThisMonth / target.ancTarget) * 1000) / 10
        : null,
  };
}

// What computePersonalStats needs from a quotation -- a superset of the
// team-chart shape, since ANC also needs the annual figure and which kind of
// document it came from.
export type PersonalQuotation = {
  lead_id: string;
  created_at: string;
  updated_at?: string | null;
  is_customizer?: string | boolean | null;
  quotation_plans: {
    sort_order: number;
    monthly_contribution: number | null;
    annual_contribution?: number | null;
  }[];
};

// This month's target row for one person, if anyone has set one.
export async function getMemberTarget(memberId: string) {
  const supabase = await createClient();
  const month = `${malaysiaDayKey().slice(0, 7)}-01`;
  const { data } = await supabase
    .from("targets")
    .select("anc_target, noc_target, approach_target")
    .eq("agent_id", memberId)
    .eq("month", month)
    .maybeSingle();

  if (!data) return null;
  return {
    ancTarget: data.anc_target === null ? null : Number(data.anc_target),
    nocTarget: data.noc_target,
    approachTarget: data.approach_target,
  };
}

export type MinimalLeadWithSource = MinimalLead & {
  lead_source?: string | null;
  interest?: string | null;
  // The stand-in for a close date, same as the dashboard uses.
  updated_at?: string | null;
};

export async function getStatisticsData(profile: CurrentProfile) {
  const supabase = await createClient();

  const [{ data: leads }, { data: quotations }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, agent_id, unit_id, pipeline_stage, created_at, updated_at, lead_source, interest")
      .returns<MinimalLeadWithSource[]>(),
    supabase
      .from("quotations")
      .select(
        "id, lead_id, status, created_at, updated_at, is_customizer:raw_payload->>__customizer, quotation_plans(sort_order, monthly_contribution, annual_contribution)",
      )
      .returns<QuotationRow[]>(),
  ]);

  const allLeads = leads ?? [];
  const leadIds = allLeads.map((l) => l.id);

  let activities: MinimalActivity[] = [];
  if (leadIds.length > 0) {
    const { data } = await supabase
      .from("lead_activity")
      .select("lead_id, activity_type, created_at")
      .in("lead_id", leadIds)
      .returns<MinimalActivity[]>();
    activities = data ?? [];
  }

  let unitRows: { id: string; name: string; group_manager_id: string | null }[] = [];
  if (profile.role !== "unit_manager" && profile.role !== "aspirant_unit_manager") {
    let unitsQuery = supabase.from("units").select("id, name, group_manager_id").order("name");
    if (profile.role === "group_manager") unitsQuery = unitsQuery.eq("group_manager_id", profile.id);
    const { data } = await unitsQuery;
    unitRows = data ?? [];
  }

  let unitManagers: { id: string; full_name: string; unit_id: string | null; avatar_initials: string | null }[] = [];
  if (unitRows.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, unit_id, avatar_initials")
      .in("unit_id", unitRows.map((u) => u.id))
      .eq("role", "unit_manager");
    unitManagers = data ?? [];
  }

  const { data: agentRows } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_initials")
    .eq("role", "agent")
    .order("full_name");

  return {
    leads: allLeads,
    activities,
    quotations: quotations ?? [],
    units: unitRows,
    unitManagers,
    agents: agentRows ?? [],
  };
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function computeTopStats(
  leads: MinimalLead[],
  quotations: QuotationRow[],
  monthKeyStr: string,
  prevMonthKeyStr: string,
) {
  const thisMonthLeads = leads.filter((l) => monthKey(l.created_at) === monthKeyStr);
  const prevMonthLeads = leads.filter((l) => monthKey(l.created_at) === prevMonthKeyStr);
  const thisMonthQuotes = quotations.filter((q) => monthKey(q.created_at) === monthKeyStr && q.status !== "draft");
  const prevMonthQuotes = quotations.filter((q) => monthKey(q.created_at) === prevMonthKeyStr && q.status !== "draft");
  const thisMonthClosed = thisMonthLeads.filter((l) => WON_STAGES.includes(l.pipeline_stage)).length;
  const prevMonthClosed = prevMonthLeads.filter((l) => WON_STAGES.includes(l.pipeline_stage)).length;
  const thisConv = thisMonthLeads.length > 0 ? (thisMonthClosed / thisMonthLeads.length) * 100 : 0;
  const prevConv = prevMonthLeads.length > 0 ? (prevMonthClosed / prevMonthLeads.length) * 100 : 0;

  const monthlyContribution = quotations
    .filter((q) => monthKey(q.created_at) === monthKeyStr)
    .reduce((sum, q) => {
      const plans = q.quotation_plans;
      if (plans.length === 0) return sum;
      const primary = [...plans].sort((a, b) => a.sort_order - b.sort_order)[0];
      return sum + (primary.monthly_contribution ?? 0);
    }, 0);

  function pctDelta(cur: number, prev: number) {
    if (prev === 0) return null;
    return Math.round(((cur - prev) / prev) * 100);
  }

  return {
    totalLeads: thisMonthLeads.length,
    totalLeadsDelta: pctDelta(thisMonthLeads.length, prevMonthLeads.length),
    quotationsSent: thisMonthQuotes.length,
    quotationsSentDelta: pctDelta(thisMonthQuotes.length, prevMonthQuotes.length),
    casesClosed: thisMonthClosed,
    casesClosedDelta: thisMonthClosed - prevMonthClosed,
    groupConversion: Math.round(thisConv * 10) / 10,
    groupConversionDelta: Math.round((thisConv - prevConv) * 10) / 10,
    monthlyContribution,
  };
}

export function computeProductMix(leads: MinimalLeadWithSource[]) {
  const buckets = { "Medical card": 0, Hibah: 0, Other: 0 };
  for (const l of leads) {
    const text = `${l.lead_source ?? ""} ${l.interest ?? ""}`.toLowerCase();
    if (text.includes("medical")) buckets["Medical card"]++;
    else if (text.includes("hibah")) buckets.Hibah++;
    else buckets.Other++;
  }
  const total = leads.length || 1;
  const max = Math.max(1, ...Object.values(buckets));
  return Object.entries(buckets).map(([label, count]) => ({
    label,
    count,
    pct: Math.round((count / total) * 100),
    barPct: Math.round((count / max) * 100),
  }));
}

export function computeResponseBuckets(leads: MinimalLead[], activities: MinimalActivity[]) {
  const firstActivityByLead = new Map<string, string>();
  for (const a of activities) {
    if (a.activity_type === "created") continue;
    const existing = firstActivityByLead.get(a.lead_id);
    if (!existing || a.created_at < existing) firstActivityByLead.set(a.lead_id, a.created_at);
  }
  const buckets = [
    { label: "<1h", max: 1, count: 0, color: "#0f4c35" },
    { label: "1–2h", max: 2, count: 0, color: "#0f4c35" },
    { label: "2–4h", max: 4, count: 0, color: "#fac748" },
    { label: "4–8h", max: 8, count: 0, color: "#c9552f" },
    { label: ">8h", max: Infinity, count: 0, color: "#c9552f" },
  ];
  let under1 = 0;
  let over4 = 0;
  for (const l of leads) {
    const first = firstActivityByLead.get(l.id);
    if (!first) continue;
    const hours = (new Date(first).getTime() - new Date(l.created_at).getTime()) / 3600000;
    if (hours < 0) continue;
    if (hours < 1) under1++;
    if (hours >= 4) over4++;
    const bucket = buckets.find((b) => hours < b.max);
    if (bucket) bucket.count++;
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return {
    buckets: buckets.map((b) => ({ ...b, heightPct: Math.round((b.count / max) * 100) })),
    under1,
    over4,
  };
}

export function computeStageFunnel(leads: MinimalLead[]) {
  const total = leads.length || 1;
  const atOrPast = (stages: string[]) => leads.filter((l) => stages.includes(l.pipeline_stage)).length;
  // Every stage downstream of the one being measured counts as "reached
  // it", so Appointment and Servicing have to appear in these lists too --
  // otherwise booking a meeting would make a lead vanish from the funnel.
  const DOWNSTREAM = ["appointment", "submission", "closed_won", "servicing", "closed_lost"];
  const contactedPlus = atOrPast(["contacted", "follow_up", "quoted", ...DOWNSTREAM]);
  const fuPlus = atOrPast(["follow_up", "quoted", ...DOWNSTREAM]);
  const quotedPlus = atOrPast(["quoted", ...DOWNSTREAM]);
  const won = atOrPast(WON_STAGES);

  return [
    { label: "New → Contact", pct: Math.round((contactedPlus / total) * 100), color: "#0f2540" },
    { label: "Contact → FU", pct: contactedPlus > 0 ? Math.round((fuPlus / contactedPlus) * 100) : 0, color: "#0f2540" },
    { label: "FU → Quoted", pct: fuPlus > 0 ? Math.round((quotedPlus / fuPlus) * 100) : 0, color: "#fac748" },
    { label: "Quoted → Won", pct: quotedPlus > 0 ? Math.round((won / quotedPlus) * 100) : 0, color: "#0f4c35" },
  ];
}

export function computeLeague(
  rows: { id: string; name: string; unitId: string; avatarInitials: string | null }[],
  leads: MinimalLead[],
  quotations: QuotationRow[],
  activities: MinimalActivity[],
  staleAfterDays: number,
) {
  return rows
    .map((row) => {
      const unitLeads = leads.filter((l) => l.unit_id === row.unitId);
      const unitLeadIds = new Set(unitLeads.map((l) => l.id));
      const unitActivities = activities.filter((a) => unitLeadIds.has(a.lead_id));
      const closed = unitLeads.filter((l) => WON_STAGES.includes(l.pipeline_stage)).length;
      const quoted = quotations.filter((q) => unitLeadIds.has(q.lead_id)).length;
      const perAgent = computeAgentMetrics(unitLeads, unitActivities, staleAfterDays);
      const responseValues = [...perAgent.values()].map((m) => m.avgResponseHours).filter((v): v is number => v !== null);
      const avgResponse = responseValues.length > 0 ? responseValues.reduce((a, b) => a + b, 0) / responseValues.length : null;
      const agentCount = new Set(unitLeads.map((l) => l.agent_id).filter(Boolean)).size;

      const now = new Date();
      const trend = [2, 1, 0].map((monthsAgo) => {
        const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
        const key = d.toISOString().slice(0, 7);
        return unitLeads.filter((l) => l.created_at.slice(0, 7) === key).length;
      });

      return {
        ...row,
        agentCount,
        leadCount: unitLeads.length,
        quoted,
        closed,
        convRate: unitLeads.length > 0 ? Math.round((closed / unitLeads.length) * 1000) / 10 : 0,
        avgResponse,
        trend,
      };
    })
    .sort((a, b) => (b.convRate !== a.convRate ? b.convRate - a.convRate : (a.avgResponse ?? 99) - (b.avgResponse ?? 99)));
}
