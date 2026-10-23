// Pure maths for the lead rebalance: how many open leads each person should end
// up holding. No server imports on purpose -- the rebalance dialog uses this to
// show the result live as a manager types, and the server action uses the very
// same function to decide what actually moves, so the preview and the write can
// never disagree.

export type RebalanceMode = "even" | "percent" | "count";

// What the browser sends: a mode, plus one number per person for the two manual
// modes. It is only ever a request -- the server re-validates all of it.
export type RebalanceAllocation = { mode: RebalanceMode; values?: Record<string, number> };

export type TargetMember = { id: string; name: string; current: number };

export type TargetResult = { targets: Map<string, number>; error?: undefined } | { targets?: undefined; error: string };

// A tenth of a percentage point (with float slack): enough that 33.3 + 33.3 +
// 33.3 passes, small enough that 99 never does. Whatever the shares add up to,
// the lead counts below always add up to exactly the real total.
const PERCENT_TOLERANCE = 0.15;
const MAX_MEMBERS = 500;

// Whoever already carries the most keeps the spare lead, which makes the plan
// the smallest number of moves that still lands on the requested numbers.
function byHolding(a: TargetMember, b: TargetMember) {
  return b.current - a.current || a.name.localeCompare(b.name);
}

export function computeTargets(
  mode: RebalanceMode,
  members: TargetMember[],
  values: Record<string, number> | undefined,
  total: number,
): TargetResult {
  if (members.length === 0) return { error: "There are no active team members to distribute leads to." };
  if (members.length > MAX_MEMBERS) return { error: "That is too many people to rebalance at once." };

  const targets = new Map<string, number>();

  if (mode === "even") {
    const base = Math.floor(total / members.length);
    const remainder = total % members.length;
    [...members].sort(byHolding).forEach((m, i) => targets.set(m.id, base + (i < remainder ? 1 : 0)));
    return { targets };
  }

  const known = new Set(members.map((m) => m.id));
  const given = values ?? {};
  for (const id of Object.keys(given)) {
    if (!known.has(id)) return { error: "One of the people in this request is not on your team." };
  }

  // A person left blank counts as 0 -- "give this person nothing" is a valid
  // thing to ask for (on leave, new, over capacity).
  const read = (id: string) => {
    const v = given[id];
    return v === undefined ? 0 : v;
  };
  for (const m of members) {
    const v = read(m.id);
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      return { error: `Enter a number of 0 or more for ${m.name}.` };
    }
    if (mode === "count" && !Number.isInteger(v)) return { error: `${m.name}: leads must be a whole number.` };
    if (mode === "percent" && v > 100) return { error: `${m.name}: a share can't be more than 100%.` };
  }

  if (mode === "count") {
    let sum = 0;
    for (const m of members) {
      const v = read(m.id);
      targets.set(m.id, v);
      sum += v;
    }
    if (sum !== total) {
      return {
        error:
          sum < total
            ? `${total - sum} lead${total - sum === 1 ? "" : "s"} still to place — the numbers must add up to ${total}.`
            : `${sum - total} too many — the numbers must add up to ${total}.`,
      };
    }
    return { targets };
  }

  // percent: largest-remainder, so 3 people at 33.3% of 10 leads gets 4/3/3
  // rather than losing or inventing a lead to rounding.
  let pctSum = 0;
  for (const m of members) pctSum += read(m.id);
  if (Math.abs(pctSum - 100) > PERCENT_TOLERANCE) {
    return { error: `The shares add up to ${Math.round(pctSum * 10) / 10}% — they need to total 100%.` };
  }

  const parts = members.map((m) => {
    const raw = (read(m.id) / 100) * total;
    const floor = Math.floor(raw + 1e-9);
    return { m, floor, frac: raw - floor };
  });
  let leftover = total - parts.reduce((s, p) => s + p.floor, 0);
  parts.sort((a, b) => b.frac - a.frac || byHolding(a.m, b.m));
  for (const p of parts) targets.set(p.m.id, p.floor);
  for (let i = 0; leftover > 0; i++, leftover--) {
    // Someone set to 0% never receives a rounding lead.
    const p = parts[i % parts.length];
    if (read(p.m.id) === 0 && parts.some((q) => read(q.m.id) > 0)) {
      leftover++;
      continue;
    }
    targets.set(p.m.id, (targets.get(p.m.id) ?? 0) + 1);
  }
  // Shares a hair over 100% can floor to more leads than exist; take the excess
  // back from whoever holds the most.
  while (leftover < 0) {
    let top: string | null = null;
    for (const [id, t] of targets) if (t > 0 && (top === null || t > (targets.get(top) ?? 0))) top = id;
    if (top === null) break;
    targets.set(top, (targets.get(top) ?? 0) - 1);
    leftover++;
  }

  let placed = 0;
  for (const t of targets.values()) placed += t;
  if (placed !== total) return { error: "Those shares don't divide the leads cleanly. Adjust them and try again." };
  return { targets };
}

// Shape-check for the untrusted request body of a server action.
export function sanitizeAllocation(input: unknown): RebalanceAllocation | null {
  if (input === undefined || input === null) return { mode: "even" };
  if (typeof input !== "object" || Array.isArray(input)) return null;
  const { mode, values } = input as { mode?: unknown; values?: unknown };
  if (mode !== "even" && mode !== "percent" && mode !== "count") return null;
  if (mode === "even") return { mode };
  if (!values || typeof values !== "object" || Array.isArray(values)) return null;
  const entries = Object.entries(values as Record<string, unknown>);
  if (entries.length > MAX_MEMBERS) return null;
  const clean: Record<string, number> = {};
  for (const [id, v] of entries) {
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    clean[id] = v;
  }
  return { mode, values: clean };
}
