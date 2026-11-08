// Form state for the Business Protection Fill & Calculate screen.

import type { BusinessInputs, KeyPerson, Partner } from "./engine/business";
import { parseNumber } from "./hibah-form";

export const BUSINESS_NUM_KEYS = [
  "revenue", "profit", "fixed", "reserve", "kMult", "kCount", "valMult", "valManual", "pCount",
  "lTerm", "lOd", "lHp", "lTrade", "lOther", "lInst", "guarPct", "lCover",
  "eBank", "eStock", "eDebt", "eInst", "eMonths", "eOpex", "eWages", "eFamily", "eHibah",
] as const;
export type BusinessNumKey = (typeof BUSINESS_NUM_KEYS)[number];

export type KeyPersonForm = {
  name: string;
  role: string;
  succ: KeyPerson["succ"];
  salary: string;
  impact: string;
  stable: string;
  ci: string;
  cost: string;
  exD: string;
  exC: string;
};
export type PartnerForm = { name: string; pct: string; age: string; ex: string };

export type BusinessForm = {
  company: string;
  entity: BusinessInputs["entity"];
  kMethod: BusinessInputs["kMethod"];
  valMethod: BusinessInputs["valMethod"];
  structure: BusinessInputs["structure"];
  agreement: BusinessInputs["agreement"];
  guarantor: string;
  ePlan: BusinessInputs["ePlan"];
  eWill: string;
  kps: KeyPersonForm[];
  partners: PartnerForm[];
} & Record<BusinessNumKey, string>;

export function toBusinessForm(i: BusinessInputs): BusinessForm {
  const form = {
    company: i.company,
    entity: i.entity,
    kMethod: i.kMethod,
    valMethod: i.valMethod,
    structure: i.structure,
    agreement: i.agreement,
    guarantor: i.guarantor,
    ePlan: i.ePlan,
    eWill: i.eWill,
    kps: i.kps.map((k) => ({
      name: k.name, role: k.role, succ: k.succ,
      salary: String(k.salary), impact: String(k.impact), stable: String(k.stable), ci: String(k.ci),
      cost: String(k.cost), exD: String(k.exD), exC: String(k.exC),
    })),
    partners: i.partners.map((p) => ({ name: p.name, pct: String(p.pct), age: String(p.age), ex: String(p.ex) })),
  } as BusinessForm;
  for (const k of BUSINESS_NUM_KEYS) form[k] = String(i[k]);
  return form;
}

export function businessFormToInputs(f: BusinessForm): BusinessInputs {
  const out = {
    company: f.company,
    entity: f.entity,
    kMethod: f.kMethod,
    valMethod: f.valMethod,
    structure: f.structure,
    agreement: f.agreement,
    guarantor: f.guarantor,
    ePlan: f.ePlan,
    eWill: f.eWill,
    kps: f.kps.map(
      (k): KeyPerson => ({
        name: k.name, role: k.role, succ: k.succ,
        salary: parseNumber(k.salary), impact: parseNumber(k.impact), stable: parseNumber(k.stable), ci: parseNumber(k.ci),
        cost: parseNumber(k.cost), exD: parseNumber(k.exD), exC: parseNumber(k.exC),
      }),
    ),
    partners: f.partners.map(
      (p): Partner => ({ name: p.name, pct: parseNumber(p.pct), age: parseNumber(p.age), ex: parseNumber(p.ex) }),
    ),
  } as BusinessInputs;
  for (const k of BUSINESS_NUM_KEYS) out[k] = parseNumber(f[k]);
  return out;
}
