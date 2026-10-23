"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getReassignableUsers } from "@/app/(app)/leads/[id]/data";
import { notify } from "@/lib/appointment-reminders";
import { computeTargets, sanitizeAllocation } from "@/lib/rebalance-targets";
import { queueLeadAssignedEmail } from "@/lib/lead-assignment-email";

export type RebalanceMember = {
  id: string;
  name: string;
  initials: string;
  current: number;
  target: number;
  targetPct: number;
  delta: number;
};

export type RebalancePlan = {
  members: RebalanceMember[];
  // Leads that will actually change hands.
  moves: number;
  // Currently owned by nobody, or by someone deactivated / outside the team.
  unassigned: number;
  total: number;
  error: string | null;
};

// Only work still in play is rebalanced. Moving a closed client away from the
// agent who sold it would rewrite who earned the sale and corrupt every
// closing figure in the CRM, so won and lost business stays put.
const REBALANCEABLE_STAGES = ["new", "contacted", "follow_up", "quoted", "appointment"];

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

type Candidate = { id: string; name: string; initials: string };
type LeadLite = {
  id: string;
  agent_id: string | null;
  created_at: string;
  full_name: string;
  interest: string | null;
  lead_source: string | null;
};

// The plan is always computed here, never sent up from the browser: an
// approved preview and the write that follows must be derived from the same
// server-side rules, or a hand-crafted request could reassign anything. What
// the browser does send is only the manager's *request* (even / percent /
// count per person), which is re-validated against the real team and the real
// lead count before it is turned into targets.
type BuiltPlan =
  | { plan: RebalancePlan; leads: LeadLite[]; byOwner: Map<string, LeadLite[]>; pool: LeadLite[] }
  | { plan: RebalancePlan; leads: null; byOwner?: undefined; pool?: undefined };

async function buildPlan(rawAllocation?: unknown): Promise<BuiltPlan> {
  const empty = (error: string | null): RebalancePlan => ({
    members: [], moves: 0, unassigned: 0, total: 0, error,
  });

  const profile = await getCurrentProfile();
  if (!profile || profile.role === "agent") {
    return { plan: empty("You don't have permission to rebalance leads."), leads: null };
  }

  const allocation = sanitizeAllocation(rawAllocation);
  if (!allocation) return { plan: empty("That rebalance request wasn't valid. Please try again."), leads: null };

  // Already scoped to the caller's team and filtered to is_active = true, so
  // deactivated members can never be handed work -- the same list the Lead
  // Detail reassign picker offers.
  const candidates: Candidate[] = (await getReassignableUsers(profile)).map((u) => ({
    id: u.id,
    name: u.full_name,
    initials: initialsOf(u.full_name),
  }));
  if (candidates.length === 0) {
    return { plan: empty("There are no active team members to distribute leads to."), leads: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, agent_id, created_at, full_name, interest, lead_source")
    .in("pipeline_stage", REBALANCEABLE_STAGES)
    .order("created_at", { ascending: false });

  if (error) {
    Sentry.captureException(error, { tags: { action: "rebalance", step: "load" } });
    return { plan: empty("Couldn't read the current lead distribution. Please try again."), leads: null };
  }

  const leads = (data ?? []) as LeadLite[];
  const candidateIds = new Set(candidates.map((c) => c.id));

  // Newest first within each owner, so a surplus is shed from the leads least
  // worked rather than from a relationship someone has been nurturing.
  const byOwner = new Map<string, LeadLite[]>();
  const pool: LeadLite[] = [];
  for (const l of leads) {
    if (l.agent_id && candidateIds.has(l.agent_id)) {
      const list = byOwner.get(l.agent_id);
      if (list) list.push(l);
      else byOwner.set(l.agent_id, [l]);
    } else {
      // Unassigned, or owned by someone deactivated or outside this team --
      // either way it needs a home.
      pool.push(l);
    }
  }

  const total = leads.length;

  const result = computeTargets(
    allocation.mode,
    candidates.map((c) => ({ id: c.id, name: c.name, current: byOwner.get(c.id)?.length ?? 0 })),
    allocation.values,
    total,
  );
  if (result.error !== undefined) return { plan: empty(result.error), leads: null };
  const targets = result.targets;

  // Heaviest holders first, so the dialog reads the same way in every mode.
  const ranked = [...candidates].sort(
    (a, b) => (byOwner.get(b.id)?.length ?? 0) - (byOwner.get(a.id)?.length ?? 0) || a.name.localeCompare(b.name),
  );

  const members: RebalanceMember[] = ranked.map((c) => {
    const current = byOwner.get(c.id)?.length ?? 0;
    const target = targets.get(c.id) ?? 0;
    return {
      id: c.id,
      name: c.name,
      initials: c.initials,
      current,
      target,
      targetPct: total > 0 ? Math.round((target / total) * 100) : 0,
      delta: target - current,
    };
  });

  // Every lead in the pool moves, plus every one shed by an over-target owner.
  const moves = pool.length + members.reduce((n2, m) => n2 + Math.max(0, m.current - m.target), 0);

  return {
    plan: { members, moves, unassigned: pool.length, total, error: null },
    leads,
    byOwner,
    pool,
  };
}

export async function previewRebalance(allocation?: unknown): Promise<RebalancePlan> {
  const { plan } = await buildPlan(allocation);
  return plan;
}

export async function applyRebalance(allocation?: unknown): Promise<{ error: string | null; moved: number }> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "agent") {
    return { error: "You don't have permission to rebalance leads.", moved: 0 };
  }

  const built = await buildPlan(allocation);
  if (built.plan.error || built.leads === null) return { error: built.plan.error, moved: 0 };
  const { plan, byOwner, pool } = built;

  // Shed first, so everything that has to move is in one pile before any of
  // it is handed out.
  const moving: LeadLite[] = [...pool];
  for (const m of plan.members) {
    const surplus = m.current - m.target;
    if (surplus > 0) moving.push(...(byOwner.get(m.id) ?? []).slice(0, surplus));
  }

  const received = new Map<string, number>();
  const assignments: { leadId: string; toId: string }[] = [];
  let cursor = 0;
  for (const m of plan.members) {
    for (let i = 0; i < m.target - m.current && cursor < moving.length; i++) {
      assignments.push({ leadId: moving[cursor].id, toId: m.id });
      received.set(m.id, (received.get(m.id) ?? 0) + 1);
      cursor++;
    }
  }

  if (assignments.length === 0) return { error: null, moved: 0 };

  const supabase = await createClient();
  const nameById = new Map(plan.members.map((m) => [m.id, m.name]));
  const leadById = new Map(built.leads.map((l) => [l.id, l]));
  let moved = 0;

  // One statement per target owner rather than per lead: the same set of ids
  // goes to the same person, so this is a handful of round trips instead of
  // hundreds.
  for (const m of plan.members) {
    const ids = assignments.filter((a) => a.toId === m.id).map((a) => a.leadId);
    if (ids.length === 0) continue;
    // RLS decides which of these the caller may actually touch; only rows that
    // come back were really updated.
    const { data: updated, error } = await supabase
      .from("leads")
      .update({ agent_id: m.id })
      .in("id", ids)
      .select("id");
    if (error) {
      Sentry.captureException(error, { tags: { action: "rebalance", step: "update" } });
      continue;
    }
    const done = updated ?? [];
    moved += done.length;
    if (done.length === 0) continue;

    await supabase.from("lead_activity").insert(
      done.map((l) => ({
        lead_id: l.id as string,
        actor_id: profile.id,
        activity_type: "assigned",
        content: `Reassigned to ${nameById.get(m.id) ?? "a teammate"} (rebalance)`,
      })),
    );

    // One summary per person, not one per lead -- a rebalance of forty leads
    // should not fire forty notifications at somebody.
    if (m.id !== profile.id) {
      await notify({
        profileId: m.id,
        kind: "leads_rebalanced",
        title: `${done.length} lead${done.length === 1 ? "" : "s"} assigned to you`,
        body: `${profile.full_name} rebalanced the team's leads.`,
        href: "/leads",
      });

      // One email per person too, listing a sample of what they received.
      await queueLeadAssignedEmail({
        agentId: m.id,
        reason: "rebalance",
        byName: profile.full_name,
        total: done.length,
        leads: done.slice(0, 10).map((l) => {
          const lead = leadById.get(l.id as string);
          return {
            id: l.id as string,
            name: lead?.full_name ?? "New lead",
            interest: lead?.interest ?? null,
            source: lead?.lead_source ?? null,
          };
        }),
      });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  return { error: null, moved };
}
