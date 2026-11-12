// Form state for the Critical Illness Fill & Calculate screen.

import type { CiInputs } from "./engine/ci";
import { parseNumber } from "./hibah-form";
import type { CiStored } from "./validate";

export const CI_NUM_KEYS = [
  "income", "commit", "pct", "months", "rehab", "emer", "cg", "cgMonths", "contrib",
  "savings", "employer", "ciAmt", "earlyPct", "booster", "recovery", "base", "afford",
] as const;
export type CiNumKey = (typeof CI_NUM_KEYS)[number];

export type CiForm = {
  nick: string;
  waiver: CiInputs["waiver"];
  countEmp: CiInputs["countEmp"];
  structure: CiInputs["structure"];
  reduces: CiInputs["reduces"];
  deps: Record<string, boolean>;
  /** Agent-only. Kept apart from the numbers; see fillSendable(). */
  story: string;
  commitChecked: string[];
} & Record<CiNumKey, string>;

export function toCiForm(s: CiStored): CiForm {
  const form = {
    nick: s.nick,
    waiver: s.waiver,
    countEmp: s.countEmp,
    structure: s.structure,
    reduces: s.reduces,
    deps: { ...s.deps },
    story: s.story,
    commitChecked: [...s.commitChecked],
  } as CiForm;
  for (const k of CI_NUM_KEYS) form[k] = String(s[k]);
  return form;
}

/** The engine inputs only (no story, no commitment ticks). */
export function ciFormToInputs(f: CiForm): CiInputs {
  const out = {
    nick: f.nick,
    waiver: f.waiver,
    countEmp: f.countEmp,
    structure: f.structure,
    reduces: f.reduces,
    deps: { ...f.deps },
  } as CiInputs;
  for (const k of CI_NUM_KEYS) out[k] = parseNumber(f[k]);
  return out;
}
