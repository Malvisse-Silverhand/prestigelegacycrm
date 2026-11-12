import type { FlowSlide } from "../types";
import { translator, type Lang } from "../i18n";
import type { EngineResult, LegendItem } from "./types";
import { fixed1, fromSen, num, rmWhole, safeDiv, toSen } from "./money";
import { buildFlowSlides } from "./scenario-flow";

export type CiStructure = "late" | "staged" | "standalone" | "none";

export type CiInputs = {
  nick: string;
  income: number;
  /** Monthly commitments the family must keep paying. */
  commit: number;
  /** Percent of income to replace while recovering (50 / 70 / 100). */
  pct: number;
  months: number;
  rehab: number;
  emer: number;
  /** Caregiver lost income per month and for how many months. */
  cg: number;
  cgMonths: number;
  /** "yes" means the plan waives contributions, so none are added to the need. */
  waiver: "yes" | "no";
  /** Monthly contribution that keeps running when there is no waiver. */
  contrib: number;
  savings: number;
  employer: number;
  countEmp: "yes" | "no";
  structure: CiStructure;
  ciAmt: number;
  earlyPct: number;
  /** Booster, percent added to the CI amount. Passed as a string by the form. */
  booster: number | string;
  /** Recovery benefit paid on top, RM. */
  recovery: number | string;
  reduces: "yes" | "no" | "unsure";
  /** Base (hibah) cover the CI payout might reduce. */
  base: number;
  afford: number;
  /** Ticked dependency-checklist items, keyed "0".."9". */
  deps: Record<string, boolean>;
};

export const CI_DEPENDENCY_COUNT = 10;

export type CiOut = {
  monthly: number;
  months: number;
  recovery: number;
  extra: number;
  cgLoss: number;
  contribTotal: number;
  total: number;
  sources: number;
  ciEarly: number;
  ciLate: number;
  srcEarly: number;
  srcLate: number;
  gapEarly: number;
  gapLate: number;
  runEarly: number;
  runLate: number;
  suggest: number;
  depScore: number;
  depLevel: "Low dependency so far" | "Moderate dependency" | "High dependency";
  reduceNote: string;
  affordNote: string;
  text: {
    monthly: string;
    recovery: string;
    extra: string;
    cgLoss: string;
    contribTotal: string;
    total: string;
    gapEarly: string;
    gapLate: string;
    suggest: string;
    srcEarly: string;
    srcLate: string;
    runEarly: string;
    runLate: string;
  };
};

export type CiScene = {
  wEarly: number;
  wLate: number;
  xEarly: number;
  label: string;
};

export type CiResult = EngineResult<CiOut, CiScene>;

export function computeCi(raw: Partial<CiInputs>, lang: Lang = "en"): CiResult {
  const tr = translator(lang);
  const n = (v: unknown) => num(v);

  // months = 0 gives a recovery need of 0 (never NaN). The design clamps to 1;
  // here zero is honoured and every division below is guarded.
  const months = Math.max(0, n(raw.months));
  const monthly = Math.max((n(raw.income) * n(raw.pct)) / 100, n(raw.commit));
  const recovery = fromSen(toSen(monthly) * months);
  const extra = fromSen(toSen(n(raw.rehab)) + toSen(n(raw.emer)));
  const cgLoss = fromSen(toSen(n(raw.cg)) * n(raw.cgMonths));
  const contribTotal = raw.waiver === "yes" ? 0 : fromSen(toSen(n(raw.contrib)) * months);
  const total = fromSen(toSen(recovery) + toSen(extra) + toSen(cgLoss) + toSen(contribTotal));

  const sources = n(raw.savings) + (raw.countEmp === "yes" ? n(raw.employer) : 0);
  const boost = 1 + n(raw.booster) / 100;
  const ra = n(raw.recovery);
  const amt = n(raw.ciAmt);
  const structure = raw.structure ?? "late";
  let ciEarly = 0;
  let ciLate = 0;
  if (structure === "late") {
    ciEarly = 0;
    ciLate = amt * boost;
  }
  if (structure === "staged" || structure === "standalone") {
    ciEarly = (amt * boost * n(raw.earlyPct)) / 100;
    ciLate = amt * boost;
  }
  if (structure !== "none" && ra) {
    ciEarly += ra;
    ciLate += ra;
  }
  const srcEarly = sources + ciEarly;
  const srcLate = sources + ciLate;
  const gapEarly = Math.max(0, total - srcEarly);
  const gapLate = Math.max(0, total - srcLate);
  const runEarly = monthly > 0 ? srcEarly / monthly : 0;
  const runLate = monthly > 0 ? srcLate / monthly : 0;
  const suggest = Math.ceil(gapEarly / 10000) * 10000;
  const afford = n(raw.afford);

  let reduceNote = "";
  if ((raw.reduces ?? "unsure") === "unsure") {
    reduceNote = tr("ci.reduce.unsure");
  }
  if (raw.reduces === "yes") {
    reduceNote = tr("ci.reduce.yes", { left: rmWhole(Math.max(0, n(raw.base) - ciLate)) });
  }

  const deps = raw.deps ?? {};
  let depScore = 0;
  for (let i = 0; i < CI_DEPENDENCY_COUNT; i++) if (deps[String(i)]) depScore++;
  // depLevel is a stable English id (tests and styling key off it); screens translate it with ci.dep.*.
  const depLevel = depScore <= 3 ? "Low dependency so far" : depScore <= 6 ? "Moderate dependency" : "High dependency";

  const W = 420;
  const wE = Math.max(0, Math.min(W, safeDiv(W * runEarly, months)));
  const wL = Math.max(0, Math.min(W, safeDiv(W * runLate, months)));
  const earlyPct = n(raw.earlyPct);
  const affordNote = tr("ci.afford", {
    extra: rmWhole(afford),
    early: rmWhole(Math.max(0, gapEarly - (afford * earlyPct) / 100)),
    pct: earlyPct,
    late: rmWhole(Math.max(0, gapLate - afford)),
  });

  const runwayMeter = (r: number) => safeDiv(r, months) * 100;
  const fundedPct = total > 0 ? (srcEarly / total) * 100 : 100;
  const caption = tr("ci.caption", { early: fixed1(runEarly), late: fixed1(runLate), months });

  const runwayLabel = tr("ci.flow.runway");
  const runwayEarlyText = tr("ci.flow.runwayText", { a: fixed1(runEarly), b: months });
  const flow: FlowSlide[] = buildFlowSlides([
    { tag: tr("ci.flow.d.tag"), title: tr("ci.flow.d.title"), value: tr("ci.flow.perMonth", { amount: rmWhole(monthly) }), desc: tr("ci.flow.d.desc", { months }), meterLabel: runwayLabel, meterText: runwayEarlyText, meter: runwayMeter(runEarly), tone: "neutral" },
    { tag: tr("ci.flow.p.tag"), title: ciEarly > 0 ? tr("ci.flow.p.titleYes") : tr("ci.flow.p.titleNo"), value: rmWhole(ciEarly), desc: ciEarly > 0 ? tr("ci.flow.p.descYes") : tr("ci.flow.p.descNo"), meterLabel: runwayLabel, meterText: runwayEarlyText, meter: runwayMeter(runEarly), tone: ciEarly > 0 ? "neutral" : "warn" },
    { tag: tr("ci.flow.s.tag"), title: tr("ci.flow.s.title", { amount: rmWhole(Math.min(sources, total)) }), value: tr("ci.flow.monthsValue", { months: fixed1(runEarly) }), desc: tr("ci.flow.s.desc", { cash: rmWhole(srcEarly), months: fixed1(runEarly), monthly: rmWhole(monthly) }), meterLabel: runwayLabel, meterText: runwayEarlyText, meter: runwayMeter(runEarly), tone: "warn" },
    { tag: tr("ci.flow.m.tag", { n: Math.max(1, Math.ceil(runEarly)) }), title: tr("ci.flow.m.title"), value: rmWhole(gapEarly), desc: tr("ci.flow.m.desc"), meterLabel: tr("ci.flow.m.meterLabel"), meterText: (total > 0 ? Math.min(100, Math.round(fundedPct)) : 100) + "%", meter: fundedPct, tone: "bad" },
    { tag: tr("ci.flow.w.tag"), title: tr("ci.flow.w.title", { amount: rmWhole(suggest) }), value: tr("ci.flow.monthsValue", { months }), desc: tr("ci.flow.w.desc"), meterLabel: runwayLabel, meterText: tr("ci.flow.runwayText", { a: months, b: months }), meter: 100, tone: "good" },
  ]);

  const legend: LegendItem[] = [
    { label: tr("ci.legend.early"), value: tr("ci.legend.mo", { n: fixed1(runEarly) }), tone: "good" },
    { label: tr("ci.legend.late"), value: tr("ci.legend.mo", { n: fixed1(runLate) }), tone: "good" },
    { label: tr("ci.legend.needed"), value: rmWhole(gapEarly), tone: "bad" },
  ];

  return {
    out: {
      monthly, months, recovery, extra, cgLoss, contribTotal, total, sources,
      ciEarly, ciLate, srcEarly, srcLate, gapEarly, gapLate, runEarly, runLate, suggest,
      depScore, depLevel, reduceNote, affordNote,
      text: {
        monthly: rmWhole(monthly), recovery: rmWhole(recovery), extra: rmWhole(extra),
        cgLoss: rmWhole(cgLoss), contribTotal: rmWhole(contribTotal), total: rmWhole(total),
        gapEarly: rmWhole(gapEarly), gapLate: rmWhole(gapLate), suggest: rmWhole(suggest),
        srcEarly: rmWhole(srcEarly), srcLate: rmWhole(srcLate),
        runEarly: fixed1(runEarly), runLate: fixed1(runLate),
      },
    },
    scene: {
      wEarly: wE,
      wLate: wL,
      xEarly: 110 + wE,
      label: tr("ci.scene.label", { early: fixed1(runEarly), late: fixed1(runLate), months }),
    },
    legend,
    caption,
    flow,
    warnings: [],
  };
}
