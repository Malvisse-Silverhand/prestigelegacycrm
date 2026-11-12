"use client";

import { useModuleStepSave } from "../use-step-save";
import type { StoryboardStep } from "@/lib/storyboard/types";
import type { HibahScreenProps } from "./types";

/** Save state for a Hibah step screen. */
export function useStepSave(props: Pick<HibahScreenProps, "target" | "readOnly" | "savedAt" | "hasRow" | "dbReady">, step: StoryboardStep) {
  return useModuleStepSave("hibah", props, step);
}
