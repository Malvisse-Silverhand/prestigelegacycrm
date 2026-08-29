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

  if (profile.role === "unit_manager") {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("unit_id", profile.unit_id)
      .in("role", ["unit_manager", "agent"])
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
          .in("role", ["unit_manager", "agent"])
          .order("full_name")
      : { data: [] as ReassignOption[] };
    return [{ id: profile.id, full_name: profile.full_name, role: "group_manager" }, ...(scoped.data ?? [])];
  }

  // superadmin: anyone
  const { data } = await supabase.from("profiles").select("id, full_name, role").order("full_name");
  return data ?? [];
}
