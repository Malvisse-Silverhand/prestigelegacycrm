import type { FlowSlide } from "../types";
import type { EngineResult, LegendItem } from "./types";
import { fromSen, num, rmWhole, safeDiv, toSen, fixed1 } from "./money";
import { buildFlowSlides } from "./scenario-flow";

export type HibahCoverStatus = "covered" | "partial" | "unsure" | "no";

export type HibahInputs = {
  nick: string;
  age: number;
  scenario: "death" | "tpd";
  method: "replace" | "itemize";
  income: number;
  replace: number; // percent of income to replace
  other: number; // other monthly support (spouse income etc.)
  years: number;
  inflation: number; // percent a year
  eFood: number;
  eUtil: number;
  eSchool: number;
  eTrans: number;
  eRent: number;
  eOther: number;
  home: number;
  homeCov: HibahCoverStatus;
  homePart: number;
  car: number;
  carCov: HibahCoverStatus;
  carPart: number;
  otherDebt: number;
  edu: number;
  emergency: number;
  funeral: number;
  savings: number;
  existing: number;
};

export type HibahOut = {
  itemTotal: number;
  base: number;
  monthly: number;
  years: number;
  support: number;
  debts: number;
  oneoff: number;
  need: number;
  have: number;
  gap: number;
  pct: number;
  yearly: number[];
  /** Display strings, whole ringgit, as the design shows them. */
  text: {
    support: string;
    debts: string;
    oneoff: string;
    need: string;
    have: string;
    gap: string;
    monthly: string;
    y1: string;
    yN: string;
  };
};

export type HibahScene = {
  level: number;
  gapH: number;
  gapY: number;
  ringOffset: number;
  label: string;
};

export type HibahResult = EngineResult<HibahOut, HibahScene>;

/** Cover status for a debt: covered = 0, partial = amt - part, otherwise all of it. */
function debtOf(amt: number, status: string, part: number): number {
  if (status === "covered") return 0;
  if (status === "partial") return Math.max(0, amt - part);
  return amt; // unsure / no: treated as not covered
}

export function computeHibah(raw: Partial<HibahInputs>): HibahResult {
  const n = (v: unknown) => num(v);
  const nick = String(raw.nick ?? "") || "the prospect";

  const itemTotal =
    n(raw.eFood) + n(raw.eUtil) + n(raw.eSchool) + n(raw.eTrans) + n(raw.eRent) + n(raw.eOther);
  const base = raw.method === "itemize" ? itemTotal : (n(raw.income) * n(raw.replace)) / 100;
  const monthlySen = Math.max(0, toSen(base) - toSen(n(raw.other)));
  const monthly = fromSen(monthlySen);
  const years = Math.max(1, Math.min(30, Math.round(n(raw.years))));
  // Clamped so a typo cannot overflow Math.pow into Infinity.
  const inf = Math.max(-99, Math.min(1000, n(raw.inflation))) / 100;

  const yearly: number[] = [];
  let supportSen = 0;
  for (let t = 0; t < years; t++) {
    const y = monthly * 12 * Math.pow(1 + inf, t);
    yearly.push(y);
    supportSen += toSen(y);
  }
  const support = fromSen(supportSen);

  const debts = fromSen(
    toSen(debtOf(n(raw.home), String(raw.homeCov ?? "unsure"), n(raw.homePart))) +
      toSen(debtOf(n(raw.car), String(raw.carCov ?? "unsure"), n(raw.carPart))) +
      toSen(n(raw.otherDebt)),
  );
  const oneoff = fromSen(toSen(n(raw.edu)) + toSen(n(raw.emergency)) + toSen(n(raw.funeral)));
  const need = fromSen(toSen(support) + toSen(debts) + toSen(oneoff));
  const have = fromSen(toSen(n(raw.savings)) + toSen(n(raw.existing)));
  const gap = fromSen(Math.max(0, toSen(need) - toSen(have)));
  const pct = need > 0 ? Math.min(100, Math.round((have / need) * 100)) : 100;

  const level = 200 - 178 * (pct / 100) - 8;
  const gapH = Math.max(14, Math.round(120 * (need > 0 ? gap / need : 0)));
  const caption =
    pct >= 100
      ? "Shield full: what is in place meets the estimated need"
      : "Shield " + pct + "% filled · " + rmWhole(gap) + " still to plan for";

  const remaining = Math.max(0, have - debts - oneoff);
  const runway = monthly > 0 ? remaining / monthly : 0;
  const needMonths = years * 12;

  const flow: FlowSlide[] = buildFlowSlides([
    { tag: "DAY 1", title: nick + "’s income stops", value: rmWhole(monthly) + "/mo", desc: "The family still needs this every month, for " + years + " years.", meterLabel: "Need covered by what’s in place", meterText: pct + "%", meter: pct, tone: "neutral" },
    { tag: "WEEK 1", title: "Debts & one-off costs fall due", value: "− " + rmWhole(debts + oneoff), desc: "Uncovered loans, education fund, funeral and admin costs come first.", meterLabel: "Savings & cover left", meterText: rmWhole(remaining), meter: have > 0 ? (remaining / have) * 100 : 0, tone: "warn" },
    { tag: "MONTH " + Math.max(1, Math.ceil(runway)), title: "What’s left runs out", value: fixed1(runway) + " months", desc: rmWhole(remaining) + " left covers about " + fixed1(runway) + " of the " + needMonths + " months needed.", meterLabel: "Runway vs need", meterText: fixed1(runway) + " / " + needMonths + " mo", meter: safeDiv(runway, needMonths) * 100, tone: "bad" },
    { tag: "SHORTFALL", title: "The family must find the rest", value: rmWhole(gap), desc: "From EPF, selling the home, relatives or new debt.", meterLabel: "Need covered", meterText: pct + "%", meter: pct, tone: "bad" },
    // Compliance: no "fills the gap 100%". Subject to the PDS and certificate terms.
    { tag: "WITH HIBAH", title: "A hibah of " + rmWhole(gap) + " could fill the gap", value: rmWhole(gap), desc: "Could fill the gap, subject to the PDS & certificate terms. Paid to the named beneficiary under a conditional hibah nomination.", meterLabel: "Need covered if the cover is in place", meterText: "Subject to terms", meter: 100, tone: "good" },
  ]);

  const legend: LegendItem[] = [
    { label: "In place", value: rmWhole(have), tone: "good" },
    { label: "Still unprotected", value: rmWhole(gap), tone: "bad" },
    { label: "Total need", value: rmWhole(need), tone: "neutral" },
  ];

  return {
    out: {
      itemTotal, base, monthly, years, support, debts, oneoff, need, have, gap, pct, yearly,
      text: {
        support: rmWhole(support), debts: rmWhole(debts), oneoff: rmWhole(oneoff),
        need: rmWhole(need), have: rmWhole(have), gap: rmWhole(gap), monthly: rmWhole(monthly),
        y1: rmWhole(yearly[0] ?? 0), yN: rmWhole(yearly[yearly.length - 1] ?? 0),
      },
    },
    scene: {
      level, gapH, gapY: 196 - gapH, ringOffset: 213.6 * (1 - pct / 100),
      label: "Animated shield around a family, " + pct + " percent filled, " + rmWhole(have) + " in place and " + rmWhole(gap) + " unprotected",
    },
    legend,
    caption,
    flow,
    warnings: [],
  };
}

