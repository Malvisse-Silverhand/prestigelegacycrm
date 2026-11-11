// Medical card needs analysis: a daily-risk score, then one private-hospital
// bill set against what the prospect could pay it with today.
//
// Import-free for the same reason as hibah.ts (scripts/storyboard-golden.mjs).

export const MEDICAL_RISK_FACTORS = [
  // Work
  { key: "field_work", weight: 3, group: "work" },
  { key: "heavy_industry", weight: 3, group: "work" },
  { key: "gig_work", weight: 3, group: "work" },
  { key: "desk_work", weight: 1, group: "work" },
  { key: "shift_work", weight: 2, group: "work" },
  // Lifestyle
  { key: "motorcycle", weight: 3, group: "lifestyle" },
  { key: "smoker", weight: 2, group: "lifestyle" },
  { key: "no_exercise", weight: 1, group: "lifestyle" },
  { key: "fast_food", weight: 1, group: "lifestyle" },
  { key: "short_sleep", weight: 1, group: "lifestyle" },
  // Travel
  { key: "long_drives", weight: 2, group: "travel" },
  { key: "frequent_travel", weight: 1, group: "travel" },
  { key: "family_trips", weight: 1, group: "travel" },
  // Health & dependants
  { key: "age_40", weight: 2, group: "health" },
  { key: "family_history", weight: 2, group: "health" },
  { key: "dependants", weight: 2, group: "health" },
  { key: "no_own_card", weight: 3, group: "health" },
  { key: "low_emergency_fund", weight: 2, group: "health" },
] as const;
export type MedicalRiskKey = (typeof MEDICAL_RISK_FACTORS)[number]["key"];
export const MEDICAL_RISK_MAX = MEDICAL_RISK_FACTORS.reduce((s, f) => s + f.weight, 0);

// Upper-end private-hospital bills, in ringgit. Rough by design: the point is
// the order of magnitude a prospect has to plan for, not a quote.
export const MEDICAL_BILL_SCENARIOS = [
  { key: "heart_stent", amount: 60000 },
  { key: "stroke", amount: 75000 },
  { key: "bypass", amount: 120000 },
  { key: "kidney_transplant", amount: 150000 },
  { key: "road_accident_icu", amount: 166186 },
  { key: "open_heart", amount: 200000 },
  { key: "leukaemia", amount: 300000 },
  { key: "breast_cancer", amount: 395000 },
  { key: "liver_transplant", amount: 500000 },
] as const;
export type MedicalBillKey = (typeof MEDICAL_BILL_SCENARIOS)[number]["key"];

export type Employment = "salaried" | "self_employed" | "not_working";
export type RiskLevel = "low" | "medium" | "high";

export type MedicalInputs = {
  risks: MedicalRiskKey[];
  employment: Employment;
  companyCover: number;
  savings: number;
  billKey: MedicalBillKey;
  monthlySaving: number;
  ownCardMonthly: number;
};

export type MedicalResult = {
  bill: number;
  companyUsed: number;
  savingsUsed: number;
  have: number;
  gap: number;
  coveredPct: number;
  billIn5Years: number;
  /** Years of saving monthlySaving to fill the gap, rounded up. Null if nothing is being saved. */
  yearsToSave: number | null;
  ownCardYearly: number;
  riskScore: number;
  riskLevel: RiskLevel;
  /** The heaviest ticked factor (first in list order on a tie). */
  topRisk: MedicalRiskKey | null;
};

export const MEDICAL_DEFAULTS: MedicalInputs = {
  risks: ["desk_work", "motorcycle"],
  employment: "salaried",
  companyCover: 20000,
  savings: 10000,
  billKey: "breast_cancer",
  monthlySaving: 500,
  ownCardMonthly: 300,
};

// Hospital costs in Malaysia have been rising around 15% a year.
export const MEDICAL_INFLATION = 0.15;

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function riskLevel(score: number): RiskLevel {
  if (score >= 14) return "high";
  if (score >= 6) return "medium";
  return "low";
}

export function calcMedical(i: MedicalInputs): MedicalResult {
  const bill = MEDICAL_BILL_SCENARIOS.find((s) => s.key === i.billKey)?.amount ?? 0;
  // A company panel only exists while employed by that company.
  const companyUsed = i.employment === "salaried" ? Math.min(pos(i.companyCover), bill) : 0;
  const savingsUsed = Math.min(pos(i.savings), bill - companyUsed);
  const have = companyUsed + savingsUsed;
  const gap = Math.max(0, bill - have);
  const coveredPct = bill > 0 ? Math.round((have / bill) * 100) : 100;

  const ticked = MEDICAL_RISK_FACTORS.filter((f) => i.risks.includes(f.key));
  const riskScore = ticked.reduce((s, f) => s + f.weight, 0);
  let top: (typeof MEDICAL_RISK_FACTORS)[number] | null = null;
  for (const f of ticked) if (!top || f.weight > top.weight) top = f;

  const saving = pos(i.monthlySaving);
  return {
    bill,
    companyUsed,
    savingsUsed,
    have,
    gap,
    coveredPct,
    billIn5Years: Math.round(bill * Math.pow(1 + MEDICAL_INFLATION, 5)),
    yearsToSave: saving > 0 ? Math.ceil(gap / (saving * 12)) : null,
    ownCardYearly: pos(i.ownCardMonthly) * 12,
    riskScore,
    riskLevel: riskLevel(riskScore),
    topRisk: top?.key ?? null,
  };
}
