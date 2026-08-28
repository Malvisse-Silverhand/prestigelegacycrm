import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/lib/profile-types";
import { computeAgentMetrics, type MinimalLead, type MinimalActivity } from "./metrics";

export type TeamMember = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  unit_id: string | null;
  is_active: boolean;
  avatar_initials: string | null;
  created_at: string;
  last_activity_at: string | null;
};

async function fetchLeadsAndActivity(unitIds: string[] | null) {
  const supabase = await createClient();
  let leadsQuery = supabase
    .from("leads")
    .select("id, agent_id, unit_id, pipeline_stage, is_stale, created_at");
  if (unitIds) leadsQuery = leadsQuery.in("unit_id", unitIds);

  const { data: leads } = await leadsQuery.returns<MinimalLead[]>();
  const leadIds = (leads ?? []).map((l) => l.id);

  let activities: MinimalActivity[] = [];
  if (leadIds.length > 0) {
    const { data } = await supabase
      .from("lead_activity")
      .select("lead_id, activity_type, created_at")
      .in("lead_id", leadIds)
      .returns<MinimalActivity[]>();
    activities = data ?? [];
  }

  return { leads: leads ?? [], activities };
}

export type UnitTargetRow = { agentId: string; fullName: string; ancTarget: number | null; nocTarget: number | null };

export function currentMonthDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

// Scoped exactly like the leads/quotations pattern: only agents in the unit
// manager's own unit -- matches the "targets" RLS write policy.
export async function getUnitManagerTargets(profile: CurrentProfile, monthDate: string): Promise<UnitTargetRow[]> {
  if (!profile.unit_id) return [];
  const supabase = await createClient();

  const { data: agents } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "agent")
    .eq("unit_id", profile.unit_id)
    .order("full_name");

  const agentIds = (agents ?? []).map((a) => a.id);
  let targets: { agent_id: string; anc_target: number | null; noc_target: number | null }[] = [];
  if (agentIds.length > 0) {
    const { data } = await supabase
      .from("targets")
      .select("agent_id, anc_target, noc_target")
      .eq("month", monthDate)
      .in("agent_id", agentIds);
    targets = data ?? [];
  }
  const byAgent = new Map(targets.map((t) => [t.agent_id, t]));

  return (agents ?? []).map((a) => ({
    agentId: a.id,
    fullName: a.full_name,
    ancTarget: byAgent.get(a.id)?.anc_target ?? null,
    nocTarget: byAgent.get(a.id)?.noc_target ?? null,
  }));
}

export async function getUnitManagerTeam(profile: CurrentProfile) {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, unit_id, is_active, avatar_initials, created_at, last_activity_at")
    .eq("unit_id", profile.unit_id)
    .eq("role", "agent")
    .order("full_name")
    .returns<TeamMember[]>();

  const { leads, activities } = await fetchLeadsAndActivity(profile.unit_id ? [profile.unit_id] : null);
  const metrics = computeAgentMetrics(leads, activities);
  const unassignedPool = leads.filter((l) => !l.agent_id).length;

  return { members: members ?? [], metrics, unassignedPool, totalUnitLeads: leads.length };
}

export type UnitLeague = {
  unitManager: TeamMember;
  unitId: string;
  unitName: string;
  agents: TeamMember[];
};

export async function getGroupManagerLeague(profile: CurrentProfile) {
  const supabase = await createClient();

  let unitsQuery = supabase.from("units").select("id, name, group_manager_id").order("name");
  if (profile.role === "group_manager") unitsQuery = unitsQuery.eq("group_manager_id", profile.id);
  const { data: units } = await unitsQuery;

  const unitIds = (units ?? []).map((u) => u.id);
  if (unitIds.length === 0) return { units: units ?? [], leagues: [], leads: [], activities: [] };

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, unit_id, is_active, avatar_initials, created_at, last_activity_at")
    .in("unit_id", unitIds)
    .in("role", ["unit_manager", "agent"])
    .order("full_name")
    .returns<TeamMember[]>();

  const { leads, activities } = await fetchLeadsAndActivity(unitIds);

  const leagues: UnitLeague[] = [];
  for (const unit of units ?? []) {
    const unitManager = (members ?? []).find((m) => m.role === "unit_manager" && m.unit_id === unit.id);
    if (!unitManager) continue;
    const agents = (members ?? []).filter((m) => m.role === "agent" && m.unit_id === unit.id);
    leagues.push({ unitManager, unitId: unit.id, unitName: unit.name, agents });
  }

  return { units: units ?? [], leagues, leads, activities };
}
