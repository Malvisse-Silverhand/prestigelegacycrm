// Which storyboard modules have screens, and which screen serves which step.
//
// This is plain data (no React) so a test can check it is complete. The React
// registry in components/storyboard/registry.tsx is typed against SCREEN_IDS,
// so adding a module here without adding its screens fails the type check.

import type { StoryboardModule, StoryboardStep } from "./types";
import { STORYBOARD_STEPS } from "./types";

/** Modules that are built. Mortgage is Phase 4b. */
export const BUILT_MODULES = ["hibah", "medical", "ci", "business"] as const;
export type BuiltModule = (typeof BUILT_MODULES)[number];

export function isBuiltModule(v: unknown): v is BuiltModule {
  return typeof v === "string" && (BUILT_MODULES as readonly string[]).includes(v);
}

export function asBuiltModule(m: StoryboardModule): BuiltModule | null {
  return isBuiltModule(m) ? m : null;
}

/** Screen id = "<module>:<step>". One per built module and step. */
export type ScreenId = `${BuiltModule}:${StoryboardStep}`;

export const SCREEN_IDS: ScreenId[] = BUILT_MODULES.flatMap((m) =>
  STORYBOARD_STEPS.map((s) => `${m}:${s}` as ScreenId),
);

export function screenId(module: BuiltModule, step: StoryboardStep): ScreenId {
  return `${module}:${step}`;
}

export const MODULE_TITLE: Record<BuiltModule, string> = {
  hibah: "Hibah Takaful Planning",
  medical: "Medical & Health Takaful",
  ci: "Critical Illness Compensation",
  business: "Business Protection Takaful",
};

export const MODULE_NAME: Record<StoryboardModule, string> = {
  hibah: "Hibah",
  medical: "Medical Card",
  ci: "Critical Illness",
  business: "Business Protection",
  mortgage: "Mortgage",
};
