// The module registry and the shared prospect profile. Everything a session
// needs that isn't a module's own maths lives here: defaults, prefilling from a
// lead, and turning stored jsonb back into typed inputs.
import { calcHibah, HIBAH_DEFAULTS, type HibahInputs, type HibahResult } from "./hibah";
import { calcMedical, MEDICAL_DEFAULTS, type MedicalInputs, type MedicalResult } from "./medical";
import { calcCi, CI_DEFAULTS, type CiInputs, type CiResult } from "./ci";
import type { ScriptSet } from "@/app/(app)/wa-flow/scripts/data";

export const STORYBOARD_MODULES = ["hibah", "medical", "ci"] as const;
export type StoryboardModule = (typeof STORYBOARD_MODULES)[number];

// Shown on the hub as "coming soon" so agents can see where this is heading.
export const UPCOMING_MODULES = [
  { key: "keyman", bm: "Perlindungan Bisnes", en: "Business Protection" },
  { key: "pusaka", bm: "Pusaka & Faraid", en: "Estate & Faraid" },
  { key: "wanita", bm: "Wanita", en: "Women" },
] as const;

// The closing-scripts library that backs each module's "Scripts & objections".
export const MODULE_SCRIPT_SET: Record<StoryboardModule, ScriptSet> = {
  hibah: "hibah_faraid",
  medical: "medical",
  // No CI-specific library yet; the general takaful closing scripts fit best.
  ci: "takaful",
};

// The calculator in public/tools the "Open quotation" step launches.
export const MODULE_QUOTE_TOOL: Record<StoryboardModule, string> = {
  hibah: "quickquote-hibah-life-takaful.html",
  medical: "imedi-evolusi-quote.html",
  ci: "quickquote-hibah-life-takaful.html",
};

export type StoryboardProfile = {
  nickname: string;
  age: number | null;
  gender: "male" | "female" | "";
  marital: "single" | "married" | "single_parent" | "widowed" | "";
  occupation: string;
  occupationClass: "1" | "2" | "3" | "4" | "";
  smoker: "no" | "yes" | "quit" | "";
  dependants: number;
  budget: "discuss" | "lt150" | "150_300" | "300_500" | "gt500" | "";
};

export const EMPTY_PROFILE: StoryboardProfile = {
  nickname: "",
  age: null,
  gender: "",
  marital: "",
  occupation: "",
  occupationClass: "",
  smoker: "",
  dependants: 0,
  budget: "",
};

export type LeadPrefill = {
  full_name: string;
  date_of_birth: string | null;
  gender: "male" | "female" | null;
  marital_status: string | null;
  occupation: string | null;
  occupation_class: string | null;
  is_smoker: boolean | null;
  dependants: number;
};

const MARITAL_FROM_LEAD: Record<string, StoryboardProfile["marital"]> = {
  Single: "single",
  Married: "married",
  Divorced: "widowed",
  Widowed: "widowed",
};

function attainedAge(dobIso: string, today: Date) {
  const dob = new Date(dobIso);
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

export function profileFromLead(lead: LeadPrefill, today = new Date()): StoryboardProfile {
  const cls = lead.occupation_class;
  return {
    // A first name reads naturally on screen ("Berapa Ahmad perlukan...") and
    // keeps the full name off anything the prospect is shown or sent.
    nickname: lead.full_name.trim().split(/\s+/)[0] ?? "",
    age: lead.date_of_birth ? attainedAge(lead.date_of_birth, today) : null,
    gender: lead.gender ?? "",
    marital: (lead.marital_status && MARITAL_FROM_LEAD[lead.marital_status]) || "",
    occupation: lead.occupation ?? "",
    occupationClass: cls === "1" || cls === "2" || cls === "3" || cls === "4" ? cls : "",
    smoker: lead.is_smoker === null ? "" : lead.is_smoker ? "yes" : "no",
    dependants: lead.dependants,
    budget: "",
  };
}

export type ModuleInputs = { hibah: HibahInputs; medical: MedicalInputs; ci: CiInputs };
export type ModuleResult = { hibah: HibahResult; medical: MedicalResult; ci: CiResult };

export const MODULE_DEFAULTS: ModuleInputs = { hibah: HIBAH_DEFAULTS, medical: MEDICAL_DEFAULTS, ci: CI_DEFAULTS };

// Stored inputs are merged over today's defaults, so a session saved before a
// field existed still opens with every field filled.
export function hydrateInputs<M extends StoryboardModule>(module: M, stored: unknown): ModuleInputs[M] {
  const base = MODULE_DEFAULTS[module];
  if (!stored || typeof stored !== "object") return structuredClone(base);
  const merged = { ...base, ...(stored as object) } as ModuleInputs[M];
  if (module === "hibah") {
    const h = merged as HibahInputs;
    h.expenses = { ...HIBAH_DEFAULTS.expenses, ...(h.expenses ?? {}) };
  }
  return merged;
}

export function hydrateProfile(stored: unknown): StoryboardProfile {
  if (!stored || typeof stored !== "object") return { ...EMPTY_PROFILE };
  return { ...EMPTY_PROFILE, ...(stored as object) };
}

export function compute<M extends StoryboardModule>(module: M, inputs: ModuleInputs[M]): ModuleResult[M] {
  switch (module) {
    case "hibah":
      return calcHibah(inputs as HibahInputs) as ModuleResult[M];
    case "medical":
      return calcMedical(inputs as MedicalInputs) as ModuleResult[M];
    default:
      return calcCi(inputs as CiInputs) as ModuleResult[M];
  }
}

/** The sum a quotation should aim for: the gap, rounded up to a tidy figure. */
export function suggestedCover(gap: number) {
  if (gap <= 0) return 0;
  const step = gap >= 200000 ? 50000 : 10000;
  return Math.ceil(gap / step) * step;
}

/** The figures every module shares, for lists and insights. */
export function headline(module: StoryboardModule, result: unknown) {
  const r = (result ?? {}) as { need?: number; bill?: number; have?: number; gap?: number; coveredPct?: number };
  return {
    need: (module === "medical" ? r.bill : r.need) ?? 0,
    have: r.have ?? 0,
    gap: r.gap ?? 0,
    coveredPct: r.coveredPct ?? 0,
  };
}
