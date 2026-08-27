import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/lib/profile-types";

export type ScopeUnit = { id: string; name: string; group_manager_id: string | null };

// Superadmin sees every unit; a group manager sees only the units they manage.
async function unitsInScope(profile: CurrentProfile): Promise<ScopeUnit[]> {
  const supabase = await createClient();
  let query = supabase.from("units").select("id, name, group_manager_id").order("name");
  if (profile.role === "group_manager") query = query.eq("group_manager_id", profile.id);
  const { data } = await query;
  return data ?? [];
}

export type OrgPerson = { id: string; full_name: string; email: string };
export type OrgUnit = { id: string; name: string; unitManager: OrgPerson | null; agentCount: number };
export type OrgGroupManager = { id: string; full_name: string; email: string; units: OrgUnit[] };
export type OrgTree = {
  superadmins: OrgPerson[];
  groupManagers: OrgGroupManager[];
  roleCounts: { superadmin: number; group_manager: number; unit_manager: number; agent: number };
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
          .select("id, full_name, email, role, unit_id")
          .in("unit_id", unitIds)
          .in("role", ["unit_manager", "agent"])
      : Promise.resolve({ data: [] }),
  ]);

  const groupManagers: OrgGroupManager[] = (allGroupManagers ?? []).map((gm) => {
    const gmUnits = units.filter((u) => u.group_manager_id === gm.id);
    return {
      id: gm.id,
      full_name: gm.full_name,
      email: gm.email,
      units: gmUnits.map((u) => {
        const unitManager = (members ?? []).find((m) => m.role === "unit_manager" && m.unit_id === u.id) ?? null;
        const agentCount = (members ?? []).filter((m) => m.role === "agent" && m.unit_id === u.id).length;
        return { id: u.id, name: u.name, unitManager, agentCount };
      }),
    };
  });

  const roleCounts = {
    superadmin: (superadmins ?? []).length,
    group_manager: groupManagers.length,
    unit_manager: (members ?? []).filter((m) => m.role === "unit_manager").length,
    agent: (members ?? []).filter((m) => m.role === "agent").length,
  };

  return { superadmins: superadmins ?? [], groupManagers, roleCounts };
}

export type UnitManagerOption = { id: string; full_name: string; unitName: string };
export type UnitOption = { id: string; name: string; groupManagerName: string | null };

// Options for the "Assigned under" field on the Add User form -- scoped the
// same way as the org tree so a group manager can only place new users inside
// units they actually manage.
export async function getAssignmentOptions(profile: CurrentProfile) {
  const supabase = await createClient();
  const units = await unitsInScope(profile);
  const unitIds = units.map((u) => u.id);
  if (unitIds.length === 0) return { unitManagers: [] as UnitManagerOption[], units: [] as UnitOption[] };

  const { data: unitManagers } = await supabase
    .from("profiles")
    .select("id, full_name, unit_id")
    .eq("role", "unit_manager")
    .in("unit_id", unitIds);

  const unitById = new Map(units.map((u) => [u.id, u.name]));
  return {
    unitManagers: (unitManagers ?? []).map((m) => ({
      id: m.id,
      full_name: m.full_name,
      unitName: unitById.get(m.unit_id ?? "") ?? "Unknown unit",
    })),
    units: units.map((u) => ({ id: u.id, name: u.name, groupManagerName: null })),
  };
}

export type TargetRow = { agentId: string; fullName: string; ancTarget: number | null; nocTarget: number | null };

export async function getTargetsForMonth(profile: CurrentProfile, monthDate: string): Promise<TargetRow[]> {
  const supabase = await createClient();
  const units = await unitsInScope(profile);
  const unitIds = units.map((u) => u.id);
  if (unitIds.length === 0) return [];

  const { data: agents } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "agent")
    .in("unit_id", unitIds)
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
