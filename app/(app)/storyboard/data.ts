import { createClient } from "@/lib/supabase/server";
import { quoteLauncherUrl } from "@/lib/quote-launcher";
import {
  headline,
  profileFromLead,
  STORYBOARD_MODULES,
  type LeadPrefill,
  type StoryboardModule,
} from "@/lib/storyboard/modules";
import type { Lang } from "@/lib/storyboard/i18n";

export type SessionStatus = "draft" | "presented" | "shared";

export type SessionListRow = {
  id: string;
  module: StoryboardModule;
  status: SessionStatus;
  lang: Lang;
  nickname: string;
  lead: { id: string; full_name: string } | null;
  gap: number;
  coveredPct: number;
  updated_at: string;
  presented_at: string | null;
};

export type StoryboardSession = {
  id: string;
  agent_id: string;
  module: StoryboardModule;
  engine_version: number;
  lang: Lang;
  profile: unknown;
  inputs: unknown;
  risk_flags: string[];
  notes: string | null;
  status: SessionStatus;
  presented_at: string | null;
  shared_via: string[];
  created_at: string;
  updated_at: string;
  lead: { id: string; full_name: string; phone: string | null; pipeline_stage: string } | null;
};

const PRACTICE_TTL_DAYS = 30;

// The agent's own sessions only -- leaders see their team's in Leader
// Insights, not mixed into their personal list. Practice sessions that were
// never attached to a lead are cleared here first: it's the page their owner
// opens, so the purge needs no scheduler.
export async function getMySessions(agentId: string, limit = 50): Promise<SessionListRow[]> {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - PRACTICE_TTL_DAYS * 86_400_000).toISOString();
  await supabase
    .from("storyboard_sessions")
    .delete()
    .eq("agent_id", agentId)
    .is("lead_id", null)
    .lt("updated_at", cutoff);

  const { data } = await supabase
    .from("storyboard_sessions")
    .select("id, module, status, lang, profile, result, updated_at, presented_at, leads(id, full_name)")
    .eq("agent_id", agentId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((s) => {
    const h = headline(s.module as StoryboardModule, s.result);
    return {
      id: s.id as string,
      module: s.module as StoryboardModule,
      status: s.status as SessionStatus,
      lang: s.lang as Lang,
      nickname: ((s.profile as { nickname?: string } | null)?.nickname ?? "").trim(),
      lead: (s.leads as unknown as { id: string; full_name: string } | null) ?? null,
      gap: h.gap,
      coveredPct: h.coveredPct,
      updated_at: s.updated_at as string,
      presented_at: (s.presented_at as string | null) ?? null,
    };
  });
}

export async function getSession(id: string): Promise<StoryboardSession | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("storyboard_sessions")
    .select(
      "id, agent_id, module, engine_version, lang, profile, inputs, risk_flags, notes, status, presented_at, shared_via, created_at, updated_at, leads(id, full_name, phone, pipeline_stage)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    ...(data as unknown as Omit<StoryboardSession, "lead">),
    lead: (data.leads as unknown as StoryboardSession["lead"]) ?? null,
  };
}

// What a new session is prefilled with. Relatives saved on the lead stand in
// for dependants -- an estimate the agent corrects in the first scene.
export async function getLeadPrefill(leadId: string) {
  const supabase = await createClient();
  const [{ data: lead }, { count }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, full_name, phone, date_of_birth, gender, marital_status, occupation, occupation_class, is_smoker")
      .eq("id", leadId)
      .maybeSingle(),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("parent_lead_id", leadId),
  ]);
  if (!lead) return null;
  return {
    id: lead.id as string,
    full_name: lead.full_name as string,
    profile: profileFromLead({ ...(lead as unknown as Omit<LeadPrefill, "dependants">), dependants: count ?? 0 }),
  };
}

export async function getAgentContact(agentId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name, phone, mta_number").eq("id", agentId).maybeSingle();
  return {
    name: (data?.full_name as string | undefined) ?? "",
    phone: (data?.phone as string | null | undefined) ?? null,
    mta: (data?.mta_number as string | null | undefined) ?? null,
  };
}

export type QuoteHandoff = {
  /** The module's calculator, prefilled from the lead and signed with the agent. */
  url: string;
  /** Quotations saved on the lead since this session started -- the handoff's outcome. */
  since: { id: string; product: string; updated_at: string; plan: string | null; monthly: number | null }[];
};

// The calculators save quotations against the lead themselves (capture-quotation),
// so the link back to a session is by time: anything saved on the lead after
// the session began came out of this conversation.
export async function getQuoteHandoff(
  leadId: string,
  sessionStartedAt: string,
  tool: string,
  agent: { name: string; mta: string | null },
): Promise<QuoteHandoff | null> {
  const supabase = await createClient();
  const [{ data: lead }, { data: quotes }] = await Promise.all([
    supabase.from("leads").select("id, full_name, phone, email, date_of_birth, gender, is_smoker").eq("id", leadId).maybeSingle(),
    supabase
      .from("quotations")
      .select("id, product, updated_at, quotation_plans(sort_order, plan_label, monthly_contribution)")
      .eq("lead_id", leadId)
      .gte("updated_at", sessionStartedAt)
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);
  if (!lead) return null;

  const url = new URL(quoteLauncherUrl(tool, lead as Parameters<typeof quoteLauncherUrl>[1]), "http://x");
  if (agent.name) url.searchParams.set("an", agent.name);
  if (agent.mta) url.searchParams.set("mta", agent.mta);

  return {
    url: `${url.pathname}${url.search}`,
    since: (quotes ?? []).map((q) => {
      const plans = [...((q.quotation_plans as { sort_order: number; plan_label: string | null; monthly_contribution: number | null }[]) ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      return {
        id: q.id as string,
        product: q.product as string,
        updated_at: q.updated_at as string,
        plan: plans[0]?.plan_label ?? null,
        monthly: plans[0]?.monthly_contribution ?? null,
      };
    }),
  };
}

export type MyInsights = {
  total: number;
  presented: number;
  practice: number;
  presentedThisWeek: number;
  presentedThisMonth: number;
  byModule: Record<StoryboardModule, number>;
  avgGapPresented: number;
  leadsPresented: number;
  leadsConverted: number;
  last14Days: { date: string; count: number }[];
};

const CONVERTED_STAGES = new Set(["submission", "closed_won", "servicing"]);

// My Insights: the signed-in agent's own sessions and nothing else. Leaders
// get their team's figures on /team/storyboard; this page never widens.
export async function getMyInsights(agentId: string, todayKey: string): Promise<MyInsights> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("storyboard_sessions")
    .select("module, status, presented_at, lead_id, result, leads(pipeline_stage)")
    .eq("agent_id", agentId)
    .limit(5000);
  const rows = data ?? [];

  const today = new Date(`${todayKey}T00:00:00+08:00`);
  const weekStart = new Date(today.getTime() - 6 * 86_400_000);
  const monthStart = new Date(`${todayKey.slice(0, 7)}-01T00:00:00+08:00`);
  const dayKey = (iso: string) => new Date(new Date(iso).getTime() + 8 * 3_600_000).toISOString().slice(0, 10);

  const byModule = Object.fromEntries(STORYBOARD_MODULES.map((m) => [m, 0])) as Record<StoryboardModule, number>;
  const perDay = new Map<string, number>();
  const leadsPresented = new Set<string>();
  const leadsConverted = new Set<string>();
  let presented = 0;
  let practice = 0;
  let week = 0;
  let month = 0;
  let gapSum = 0;

  for (const r of rows) {
    const module = r.module as StoryboardModule;
    if (module in byModule) byModule[module]++;
    if (!r.lead_id) practice++;
    if (!r.presented_at) continue;
    presented++;
    const at = new Date(r.presented_at as string);
    if (at >= weekStart) week++;
    if (at >= monthStart) month++;
    gapSum += headline(module, r.result).gap;
    const k = dayKey(r.presented_at as string);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
    if (r.lead_id) {
      leadsPresented.add(r.lead_id as string);
      const stage = (r.leads as unknown as { pipeline_stage: string } | null)?.pipeline_stage;
      if (stage && CONVERTED_STAGES.has(stage)) leadsConverted.add(r.lead_id as string);
    }
  }

  const last14Days = Array.from({ length: 14 }, (_, n) => {
    const d = new Date(today.getTime() - (13 - n) * 86_400_000);
    const key = dayKey(d.toISOString());
    return { date: key, count: perDay.get(key) ?? 0 };
  });

  return {
    total: rows.length,
    presented,
    practice,
    presentedThisWeek: week,
    presentedThisMonth: month,
    byModule,
    avgGapPresented: presented ? Math.round(gapSum / presented) : 0,
    leadsPresented: leadsPresented.size,
    leadsConverted: leadsConverted.size,
    last14Days,
  };
}
