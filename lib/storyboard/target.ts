// What a storyboard save is aimed at: a lead's storyboard, or a practice
// session (a storyboards row with no lead). Pure, so it is unit-tested.

import { isUuid } from "./validate";

export type StoryboardTarget =
  | { kind: "lead"; leadId: string }
  | { kind: "practice"; id: string };

export const leadTarget = (leadId: string): StoryboardTarget => ({ kind: "lead", leadId });
export const practiceTarget = (id: string): StoryboardTarget => ({ kind: "practice", id });

export type TargetResolution =
  | { ok: true; target: StoryboardTarget }
  | { ok: false; kind: "lead" | "practice" };

/**
 * Reads the target out of an action payload. `target` wins; the older
 * `{ leadId }` shape still resolves to a lead target. The input is untrusted:
 * only well-formed UUIDs pass, and anything else says which kind of "not
 * found" message to show.
 */
export function resolveTarget(input: { target?: unknown; leadId?: unknown } | null | undefined): TargetResolution {
  const raw = input?.target;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (o.kind === "practice") {
      return isUuid(o.id) ? { ok: true, target: practiceTarget(o.id) } : { ok: false, kind: "practice" };
    }
    if (o.kind === "lead") {
      return isUuid(o.leadId) ? { ok: true, target: leadTarget(o.leadId) } : { ok: false, kind: "lead" };
    }
    return { ok: false, kind: "lead" };
  }
  const leadId = input?.leadId;
  return isUuid(leadId) ? { ok: true, target: leadTarget(leadId) } : { ok: false, kind: "lead" };
}

/** Base path of a target's step pages (no trailing slash). */
export function targetBasePath(target: StoryboardTarget, module?: string): string {
  return target.kind === "lead"
    ? `/leads/${target.leadId}/storyboard${module ? `/${module}` : ""}`
    : `/storyboards/practice/${target.id}`;
}

/** Stable id for DOM keys. */
export function targetKey(target: StoryboardTarget): string {
  return target.kind === "lead" ? target.leadId : `practice-${target.id}`;
}
