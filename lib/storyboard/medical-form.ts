// Form state for the Medical Card Fill & Calculate screen. Numbers are held as
// strings while typing (so "1." and "" survive) and converted for the engine.

import type { MedicalInputs } from "./engine/medical";
import { parseNumber } from "./hibah-form";

export const MEDICAL_NUM_KEYS = ["company", "savings", "monthlySave", "cardCost", "inflation"] as const;
export type MedicalNumKey = (typeof MEDICAL_NUM_KEYS)[number];

export type MedicalBillForm = { label: string; amount: string; source: string };

export type MedicalForm = {
  nick: string;
  work: MedicalInputs["work"];
  scenario: number;
  inflationSource: string;
  bills: MedicalBillForm[];
  checked: Record<string, boolean>;
} & Record<MedicalNumKey, string>;

export function toMedicalForm(i: MedicalInputs): MedicalForm {
  const form = {
    nick: i.nick,
    work: i.work,
    scenario: i.scenario,
    inflationSource: i.inflationSource,
    bills: i.bills.map((b) => ({ label: b.label, amount: String(b.amount), source: b.source })),
    checked: { ...i.checked },
  } as MedicalForm;
  for (const k of MEDICAL_NUM_KEYS) form[k] = String(i[k]);
  return form;
}

export function medicalFormToInputs(f: MedicalForm): MedicalInputs {
  const out = {
    nick: f.nick,
    work: f.work,
    scenario: f.scenario,
    inflationSource: f.inflationSource,
    bills: f.bills.map((b) => ({ label: b.label, amount: parseNumber(b.amount), source: b.source })),
    checked: { ...f.checked },
  } as MedicalInputs;
  for (const k of MEDICAL_NUM_KEYS) out[k] = parseNumber(f[k]);
  return out;
}

/** True when a bill or rate has no real source yet (blank, or still the bracketed placeholder). */
export function sourceMissing(source: string): boolean {
  const s = source.trim();
  return s === "" || /^\[.*\]$/.test(s);
}
