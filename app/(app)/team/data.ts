import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/lib/profile-types";
import { computeAgentMetrics, type MinimalLead, type MinimalActivity } from "./metrics";
import { getStaleAfterDays } from "@/lib/staleness-server";
import { malaysiaDayKey } from "@/lib/malaysia-date";

export { getStaleAfterDays };

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
    .select("id, agent_id, unit_id, pipeline_stage, created_at");
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
  // Malaysia's calendar month, not the server's UTC one -- see lib/malaysia-date.
  return `${malaysiaDayKey().slice(0, 7)}-01`;
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

  const [{ leads, activities }, staleAfterDays] = await Promise.all([
    fetchLeadsAndActivity(profile.unit_id ? [profile.unit_id] : null),
    getStaleAfterDays(),
  ]);
  const metrics = computeAgentMetrics(leads, activities, staleAfterDays);
  const unassignedPool = leads.filter((l) => !l.agent_id).length;

  return { members: members ?? [], metrics, unassignedPool, totalUnitLeads: leads.length };
}

// One box in the league: a manager, the people reporting straight to them, and
// the managers reporting to them in turn. A node with no manager is a unit
// nobody runs yet, or the catch-all for people the org chart has lost track of.
export type LeagueNode = {
  key: string;
  manager: TeamMember | null;
  title: string;
  subtitle: string;
  unitId: string | null;
  // Direct reports that aren't themselves a node below.
  agents: TeamMember[];
  children: LeagueNode[];
  // Everyone in this subtree, manager included -- what the row's numbers are
  // rolled up from.
  memberIds: string[];
};

const MANAGED_ROLES = ["group_manager", "unit_manager", "aspirant_unit_manager", "agent"];

function collectIds(node: LeagueNode): string[] {
  return [
    ...(node.manager ? [node.manager.id] : []),
    ...node.agents.map((a) => a.id),
    ...node.children.flatMap(collectIds),
  ];
}

function finalise(node: Omit<LeagueNode, "memberIds">): LeagueNode {
  const full = { ...node, memberIds: [] as string[] };
  full.memberIds = collectIds(full);
  return full;
}

// Builds the org chart the viewer is entitled to see.
//
// This used to be keyed entirely on units: a unit with no Unit Manager was
// skipped, and anyone without a unit was never fetched at all. In a structure
// where agents report straight to a Group Manager -- which is most of them --
// that hid the majority of the org from the people who are supposed to be
// watching it. So nothing here filters on having a unit, and whoever is left
// over at the end still gets rendered, in an "unassigned" box, rather than
// silently disappearing.
export async function getOrgLeague(profile: CurrentProfile) {
  const supabase = await createClient();

  let unitsQuery = supabase.from("units").select("id, name, group_manager_id").order("name");
  if (profile.role === "group_manager") unitsQuery = unitsQuery.eq("group_manager_id", profile.id);
  const { data: units } = await unitsQuery;

  // No unit filter: RLS already limits a Group Manager to their own units plus
  // their direct reports, and a SuperAdmin is meant to see everyone.
  const { data: peopleRaw } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, unit_id, parent_id, is_active, avatar_initials, created_at, last_activity_at")
    .in("role", MANAGED_ROLES)
    .order("full_name")
    .returns<(TeamMember & { parent_id: string | null })[]>();
  const people = peopleRaw ?? [];

  // Leads come back RLS-scoped too. Filtering by unit here would have dropped
  // every lead belonging to an agent who has no unit.
  const { leads, activities } = await fetchLeadsAndActivity(null);

  const placed = new Set<string>();
  const claim = (p: { id: string }) => {
    placed.add(p.id);
    return p;
  };
  const isAgentish = (p: { role: string }) => p.role === "agent" || p.role === "aspirant_unit_manager";

  // An Aspirant UM only becomes a box of its own once someone reports to them;
  // otherwise they stay a card in their unit, badged AUM, as before.
  function aspirantNodes(candidates: (TeamMember & { parent_id: string | null })[]): LeagueNode[] {
    return candidates
      .filter((a) => a.role === "aspirant_unit_manager" && people.some((p) => p.parent_id === a.id && p.id !== a.id))
      .map((aum) => {
        claim(aum);
        const reports = people.filter((p) => p.parent_id === aum.id && p.id !== aum.id && isAgentish(p));
        reports.forEach(claim);
        return finalise({
          key: `aum-${aum.id}`,
          manager: aum,
          title: aum.full_name,
          subtitle: "Aspirant Unit Manager",
          unitId: aum.unit_id,
          agents: reports,
          children: [],
        });
      });
  }

  function unitNode(unit: { id: string; name: string }): LeagueNode {
    const inUnit = people.filter((p) => p.unit_id === unit.id);
    const manager = inUnit.find((p) => p.role === "unit_manager") ?? null;
    if (manager) claim(manager);
    const children = aspirantNodes(inUnit);
    const agents = inUnit.filter((p) => isAgentish(p) && !placed.has(p.id));
    agents.forEach(claim);
    return finalise({
      key: `unit-${unit.id}`,
      manager,
      title: manager?.full_name ?? unit.name,
      subtitle: manager ? unit.name : "No Unit Manager assigned",
      unitId: unit.id,
      agents,
      children,
    });
  }

  const roots: LeagueNode[] = [];

  if (profile.role === "superadmin") {
    for (const gm of people.filter((p) => p.role === "group_manager")) {
      claim(gm);
      const gmUnits = (units ?? []).filter((u) => u.group_manager_id === gm.id);
      const children = gmUnits.map(unitNode);
      // Agents reporting to the Group Manager with no unit in between -- the
      // group this view used to lose entirely.
      const direct = people.filter((p) => p.parent_id === gm.id && isAgentish(p) && !placed.has(p.id));
      const aumChildren = aspirantNodes(direct);
      const agents = direct.filter((p) => !placed.has(p.id));
      agents.forEach(claim);
      roots.push(
        finalise({
          key: `gm-${gm.id}`,
          manager: gm,
          title: gm.full_name,
          subtitle: "Group Manager",
          unitId: null,
          agents,
          children: [...children, ...aumChildren],
        }),
      );
    }
    // Units with no Group Manager over them still have to appear.
    for (const unit of (units ?? []).filter((u) => !u.group_manager_id)) roots.push(unitNode(unit));
  } else {
    // A Group Manager looking at their own group: their units, then anyone
    // reporting straight to them.
    for (const unit of units ?? []) roots.push(unitNode(unit));
    const direct = people.filter((p) => p.parent_id === profile.id && isAgentish(p) && !placed.has(p.id));
    const aumChildren = aspirantNodes(direct);
    const agents = direct.filter((p) => !placed.has(p.id));
    agents.forEach(claim);
    if (agents.length > 0 || aumChildren.length > 0) {
      roots.push(
        finalise({
          key: "direct",
          manager: null,
          title: "Reporting directly to you",
          subtitle: "No unit",
          unitId: null,
          agents,
          children: aumChildren,
        }),
      );
    }
  }

  // The safety net. Whatever the org chart looks like, anyone the rules above
  // did not place is still shown rather than quietly dropped -- that failure
  // mode is what made this view untrustworthy in the first place.
  const leftover = people.filter(
    (p) => !placed.has(p.id) && p.id !== profile.id && (isAgentish(p) || p.role === "unit_manager"),
  );
  if (leftover.length > 0) {
    roots.push(
      finalise({
        key: "unassigned",
        manager: null,
        title: "Not attached to a unit or manager",
        subtitle: "Assign these people in Settings › Users & Hierarchy",
        unitId: null,
        agents: leftover,
        children: [],
      }),
    );
  }

  return { roots, leads, activities };
}
