import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/lib/profile-types";
import { computeAgentMetrics, type MinimalLead, type MinimalActivity } from "@/app/(app)/team/metrics";

type QuotationRow = {
  id: string;
  lead_id: string;
  status: string;
  created_at: string;
  quotation_plans: { sort_order: number; monthly_contribution: number | null }[];
};

export type MinimalLeadWithSource = MinimalLead & { lead_source?: string | null; interest?: string | null };

export async function getStatisticsData(profile: CurrentProfile) {
  const supabase = await createClient();

  const [{ data: leads }, { data: quotations }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, agent_id, unit_id, pipeline_stage, created_at, lead_source, interest")
      .returns<MinimalLeadWithSource[]>(),
    supabase
      .from("quotations")
      .select("id, lead_id, status, created_at, quotation_plans(sort_order, monthly_contribution)")
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
  if (profile.role !== "unit_manager") {
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

const OPEN_OR_CLOSED_WON = new Set(["contacted", "follow_up", "quoted", "closed_won", "closed_lost"]);

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
  const thisMonthClosed = thisMonthLeads.filter((l) => l.pipeline_stage === "closed_won").length;
  const prevMonthClosed = prevMonthLeads.filter((l) => l.pipeline_stage === "closed_won").length;
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
  const contactedPlus = atOrPast(["contacted", "follow_up", "quoted", "closed_won", "closed_lost"]);
  const fuPlus = atOrPast(["follow_up", "quoted", "closed_won", "closed_lost"]);
  const quotedPlus = atOrPast(["quoted", "closed_won", "closed_lost"]);
  const won = atOrPast(["closed_won"]);

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
      const closed = unitLeads.filter((l) => l.pipeline_stage === "closed_won").length;
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
