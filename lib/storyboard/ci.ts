// Critical-illness needs analysis: cash to live on while recovering, not the
// hospital bill (that's the medical card's job). How many months of income the
// family needs replaced, plus the costs around treatment, against what would
// actually pay out in cash.
//
// Import-free for the same reason as hibah.ts (scripts/storyboard-golden.mjs).

// Monthly commitments the prospect ticks to build the story. They don't feed
// the maths -- the agent enters the total commitment -- but they are what the
// prospect recognises as "still has to be paid while I'm ill".
export const CI_COMMITMENTS = [
  "housing",
  "vehicle",
  "utilities",
  "groceries",
  "schooling",
  "caregiver",
  "hospital_travel",
  "rehab",
  "business_costs",
  "living_until_work",
] as const;
export type CiCommitment = (typeof CI_COMMITMENTS)[number];

// Why CI cash matters for this prospect; narrative only, like the above.
export const CI_SITUATIONS = [
  "main_earner",
  "commission_income",
  "low_emergency_fund",
  "high_housing",
  "other_loans",
  "dependants",
  "spouse_depends",
  "company_cover_only",
  "unsure_existing_ci",
  "savings_earmarked",
] as const;
export type CiSituation = (typeof CI_SITUATIONS)[number];

export type CiInputs = {
  commitments: CiCommitment[];
  situations: CiSituation[];
  monthlyIncome: number;
  monthlyCommitment: number;
  replacePct: number;
  recoveryMonths: number;
  rehabCost: number;
  emergencyFund: number;
  savings: number;
  employerCi: number;
  existingCi: number;
};

export type CiResult = {
  monthlyNeed: number;
  runwayNeed: number;
  extraCosts: number;
  need: number;
  have: number;
  gap: number;
  coveredPct: number;
  /** How long what's in place covers the monthly commitments, to one decimal. */
  monthsCovered: number;
  recoveryMonths: number;
};

export const CI_DEFAULTS: CiInputs = {
  commitments: ["housing", "vehicle", "utilities", "groceries", "schooling"],
  situations: [],
  monthlyIncome: 5000,
  monthlyCommitment: 3500,
  replacePct: 70,
  recoveryMonths: 12,
  rehabCost: 20000,
  emergencyFund: 10000,
  savings: 10000,
  employerCi: 0,
  existingCi: 30000,
};

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function calcCi(i: CiInputs): CiResult {
  const monthlyNeed = (pos(i.monthlyIncome) * pos(i.replacePct)) / 100;
  const months = Math.round(pos(i.recoveryMonths));
  const runwayNeed = monthlyNeed * months;
  const extraCosts = pos(i.rehabCost) + pos(i.emergencyFund);
  const need = runwayNeed + extraCosts;
  // Only money that arrives as cash counts; a medical card's limit does not.
  const have = pos(i.savings) + pos(i.employerCi) + pos(i.existingCi);
  const gap = Math.max(0, need - have);
  const commitment = pos(i.monthlyCommitment);
  return {
    monthlyNeed,
    runwayNeed,
    extraCosts,
    need,
    have,
    gap,
    coveredPct: need > 0 ? Math.round((Math.min(have, need) / need) * 100) : 100,
    monthsCovered: commitment > 0 ? Math.round((have / commitment) * 10) / 10 : 0,
    recoveryMonths: months,
  };
}
