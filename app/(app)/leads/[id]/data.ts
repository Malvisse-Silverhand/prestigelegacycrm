import { createClient } from "@/lib/supabase/server";
import type { MalaysianState, LeadSource } from "@/lib/lead-constants";
import type { CurrentProfile } from "@/lib/profile-types";

export type LeadDetail = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  state: MalaysianState | null;
  postcode: string | null;
  agent_remark: string | null;
  date_of_birth: string | null;
  occupation: string | null;
  gender: "male" | "female" | null;
  is_smoker: boolean | null;
  lead_source: LeadSource | null;
  interest: string | null;
  budget_indicated: string | null;
  best_time_to_reach: string | null;
  status: string;
  pipeline_stage: string;
  agent_id: string | null;
  created_at: string;
  profiles: { full_name: string; units: { name: string } | null } | null;
};

export type ActivityRow = {
  id: string;
  activity_type: string;
  content: string | null;
  created_at: string;
  profiles: { full_name: string } | null;
};

export type QuotationPlanRow = {
  sort_order: number;
  plan_label: string;
  monthly_contribution: number | null;
  annual_contribution: number | null;
};

export type QuotationRow = {
  id: string;
  product: string;
  language: string | null;
  status: string;
  created_at: string;
  // Only the marker is read here -- a customizer-authored quotation is the
  // one that can be reopened for editing. The full payload stays server-side
  // until the tool asks for it via /api/quotations/[id].
  raw_payload: { __customizer?: boolean } | null;
  quotation_plans: QuotationPlanRow[];
};

export async function getLeadDetail(id: string) {
  const supabase = await createClient();

  const [{ data: lead }, { data: activity }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, full_name, phone, email, address, state, postcode, agent_remark, date_of_birth, occupation, gender, is_smoker, lead_source, interest, budget_indicated, best_time_to_reach, status, pipeline_stage, agent_id, created_at, profiles!leads_agent_id_fkey(full_name, units!profiles_unit_id_fkey(name))",
      )
      .eq("id", id)
      .single<LeadDetail>(),
    supabase
      .from("lead_activity")
      .select("id, activity_type, content, created_at, profiles(full_name)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .returns<ActivityRow[]>(),
  ]);

  return { lead, activity: activity ?? [] };
}

// Quotations saved against this lead, newest first, with their plan options
// so Lead Detail can show the figures without a second round trip.
export async function getLeadQuotations(leadId: string): Promise<QuotationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotations")
    .select(
      "id, product, language, status, created_at, raw_payload, quotation_plans(sort_order, plan_label, monthly_contribution, annual_contribution)",
    )
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .returns<QuotationRow[]>();

  return (data ?? []).map((q) => ({
    ...q,
    quotation_plans: [...(q.quotation_plans ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export type ReassignOption = { id: string; full_name: string; role: string };

// Scoped the same way as Settings' org-hierarchy assignment picker: an agent
// gets nothing (no subordinates, no self-service reassignment), a unit
// manager gets their own agents, a group manager gets the unit managers and
// agents under their units, superadmin gets everyone. "At or below the
// viewer's level" includes the viewer's own level, so the list always
// includes the viewer themself -- that's what makes "assign to Self" mean
// anything for an unassigned lead.
export async function getReassignableUsers(profile: CurrentProfile): Promise<ReassignOption[]> {
  const supabase = await createClient();

  if (profile.role === "agent") return [];

  // An Aspirant Unit Manager can only hand a lead to their own agents (or
  // take it themselves) -- the profiles RLS policy already narrows the query
  // to parent_id = them, so this needs no extra filter beyond self.
  if (profile.role === "aspirant_unit_manager") {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("unit_id", profile.unit_id)
      .in("role", ["aspirant_unit_manager", "agent"])
      .order("full_name");
    const rows = data ?? [];
    return rows.some((r) => r.id === profile.id)
      ? rows
      : [{ id: profile.id, full_name: profile.full_name, role: "aspirant_unit_manager" }, ...rows];
  }

  if (profile.role === "unit_manager") {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("unit_id", profile.unit_id)
      .in("role", ["unit_manager", "aspirant_unit_manager", "agent"])
      .order("full_name");
    return data ?? [];
  }

  if (profile.role === "group_manager") {
    const { data: units } = await supabase.from("units").select("id").eq("group_manager_id", profile.id);
    const unitIds = (units ?? []).map((u) => u.id);
    const scoped = unitIds.length
      ? await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("unit_id", unitIds)
          .in("role", ["unit_manager", "aspirant_unit_manager", "agent"])
          .order("full_name")
      : { data: [] as ReassignOption[] };
    return [{ id: profile.id, full_name: profile.full_name, role: "group_manager" }, ...(scoped.data ?? [])];
  }

  // superadmin: anyone
  const { data } = await supabase.from("profiles").select("id, full_name, role").order("full_name");
  return data ?? [];
}
