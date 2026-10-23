// Decides which agent gets each row of an uploaded lead list. Pure, so the
// wizard previews exactly what the server will write.
//
// A manager can:
//   * split the whole list evenly, by percentage, or by an exact number per
//     agent (the same three modes as the Rebalance dialog, same maths), and/or
//   * pin individual rows to a chosen agent ("overrides").
// Pinned rows are fixed; the split is worked out over the rows that are left.

import { computeTargets, type RebalanceMode, type TargetMember } from "@/lib/rebalance-targets";

export type PlanMember = { id: string; name: string; load: number };

export type AssignmentRequest = {
  mode: RebalanceMode;
  // Per-agent number (percent or count) for the two manual modes.
  values?: Record<string, number>;
  // Row index -> agent id, for rows the manager pinned by hand.
  overrides?: Record<number, string>;
};

export type AssignmentPlan =
  | { error: string; agentByRow?: undefined; counts?: undefined }
  | { error?: undefined; agentByRow: string[]; counts: Map<string, number> };

export function planAssignments(
  rowCount: number,
  members: PlanMember[],
  request: AssignmentRequest,
): AssignmentPlan {
  if (rowCount <= 0) return { error: "There are no leads to assign." };
  if (members.length === 0) return { error: "Choose at least one agent to receive the leads." };

  const known = new Set(members.map((m) => m.id));
  const overrides = request.overrides ?? {};
  const agentByRow: (string | null)[] = new Array(rowCount).fill(null);
  let pinned = 0;
  for (const [key, agentId] of Object.entries(overrides)) {
    const idx = Number(key);
    if (!Number.isInteger(idx) || idx < 0 || idx >= rowCount) return { error: "A pinned lead is out of range." };
    if (!known.has(agentId)) return { error: "A lead is pinned to someone who isn't on your team." };
    agentByRow[idx] = agentId;
    pinned++;
  }

  const remaining = rowCount - pinned;
  const counts = new Map<string, number>();
  for (const id of Object.values(overrides)) counts.set(id, (counts.get(id) ?? 0) + 1);

  if (remaining > 0) {
    // For an even split the lightest-loaded agent should get any spare lead,
    // which computeTargets gives to the "heaviest holder" -- so feed it the
    // negative of the open-lead load.
    const targetMembers: TargetMember[] = members.map((m) => ({ id: m.id, name: m.name, current: -m.load }));
    const result = computeTargets(request.mode, targetMembers, request.values, remaining);
    if (result.error !== undefined) return { error: result.error };
    const quota = new Map(result.targets);

    // Deal one lead at a time round-robin so every agent gets a spread of the
    // file rather than one contiguous block (the top of a file is usually the
    // freshest leads).
    const order = members.map((m) => m.id);
    let cursor = 0;
    for (let i = 0; i < rowCount; i++) {
      if (agentByRow[i] !== null) continue;
      let guard = 0;
      while ((quota.get(order[cursor % order.length]) ?? 0) <= 0) {
        cursor++;
        if (++guard > order.length) return { error: "Couldn't place every lead. Adjust the numbers and try again." };
      }
      const id = order[cursor % order.length];
      agentByRow[i] = id;
      quota.set(id, (quota.get(id) ?? 0) - 1);
      counts.set(id, (counts.get(id) ?? 0) + 1);
      cursor++;
    }
  }

  return { agentByRow: agentByRow as string[], counts };
}
