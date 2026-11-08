// Step progress helpers shared by the lead tab, the list page and the actions.

import { STORYBOARD_STEPS, type StepStatus, type StoryboardStep } from "./types";

/** Reads step_status JSON defensively: only known steps with the value "saved" count. */
export function readStepStatus(raw: unknown): StepStatus {
  const out: StepStatus = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const step of STORYBOARD_STEPS) {
      if ((raw as Record<string, unknown>)[step] === "saved") out[step] = "saved";
    }
  }
  return out;
}

export function markStepSaved(status: StepStatus, step: StoryboardStep): StepStatus {
  return { ...status, [step]: "saved" };
}

export function savedSteps(status: StepStatus): StoryboardStep[] {
  return STORYBOARD_STEPS.filter((s) => status[s] === "saved");
}

const LABELS = ["Not started", "Fill & Calculate done", "Explanation done", "Rejection Risk done", "Completed"];

/** Label for a row in the lists, from how many steps are saved. */
export function progressLabel(status: StepStatus): string {
  return LABELS[savedSteps(status).length] ?? LABELS[0];
}
