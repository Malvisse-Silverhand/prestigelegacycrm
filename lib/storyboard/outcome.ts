// Step 4 outcome -> what happens to the lead.
//
// The one hard rule: a lead is NEVER moved backwards. Stages have an order and
// an outcome only applies its stage when that stage is further along than the
// lead's current one. Leads already at appointment, submission, won, servicing
// or lost keep their stage whatever the outcome says.

import { cleanText, isIsoDate } from "./validate";
import type { StoryboardOutcome } from "./types";

// Funnel order. closed_lost is terminal and handled separately.
const ORDER = ["new", "contacted", "follow_up", "quoted", "appointment", "submission", "closed_won", "servicing"] as const;

// Stages an outcome may never change.
const PROTECTED = new Set(["appointment", "submission", "closed_won", "servicing", "closed_lost"]);
// Stages where a follow-up date no longer makes sense.
const NO_FOLLOW_UP = new Set(["closed_won", "servicing", "closed_lost"]);

export type OutcomeInput = {
  outcome: StoryboardOutcome;
  currentStage: string;
  /** Malaysia's today, YYYY-MM-DD. */
  today: string;
  followUpDate?: string | null;
  reason?: string | null;
  /** Whether the lead already has a quotation (the existing rule for entering Quoted). */
  hasQuotation: boolean;
};

export type LeadPatch = {
  pipeline_stage?: string;
  follow_up_date?: string;
  status?: "closed";
  closed_on?: null;
  closed_lost_reason?: string;
};

export type OutcomePlan =
  | { ok: true; patch: LeadPatch; stageChanged: boolean; summary: string }
  | { ok: false; error: string };

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function rank(stage: string): number {
  return (ORDER as readonly string[]).indexOf(stage);
}

export const OUTCOME_LABEL: Record<StoryboardOutcome, string> = {
  ready_for_quote: "Ready for quote",
  needs_spouse: "Needs spouse discussion",
  follow_up_later: "Follow up later",
  not_interested: "Not interested",
};

export function planOutcome(input: OutcomeInput): OutcomePlan {
  const { outcome, currentStage, today } = input;
  const patch: LeadPatch = {};
  const notes: string[] = [];

  // Moves to `target` only if that is forward of where the lead is.
  const moveTo = (target: string): boolean => {
    if (PROTECTED.has(currentStage)) return false;
    const cur = rank(currentStage);
    // An unknown current stage is left alone rather than guessed at.
    if (cur === -1) return false;
    if (rank(target) <= cur) return false;
    patch.pipeline_stage = target;
    return true;
  };

  const setFollowUp = (date: string) => {
    if (NO_FOLLOW_UP.has(currentStage)) return;
    patch.follow_up_date = date;
  };

  switch (outcome) {
    case "ready_for_quote": {
      if (input.hasQuotation) {
        if (moveTo("quoted")) notes.push("moved to Quoted");
      } else if (!PROTECTED.has(currentStage) && rank(currentStage) < rank("quoted")) {
        // Entering Quoted needs a quotation on file; the outcome is still recorded.
        notes.push("stage unchanged: create a quotation to move the lead to Quoted");
      }
      break;
    }
    case "needs_spouse": {
      if (moveTo("follow_up")) notes.push("moved to Follow Up");
      const date = addDays(today, 3);
      setFollowUp(date);
      if (patch.follow_up_date) notes.push(`follow-up set for ${date}`);
      break;
    }
    case "follow_up_later": {
      const date = input.followUpDate ?? "";
      if (!isIsoDate(date)) return { ok: false, error: "Pick a valid follow-up date." };
      if (date < today) return { ok: false, error: "The follow-up date can't be in the past." };
      if (date > addDays(today, 730)) return { ok: false, error: "Pick a follow-up date within the next two years." };
      if (moveTo("follow_up")) notes.push("moved to Follow Up");
      setFollowUp(date);
      if (patch.follow_up_date) notes.push(`follow-up set for ${date}`);
      break;
    }
    case "not_interested": {
      const reason = cleanText(input.reason, 200);
      if (reason === "") return { ok: false, error: "Add a short reason." };
      if (!PROTECTED.has(currentStage) && rank(currentStage) !== -1) {
        patch.pipeline_stage = "closed_lost";
        patch.status = "closed";
        patch.closed_on = null;
        patch.closed_lost_reason = reason;
        notes.push("moved to Closed Lost");
      } else {
        notes.push("stage unchanged");
      }
      break;
    }
  }

  return {
    ok: true,
    patch,
    stageChanged: patch.pipeline_stage !== undefined,
    summary: notes.length ? notes.join("; ") : "stage unchanged",
  };
}
