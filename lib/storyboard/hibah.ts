// Hibah needs analysis: how much the family needs if the breadwinner is gone
// (or permanently disabled) yesterday, against what is already in place.
//
// Pure and import-free on purpose: scripts/storyboard-golden.mjs runs this file
// directly under Node's type stripping, so it can't lean on path aliases or
// runtime imports. The figures it produces are checked there against a
// reference needs-analysis tool, one scenario per rule below.

export type HibahScenario = "death" | "tpd";
export type HibahMethod = "income" | "itemised";
// "unsure" counts as uncovered: until the agent has checked the MRTT/MLTT,
// the safe assumption is that the whole balance falls on the family.
export type LoanCover = "unsure" | "full" | "partial" | "none";

export const HIBAH_EXPENSE_KEYS = [
  "utilities",
  "groceries",
  "personal",
  "schooling",
  "transport",
  "parents",
  "health",
  "rent",
  "other",
] as const;
export type HibahExpenseKey = (typeof HIBAH_EXPENSE_KEYS)[number];

export type HibahInputs = {
  scenario: HibahScenario;
  netIncome: number;
  supportYears: number;
  inflationPct: number;
  method: HibahMethod;
  replacePct: number;
  expenses: Record<HibahExpenseKey, number>;
  otherContribution: number;
  tpdCareCost: number;
  houseLoan: number;
  houseCover: LoanCover;
  houseCovered: number;
  carLoan: number;
  carCover: LoanCover;
  carCovered: number;
  otherDebt: number;
  educationFund: number;
  emergencyFund: number;
  funeralCost: number;
  savings: number;
  existingBenefit: number;
};

export type HibahResult = {
  need: number;
  have: number;
  gap: number;
  coveredPct: number;
  monthlyBase: number;
  support: number;
  debt: number;
  oneOff: number;
  /** Family support needed in each year, year 1 first. */
  yearly: number[];
};

export const HIBAH_DEFAULTS: HibahInputs = {
  scenario: "death",
  netIncome: 5000,
  supportYears: 5,
  inflationPct: 0,
  method: "income",
  replacePct: 100,
  expenses: {
    utilities: 450,
    groceries: 1200,
    personal: 200,
    schooling: 400,
    transport: 400,
    parents: 300,
    health: 200,
    rent: 0,
    other: 200,
  },
  otherContribution: 0,
  tpdCareCost: 1500,
  houseLoan: 280000,
  houseCover: "unsure",
  houseCovered: 0,
  carLoan: 45000,
  carCover: "unsure",
  carCovered: 0,
  otherDebt: 15000,
  educationFund: 50000,
  emergencyFund: 10000,
  funeralCost: 5000,
  savings: 20000,
  existingBenefit: 100000,
};

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

function uncoveredBalance(balance: number, cover: LoanCover, covered: number) {
  if (cover === "full") return 0;
  if (cover === "partial") return Math.max(0, pos(balance) - pos(covered));
  return pos(balance);
}

export function calcHibah(i: HibahInputs): HibahResult {
  const expenseTotal = HIBAH_EXPENSE_KEYS.reduce((sum, k) => sum + pos(i.expenses[k]), 0);
  const living = i.method === "itemised" ? expenseTotal : (pos(i.netIncome) * pos(i.replacePct)) / 100;
  const monthlyBase = living + (i.scenario === "tpd" ? pos(i.tpdCareCost) : 0);

  // Living costs rise from year 2; the other household contribution stays
  // flat, and each year's shortfall is floored separately so a big
  // contribution can't make one year "pay for" another.
  const years = Math.min(40, Math.max(0, Math.round(pos(i.supportYears))));
  const rate = pos(i.inflationPct) / 100;
  const yearly: number[] = [];
  for (let y = 0; y < years; y++) {
    yearly.push(Math.max(0, monthlyBase * 12 * Math.pow(1 + rate, y) - pos(i.otherContribution) * 12));
  }
  const support = Math.round(yearly.reduce((a, b) => a + b, 0));

  const debt =
    uncoveredBalance(i.houseLoan, i.houseCover, i.houseCovered) +
    uncoveredBalance(i.carLoan, i.carCover, i.carCovered) +
    pos(i.otherDebt);
  const oneOff = pos(i.educationFund) + pos(i.emergencyFund) + pos(i.funeralCost);

  const need = support + debt + oneOff;
  const have = pos(i.savings) + pos(i.existingBenefit);
  const gap = Math.max(0, need - have);
  const coveredPct = need > 0 ? Math.round((Math.min(have, need) / need) * 100) : 100;

  return { need, have, gap, coveredPct, monthlyBase, support, debt, oneOff, yearly: yearly.map(Math.round) };
}
