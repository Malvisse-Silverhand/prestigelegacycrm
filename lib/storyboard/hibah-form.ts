// Form state for the Hibah Fill & Calculate screen. Numbers are held as strings
// while typing (so "1." and "" survive) and converted for the engine.

import type { HibahCoverStatus, HibahInputs } from "./engine/hibah";

export const HIBAH_NUM_KEYS = [
  "age", "income", "replace", "other", "years", "inflation",
  "eFood", "eUtil", "eSchool", "eTrans", "eRent", "eOther",
  "home", "homePart", "car", "carPart", "otherDebt",
  "edu", "emergency", "funeral", "savings", "existing",
] as const;
export type HibahNumKey = (typeof HIBAH_NUM_KEYS)[number];

export type HibahForm = {
  nick: string;
  scenario: "death" | "tpd";
  method: "replace" | "itemize";
  homeCov: HibahCoverStatus;
  carCov: HibahCoverStatus;
} & Record<HibahNumKey, string>;

export function toForm(i: HibahInputs): HibahForm {
  const form = {
    nick: i.nick,
    scenario: i.scenario,
    method: i.method,
    homeCov: i.homeCov,
    carCov: i.carCov,
  } as HibahForm;
  for (const k of HIBAH_NUM_KEYS) form[k] = String(i[k]);
  return form;
}

export function parseNumber(s: string): number {
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formToInputs(f: HibahForm): HibahInputs {
  const out = {
    nick: f.nick,
    scenario: f.scenario,
    method: f.method,
    homeCov: f.homeCov,
    carCov: f.carCov,
  } as HibahInputs;
  for (const k of HIBAH_NUM_KEYS) out[k] = parseNumber(f[k]);
  return out;
}

/** Keep only characters a money / percent field can hold. */
export function numericText(raw: string, allowNegative = false): string {
  const cleaned = raw.replace(allowNegative ? /[^0-9.\-]/g : /[^0-9.]/g, "");
  return cleaned;
}
