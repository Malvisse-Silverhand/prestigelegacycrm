import type { FlowSlide } from "../types";
import type { EngineResult, LegendItem } from "./types";
import { fixed1, fromSen, num, rmWhole, safeDiv, toSen } from "./money";
import { buildFlowSlides } from "./scenario-flow";

// Mortgage protection: MRTT (reducing cover) versus MLTT (level cover).
//
// No design exists for this module, so the formulas are the plan's:
//   r          = rate / 12
//   PMT        = P * r / (1 - (1 + r)^-n)         (r = 0: P / n)
//   balance_k  = P (1 + r)^k - PMT ((1 + r)^k - 1) / r
//   MRTT cover = the same schedule at the rate the plan assumes, over the cover term
//   MLTT cover = level, equal to the loan amount, over its cover term
//   gap_k      = max(0, balance_k - cover_k)
//   surplus_k  = max(0, cover_k - balance_k)

export const MRTT_PLAN_PLACEHOLDER = "[GE MRTT plan]";
export const MLTT_PLAN_PLACEHOLDER = "[GE MLTT plan]";
export const CONTRIBUTION_FROM_ILLUSTRATION = "From official illustration";

export type MortgageInputs = {
  nick: string;
  /** Original loan amount (RM). */
  loanAmount: number;
  /** Loan interest rate the bank charges, percent a year. */
  rate: number;
  /** Loan term in years. */
  termYears: number;
  /** MRTT cover term in years. Defaults to the loan term. */
  mrttCoverYears?: number | null;
  /** Rate the MRTT plan assumes, percent a year. Defaults to the loan rate. */
  mrttAssumedRate?: number | null;
  /** MLTT cover term in years. Defaults to the loan term. */
  mlttCoverYears?: number | null;
  /** MLTT level sum covered. Defaults to the loan amount. */
  mlttCover?: number | null;
  /** Policy year used for the headline numbers and the Hibah auto-feed. */
  policyYear?: number;
  /** Agent-entered monthly contributions (RM). Leave empty to show the illustration note. */
  mrttContribution?: number | null;
  mlttContribution?: number | null;
  mrttName?: string;
  mlttName?: string;
  /** Which plan the agent settled on, for the Hibah auto-feed. */
  chosenPlan?: "mrtt" | "mltt" | null;
};

export type MortgagePoint = {
  year: number;
  balance: number;
  mrttCover: number;
  mlttCover: number;
  mrttGap: number;
  mrttSurplus: number;
  mlttGap: number;
  mlttSurplus: number;
};

export type MortgageOut = {
  loanAmount: number;
  termYears: number;
  mrttCoverYears: number;
  mlttCoverYears: number;
  pmt: number;
  policyYear: number;
  chosenPlan: "mrtt" | "mltt" | null;
  mrttName: string;
  mlttName: string;
  series: MortgagePoint[];
  atYear: MortgagePoint;
  /** Largest uncovered balance over the curve for each plan. */
  mrttMaxGap: number;
  mlttMaxGap: number;
  /** Largest amount paid on top of the loan balance under MLTT. */
  mlttMaxSurplus: number;
  contribution: { mrtt: string; mltt: string; difference: string | null };
  text: {
    loanAmount: string;
    pmt: string;
    balance: string;
    mrttCover: string;
    mlttCover: string;
    mrttGap: string;
    mlttGap: string;
    mlttSurplus: string;
  };
};

export type MortgageScene = {
  maxValue: number;
  years: number;
  label: string;
};

export type MortgageResult = EngineResult<MortgageOut, MortgageScene>;

/** Standard monthly annuity payment. Rate is percent a year. */
export function monthlyPayment(principal: number, annualRatePct: number, months: number): number {
  const P = Math.max(0, num(principal));
  const n = Math.floor(num(months));
  if (P === 0 || n <= 0) return 0;
  const r = num(annualRatePct) / 1200;
  if (Math.abs(r) < 1e-12) return P / n;
  const pmt = (P * r) / (1 - Math.pow(1 + r, -n));
  return Number.isFinite(pmt) ? pmt : 0;
}

/** Outstanding balance after k monthly payments. Never negative. */
export function loanBalance(principal: number, annualRatePct: number, months: number, k: number): number {
  const P = Math.max(0, num(principal));
  const n = Math.floor(num(months));
  const paid = Math.floor(num(k));
  if (P === 0) return 0;
  if (paid <= 0) return P;
  if (n <= 0 || paid >= n) return 0;
  const r = num(annualRatePct) / 1200;
  if (Math.abs(r) < 1e-12) return Math.max(0, P * (1 - paid / n));
  const pmt = monthlyPayment(P, annualRatePct, n);
  const g = Math.pow(1 + r, paid);
  const b = P * g - (pmt * (g - 1)) / r;
  return Number.isFinite(b) ? Math.max(0, b) : 0;
}

const clampYears = (v: unknown, fallback: number) => {
  const n = Math.round(num(v));
  return Math.max(1, Math.min(40, n > 0 ? n : fallback));
};

const optNum = (v: number | null | undefined): number | null =>
  v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v);

function contributionText(v: number | null): string {
  return v !== null && v > 0 ? rmWhole(v) + "/mo" : CONTRIBUTION_FROM_ILLUSTRATION;
}

export function computeMortgage(raw: Partial<MortgageInputs>): MortgageResult {
  const P = Math.max(0, num(raw.loanAmount));
  const rate = Math.max(0, num(raw.rate));
  const termYears = clampYears(raw.termYears, 30);
  const mrttCoverYears = clampYears(raw.mrttCoverYears, termYears);
  const mlttCoverYears = clampYears(raw.mlttCoverYears, termYears);
  const assumed = optNum(raw.mrttAssumedRate);
  const assumedRate = assumed === null ? rate : Math.max(0, assumed);
  const mlttSum = optNum(raw.mlttCover) !== null && Number(raw.mlttCover) > 0 ? Number(raw.mlttCover) : P;
  const policyYear = Math.max(0, Math.min(40, Math.round(num(raw.policyYear ?? 5))));

  const loanN = termYears * 12;
  const mrttN = mrttCoverYears * 12;
  const mlttN = mlttCoverYears * 12;
  const horizon = Math.max(termYears, mrttCoverYears, mlttCoverYears);

  const series: MortgagePoint[] = [];
  for (let y = 0; y <= horizon; y++) {
    const k = y * 12;
    const balance = loanBalance(P, rate, loanN, k);
    // Cover ends when its own term ends. Year 0 is the start, so it is in force.
    const mrttCover = k < mrttN || y === 0 ? loanBalance(P, assumedRate, mrttN, k) : 0;
    const mlttCover = k < mlttN || y === 0 ? mlttSum : 0;
    series.push({
      year: y,
      balance: fromSen(toSen(balance)),
      mrttCover: fromSen(toSen(mrttCover)),
      mlttCover: fromSen(toSen(mlttCover)),
      mrttGap: fromSen(Math.max(0, toSen(balance) - toSen(mrttCover))),
      mrttSurplus: fromSen(Math.max(0, toSen(mrttCover) - toSen(balance))),
      mlttGap: fromSen(Math.max(0, toSen(balance) - toSen(mlttCover))),
      mlttSurplus: fromSen(Math.max(0, toSen(mlttCover) - toSen(balance))),
    });
  }
  const atYear = series[Math.min(policyYear, series.length - 1)];
  const pmt = fromSen(toSen(monthlyPayment(P, rate, loanN)));

  const mrttName = String(raw.mrttName ?? "").trim() || MRTT_PLAN_PLACEHOLDER;
  const mlttName = String(raw.mlttName ?? "").trim() || MLTT_PLAN_PLACEHOLDER;

  const cM = optNum(raw.mrttContribution);
  const cL = optNum(raw.mlttContribution);
  const bothEntered = cM !== null && cM > 0 && cL !== null && cL > 0;
  const contribution = {
    mrtt: contributionText(cM),
    mltt: contributionText(cL),
    difference: bothEntered ? rmWhole(Math.abs((cL as number) - (cM as number))) + "/mo" : null,
  };

  const mrttMaxGap = Math.max(0, ...series.map((s) => s.mrttGap));
  const mlttMaxGap = Math.max(0, ...series.map((s) => s.mlttGap));
  const mlttMaxSurplus = Math.max(0, ...series.map((s) => s.mlttSurplus));
  const maxValue = Math.max(1, P, mlttSum);

  const caption =
    "Year " + atYear.year + ": loan balance " + rmWhole(atYear.balance) + ", " + mrttName + " cover " +
    rmWhole(atYear.mrttCover) + ", " + mlttName + " cover " + rmWhole(atYear.mlttCover);

  const flow: FlowSlide[] = buildFlowSlides([
    { tag: "DAY 1", title: "The home loan starts", value: rmWhole(P), desc: "Monthly instalment about " + rmWhole(pmt) + " over " + termYears + " years at " + fixed1(rate) + "% a year.", meterLabel: "Loan still owed", meterText: "100%", meter: 100, tone: "neutral" },
    { tag: "YEAR " + atYear.year, title: "The loan balance falls", value: rmWhole(atYear.balance), desc: "The balance after " + atYear.year + " years of instalments. Early on, most of each instalment is interest.", meterLabel: "Loan still owed", meterText: Math.round(safeDiv(atYear.balance, P) * 100) + "%", meter: safeDiv(atYear.balance, P) * 100, tone: "neutral" },
    { tag: "REDUCING COVER", title: mrttName + " follows the balance", value: rmWhole(atYear.mrttCover), desc: atYear.mrttGap > 0 ? "At year " + atYear.year + " the cover is " + rmWhole(atYear.mrttGap) + " short of the balance. The cover schedule assumes " + fixed1(assumedRate) + "% a year; check the certificate." : "At year " + atYear.year + " the cover meets the balance on the assumed schedule. Subject to the PDS & certificate terms.", meterLabel: "Balance covered", meterText: Math.round(safeDiv(Math.min(atYear.mrttCover, atYear.balance), atYear.balance) * 100) + "%", meter: atYear.balance > 0 ? safeDiv(Math.min(atYear.mrttCover, atYear.balance), atYear.balance) * 100 : 100, tone: atYear.mrttGap > 0 ? "bad" : "good" },
    { tag: "LEVEL COVER", title: mlttName + " stays level", value: rmWhole(atYear.mlttCover), desc: atYear.mlttSurplus > 0 ? "At year " + atYear.year + " the cover is " + rmWhole(atYear.mlttSurplus) + " above the balance, which could go to the family after the loan is cleared. Subject to the PDS & certificate terms." : "At year " + atYear.year + " the level cover does not exceed the balance.", meterLabel: "Balance covered", meterText: Math.round(safeDiv(Math.min(atYear.mlttCover, atYear.balance), atYear.balance) * 100) + "%", meter: atYear.balance > 0 ? safeDiv(Math.min(atYear.mlttCover, atYear.balance), atYear.balance) * 100 : 100, tone: atYear.mlttGap > 0 ? "warn" : "good" },
    { tag: "CONTRIBUTION", title: "Compare what each costs", value: contribution.difference ?? CONTRIBUTION_FROM_ILLUSTRATION, desc: "MRTT: " + contribution.mrtt + ". MLTT: " + contribution.mltt + ". Figures come from the official illustration.", meterLabel: "Contribution source", meterText: contribution.difference ? "Agent entered" : "Official illustration", meter: 100, tone: "neutral" },
  ]);

  const legend: LegendItem[] = [
    { label: "Loan balance", value: rmWhole(atYear.balance), tone: "neutral" },
    { label: mrttName, value: rmWhole(atYear.mrttCover), tone: "good" },
    { label: mlttName, value: rmWhole(atYear.mlttCover), tone: "warn" },
    { label: "Uncovered (reducing)", value: rmWhole(atYear.mrttGap), tone: "bad" },
    { label: "Surplus (level)", value: rmWhole(atYear.mlttSurplus), tone: "good" },
  ];

  return {
    out: {
      loanAmount: P,
      termYears,
      mrttCoverYears,
      mlttCoverYears,
      pmt,
      policyYear,
      chosenPlan: raw.chosenPlan ?? null,
      mrttName,
      mlttName,
      series,
      atYear,
      mrttMaxGap,
      mlttMaxGap,
      mlttMaxSurplus,
      contribution,
      text: {
        loanAmount: rmWhole(P),
        pmt: rmWhole(pmt),
        balance: rmWhole(atYear.balance),
        mrttCover: rmWhole(atYear.mrttCover),
        mlttCover: rmWhole(atYear.mlttCover),
        mrttGap: rmWhole(atYear.mrttGap),
        mlttGap: rmWhole(atYear.mlttGap),
        mlttSurplus: rmWhole(atYear.mlttSurplus),
      },
    },
    scene: {
      maxValue,
      years: horizon,
      label: "Chart of loan balance against reducing and level cover over " + horizon + " years",
    },
    legend,
    caption,
    flow,
    warnings: [],
  };
}

export type HibahHomeCov = "covered" | "partial" | "unsure";

/**
 * Auto-feed from Mortgage to Hibah's home-loan cover status, using the chosen
 * plan's cover at the given policy year.
 *
 * Returns `current` untouched when the agent set homeCov manually. With no
 * chosen plan the answer is 'unsure', which Hibah treats as not covered.
 */
export function hibahHomeCovFromMortgage(
  mortgage: Pick<MortgageOut, "series" | "chosenPlan">,
  policyYear: number,
  setManually = false,
  current: HibahHomeCov = "unsure",
): HibahHomeCov {
  if (setManually) return current;
  const plan = mortgage.chosenPlan;
  if (!plan || mortgage.series.length === 0) return "unsure";
  const y = Math.max(0, Math.min(mortgage.series.length - 1, Math.round(num(policyYear))));
  const pt = mortgage.series[y];
  const cover = plan === "mrtt" ? pt.mrttCover : pt.mlttCover;
  if (pt.balance <= 0) return "covered";
  if (cover >= pt.balance) return "covered";
  if (cover > 0) return "partial";
  return "unsure";
}

/** Outstanding amount Hibah should treat as uncovered under the chosen plan, for homePart. */
export function hibahHomePartFromMortgage(
  mortgage: Pick<MortgageOut, "series" | "chosenPlan">,
  policyYear: number,
): number {
  const plan = mortgage.chosenPlan;
  if (!plan || mortgage.series.length === 0) return 0;
  const y = Math.max(0, Math.min(mortgage.series.length - 1, Math.round(num(policyYear))));
  const pt = mortgage.series[y];
  const cover = plan === "mrtt" ? pt.mrttCover : pt.mlttCover;
  return Math.min(cover, pt.balance);
}
