import { createClient } from "@/lib/supabase/server";
import type { MalaysianState, LeadSource } from "@/lib/lead-constants";

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

export async function getReassignableAgents(unitId: string | null) {
  const supabase = await createClient();
  let query = supabase.from("profiles").select("id, full_name").eq("role", "agent");
  if (unitId) query = query.eq("unit_id", unitId);
  const { data } = await query.order("full_name");
  return data ?? [];
}
