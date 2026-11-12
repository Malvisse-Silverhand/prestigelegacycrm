import type { FlowSlide } from "../types";
import { translator, type Lang } from "../i18n";
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

export function computeHibah(raw: Partial<HibahInputs>, lang: Lang = "en"): HibahResult {
  const n = (v: unknown) => num(v);
  const tr = translator(lang);
  const nick = String(raw.nick ?? "") || tr("common.prospect");

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
      ? tr("hibah.caption.full")
      : tr("hibah.caption.partial", { pct, gap: rmWhole(gap) });

  const remaining = Math.max(0, have - debts - oneoff);
  const runway = monthly > 0 ? remaining / monthly : 0;
  const needMonths = years * 12;

  const flow: FlowSlide[] = buildFlowSlides([
    { tag: tr("hibah.flow.d1.tag"), title: tr("hibah.flow.d1.title", { nick }), value: tr("hibah.flow.d1.value", { amount: rmWhole(monthly) }), desc: tr("hibah.flow.d1.desc", { years }), meterLabel: tr("hibah.flow.d1.meterLabel"), meterText: pct + "%", meter: pct, tone: "neutral" },
    { tag: tr("hibah.flow.w1.tag"), title: tr("hibah.flow.w1.title"), value: "− " + rmWhole(debts + oneoff), desc: tr("hibah.flow.w1.desc"), meterLabel: tr("hibah.flow.w1.meterLabel"), meterText: rmWhole(remaining), meter: have > 0 ? (remaining / have) * 100 : 0, tone: "warn" },
    { tag: tr("hibah.flow.m.tag", { n: Math.max(1, Math.ceil(runway)) }), title: tr("hibah.flow.m.title"), value: tr("hibah.flow.m.value", { months: fixed1(runway) }), desc: tr("hibah.flow.m.desc", { remaining: rmWhole(remaining), runway: fixed1(runway), needMonths }), meterLabel: tr("hibah.flow.m.meterLabel"), meterText: tr("hibah.flow.m.meterText", { runway: fixed1(runway), needMonths }), meter: safeDiv(runway, needMonths) * 100, tone: "bad" },
    { tag: tr("hibah.flow.s.tag"), title: tr("hibah.flow.s.title"), value: rmWhole(gap), desc: tr("hibah.flow.s.desc"), meterLabel: tr("hibah.flow.s.meterLabel"), meterText: pct + "%", meter: pct, tone: "bad" },
    // Compliance: no "fills the gap 100%". Subject to the PDS and certificate terms.
    { tag: tr("hibah.flow.h.tag"), title: tr("hibah.flow.h.title", { gap: rmWhole(gap) }), value: rmWhole(gap), desc: tr("hibah.flow.h.desc"), meterLabel: tr("hibah.flow.h.meterLabel"), meterText: tr("hibah.flow.h.meterText"), meter: 100, tone: "good" },
  ]);

  const legend: LegendItem[] = [
    { label: tr("hibah.legend.inPlace"), value: rmWhole(have), tone: "good" },
    { label: tr("hibah.legend.unprotected"), value: rmWhole(gap), tone: "bad" },
    { label: tr("hibah.legend.need"), value: rmWhole(need), tone: "neutral" },
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
      label: tr("hibah.scene.label", { pct, have: rmWhole(have), gap: rmWhole(gap) }),
    },
    legend,
    caption,
    flow,
    warnings: [],
  };
}

