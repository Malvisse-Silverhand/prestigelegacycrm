import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/lib/profile-types";

export type ScopeUnit = { id: string; name: string; group_manager_id: string | null };

// Superadmin sees every unit; a group manager only the units they manage; a
// unit manager only their own (they can now invite into it -- see
// canManageSettings in ./actions).
async function unitsInScope(profile: CurrentProfile): Promise<ScopeUnit[]> {
  const supabase = await createClient();
  let query = supabase.from("units").select("id, name, group_manager_id").order("name");
  if (profile.role === "group_manager") query = query.eq("group_manager_id", profile.id);
  else if (profile.role === "unit_manager") {
    if (!profile.unit_id) return [];
    query = query.eq("id", profile.unit_id);
  }
  const { data } = await query;
  return data ?? [];
}

export type OrgPerson = { id: string; full_name: string; email: string };
// An Aspirant Unit Manager runs a sub-team inside a unit, so it renders as
// its own branch with the agents reporting to it nested underneath.
export type OrgAspirant = { id: string; full_name: string; email: string; agents: OrgPerson[] };
export type OrgUnit = {
  id: string;
  name: string;
  unitManager: OrgPerson | null;
  aspirants: OrgAspirant[];
  agents: OrgPerson[];
};
// People reporting straight to a Group Manager have no unit, so they hang off
// the group manager itself rather than off one of its units.
export type OrgGroupManager = {
  id: string;
  full_name: string;
  email: string;
  units: OrgUnit[];
  directAgents: OrgPerson[];
};
export type OrgTree = {
  superadmins: OrgPerson[];
  groupManagers: OrgGroupManager[];
  roleCounts: {
    superadmin: number;
    group_manager: number;
    unit_manager: number;
    aspirant_unit_manager: number;
    agent: number;
  };
};

export async function getOrgTree(profile: CurrentProfile): Promise<OrgTree> {
  const supabase = await createClient();
  const units = await unitsInScope(profile);
  const unitIds = units.map((u) => u.id);

  const [{ data: superadmins }, { data: allGroupManagers }, { data: members }] = await Promise.all([
    profile.role === "superadmin"
      ? supabase.from("profiles").select("id, full_name, email").eq("role", "superadmin").order("full_name")
      : Promise.resolve({ data: [] as OrgPerson[] }),
    profile.role === "superadmin"
      ? supabase.from("profiles").select("id, full_name, email").eq("role", "group_manager").order("full_name")
      : supabase.from("profiles").select("id, full_name, email").eq("id", profile.id),
    unitIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name, email, role, unit_id, parent_id")
          .in("unit_id", unitIds)
          .in("role", ["unit_manager", "aspirant_unit_manager", "agent"])
      : Promise.resolve({ data: [] }),
  ]);

  const all = members ?? [];

  // Direct reports of the group managers in scope. These have unit_id = null,
  // so the unit-scoped `members` query above can never return them.
  const gmIds = (allGroupManagers ?? []).map((g) => g.id);
  const { data: directReports } = gmIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, role, parent_id")
        .in("parent_id", gmIds)
        .in("role", ["agent", "aspirant_unit_manager"])
        .is("unit_id", null)
        .order("full_name")
    : { data: [] as { id: string; full_name: string; email: string; role: string; parent_id: string | null }[] };

  const groupManagers: OrgGroupManager[] = (allGroupManagers ?? []).map((gm) => {
    const gmUnits = units.filter((u) => u.group_manager_id === gm.id);
    return {
      id: gm.id,
      full_name: gm.full_name,
      email: gm.email,
      units: gmUnits.map((u) => {
        const unitManager = all.find((m) => m.role === "unit_manager" && m.unit_id === u.id) ?? null;
        const unitAgents = all.filter((m) => m.role === "agent" && m.unit_id === u.id);

        const aspirants: OrgAspirant[] = all
          .filter((m) => m.role === "aspirant_unit_manager" && m.unit_id === u.id)
          .map((a) => ({
            id: a.id,
            full_name: a.full_name,
            email: a.email,
            agents: unitAgents
              .filter((m) => m.parent_id === a.id)
              .map((m) => ({ id: m.id, full_name: m.full_name, email: m.email })),
          }));

        // Only agents not already shown under an aspirant, so nobody appears twice.
        const aspirantIds = new Set(aspirants.map((a) => a.id));
        const agents = unitAgents
          .filter((m) => !m.parent_id || !aspirantIds.has(m.parent_id))
          .map((m) => ({ id: m.id, full_name: m.full_name, email: m.email }));

        return { id: u.id, name: u.name, unitManager, aspirants, agents };
      }),
      directAgents: (directReports ?? [])
        .filter((r) => r.parent_id === gm.id)
        .map((r) => ({ id: r.id, full_name: r.full_name, email: r.email })),
    };
  });

  const roleCounts = {
    superadmin: (superadmins ?? []).length,
    group_manager: groupManagers.length,
    unit_manager: all.filter((m) => m.role === "unit_manager").length,
    aspirant_unit_manager:
      all.filter((m) => m.role === "aspirant_unit_manager").length +
      (directReports ?? []).filter((r) => r.role === "aspirant_unit_manager").length,
    agent:
      all.filter((m) => m.role === "agent").length +
      (directReports ?? []).filter((r) => r.role === "agent").length,
  };

  return { superadmins: superadmins ?? [], groupManagers, roleCounts };
}

// `role` lets the form show only valid supervisors for the role being
// created: an agent may sit under a Unit Manager or an Aspirant Unit
// Manager, an Aspirant Unit Manager only under a Unit Manager.
export type UnitManagerOption = {
  id: string;
  full_name: string;
  unitName: string;
  role: "group_manager" | "unit_manager" | "aspirant_unit_manager";
};
export type UnitOption = { id: string; name: string; groupManagerName: string | null };

// Options for the "Assigned under" field on the Add User form -- scoped the
// same way as the org tree so a group manager can only place new users inside
// units they actually manage.
export async function getAssignmentOptions(profile: CurrentProfile) {
  const supabase = await createClient();
  const units = await unitsInScope(profile);
  const unitIds = units.map((u) => u.id);

  // Unit-based supervisors (Unit Managers / Aspirant UMs)...
  const { data: unitSupervisors } = unitIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, unit_id, role")
        .in("role", ["unit_manager", "aspirant_unit_manager"])
        .in("unit_id", unitIds)
    : { data: [] as { id: string; full_name: string; unit_id: string | null; role: string }[] };

  // ...plus Group Managers, who can now hold people directly and have no unit.
  // A group manager can only ever assign under themselves.
  let gmQuery = supabase.from("profiles").select("id, full_name, unit_id, role").eq("role", "group_manager");
  if (profile.role === "group_manager") gmQuery = gmQuery.eq("id", profile.id);
  const { data: groupManagers } = profile.role === "unit_manager" ? { data: [] } : await gmQuery;

  const unitById = new Map(units.map((u) => [u.id, u.name]));
  const all = [...(groupManagers ?? []), ...(unitSupervisors ?? [])];

  return {
    unitManagers: all.map((m) => ({
      id: m.id,
      full_name: m.full_name,
      unitName: m.role === "group_manager" ? "" : unitById.get(m.unit_id ?? "") ?? "Unknown unit",
      role: m.role as "group_manager" | "unit_manager" | "aspirant_unit_manager",
    })),
    units: units.map((u) => ({ id: u.id, name: u.name, groupManagerName: null })),
  };
}

export type TargetRow = { agentId: string; fullName: string; ancTarget: number | null; nocTarget: number | null };

// Whose targets this profile may set. Superadmin and Group Managers cover
// everyone in their scope; a Unit Manager or Aspirant Unit Manager may only
// set targets for the agents reporting directly to them, not for everyone
// who happens to share their unit.
export async function getTargetableAgents(
  profile: CurrentProfile,
): Promise<{ id: string; full_name: string }[]> {
  const supabase = await createClient();

  if (profile.role === "unit_manager" || profile.role === "aspirant_unit_manager") {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "agent")
      .eq("parent_id", profile.id)
      .order("full_name");
    return data ?? [];
  }

  const units = await unitsInScope(profile);
  const unitIds = units.map((u) => u.id);
  if (unitIds.length === 0) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "agent")
    .in("unit_id", unitIds)
    .order("full_name");
  return data ?? [];
}

export async function getTargetsForMonth(profile: CurrentProfile, monthDate: string): Promise<TargetRow[]> {
  const supabase = await createClient();
  const agents = await getTargetableAgents(profile);
  if (agents.length === 0) return [];

  const agentIds = agents.map((a) => a.id);
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

  return agents.map((a) => ({
    agentId: a.id,
    fullName: a.full_name,
    ancTarget: byAgent.get(a.id)?.anc_target ?? null,
    nocTarget: byAgent.get(a.id)?.noc_target ?? null,
  }));
}

export type DistributionSettings = {
  id: string | null;
  roundRobinEnabled: boolean;
  staleAfterDays: number;
  reassignRequiresApproval: boolean;
};

export async function getDistributionSettings(): Promise<DistributionSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("distribution_settings")
    .select("id, round_robin_enabled, stale_after_days, reassign_requires_approval")
    .is("unit_id", null)
    .maybeSingle();

  if (!data) return { id: null, roundRobinEnabled: true, staleAfterDays: 3, reassignRequiresApproval: true };
  return {
    id: data.id,
    roundRobinEnabled: data.round_robin_enabled,
    staleAfterDays: data.stale_after_days,
    reassignRequiresApproval: data.reassign_requires_approval,
  };
}

export type AuditEntry = {
  id: string;
  action: string;
  createdAt: string;
  actorName: string | null;
  targetName: string | null;
  metadata: Record<string, unknown> | null;
};

export async function getAuditLog(profile: CurrentProfile): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const units = await unitsInScope(profile);
  const unitIds = units.map((u) => u.id);

  let inScopeIds: string[] | null = null;
  if (profile.role === "group_manager") {
    const { data: members } = await supabase.from("profiles").select("id").in("unit_id", unitIds);
    inScopeIds = [profile.id, ...(members ?? []).map((m) => m.id)];
  }

  let query = supabase
    .from("audit_log")
    .select(
      "id, action, metadata, created_at, actor:profiles!audit_log_actor_id_fkey(full_name), target:profiles!audit_log_target_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (inScopeIds) query = query.or(`actor_id.in.(${inScopeIds.join(",")}),target_id.in.(${inScopeIds.join(",")})`);

  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    createdAt: row.created_at,
    actorName: (row.actor as unknown as { full_name: string } | null)?.full_name ?? null,
    targetName: (row.target as unknown as { full_name: string } | null)?.full_name ?? null,
    metadata: row.metadata as Record<string, unknown> | null,
  }));
}

export type LeadSourceStat = { source: string; count: number; closedWon: number };

export async function getLeadSourceStats(profile: CurrentProfile): Promise<LeadSourceStat[]> {
  const supabase = await createClient();
  const units = await unitsInScope(profile);
  const unitIds = units.map((u) => u.id);

  let query = supabase.from("leads").select("lead_source, pipeline_stage");
  if (profile.role === "group_manager") {
    if (unitIds.length === 0) return [];
    query = query.in("unit_id", unitIds);
  }
  const { data } = await query;

  const map = new Map<string, LeadSourceStat>();
  for (const lead of data ?? []) {
    const key = lead.lead_source || "Unknown";
    const entry = map.get(key) ?? { source: key, count: 0, closedWon: 0 };
    entry.count++;
    if (lead.pipeline_stage === "closed_won") entry.closedWon++;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
