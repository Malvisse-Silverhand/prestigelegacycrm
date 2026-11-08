import type { FlowSlide } from "../types";
import type { Lang } from "../i18n";
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
  // TODO(BM): ci text is English only for now. Build user-visible strings with
  // translator(lang) as engine/hibah.ts does, then delete this line.
  void lang;
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
    reduceNote = "Not yet sure whether a CI payout reduces the base cover. Check the certificate first; the effect on a large hibah matters.";
  }
  if (raw.reduces === "yes") {
    reduceNote = "This plan’s CI payout reduces the base cover. Hibah left after a late-stage claim: " + rmWhole(Math.max(0, n(raw.base) - ciLate)) + ".";
  }

  const deps = raw.deps ?? {};
  let depScore = 0;
  for (let i = 0; i < CI_DEPENDENCY_COUNT; i++) if (deps[String(i)]) depScore++;
  const depLevel = depScore <= 3 ? "Low dependency so far" : depScore <= 6 ? "Moderate dependency" : "High dependency";

  const W = 420;
  const wE = Math.max(0, Math.min(W, safeDiv(W * runEarly, months)));
  const wL = Math.max(0, Math.min(W, safeDiv(W * runLate, months)));
  const earlyPct = n(raw.earlyPct);
  const affordNote =
    "With " + rmWhole(afford) + " extra CI cover, the early-stage gap becomes " +
    rmWhole(Math.max(0, gapEarly - (afford * earlyPct) / 100)) +
    " (if the new plan pays " + earlyPct + "% at early stage) and the late-stage gap " +
    rmWhole(Math.max(0, gapLate - afford)) + ".";

  const runwayMeter = (r: number) => safeDiv(r, months) * 100;
  const fundedPct = total > 0 ? (srcEarly / total) * 100 : 100;
  const caption =
    "Cash lasts " + fixed1(runEarly) + " months (early) to " + fixed1(runLate) + " months (late) of " + months;

  const flow: FlowSlide[] = buildFlowSlides([
    { tag: "DIAGNOSIS", title: "Early-stage diagnosis, income paused", value: rmWhole(monthly) + "/mo", desc: "Commitments keep running for an estimated " + months + " months of treatment and recovery.", meterLabel: "Cash runway", meterText: fixed1(runEarly) + " / " + months + " mo", meter: runwayMeter(runEarly), tone: "neutral" },
    { tag: "CI PAYOUT", title: ciEarly > 0 ? "Existing CI pays at early stage" : "Existing CI pays nothing yet", value: rmWhole(ciEarly), desc: ciEarly > 0 ? "Added to the savings available for recovery." : "A late-stage-only plan pays nothing at an early-stage diagnosis.", meterLabel: "Cash runway", meterText: fixed1(runEarly) + " / " + months + " mo", meter: runwayMeter(runEarly), tone: ciEarly > 0 ? "neutral" : "warn" },
    { tag: "SAVINGS", title: "Savings disrupted by " + rmWhole(Math.min(sources, total)), value: fixed1(runEarly) + " months", desc: "Available cash of " + rmWhole(srcEarly) + " lasts about " + fixed1(runEarly) + " months at " + rmWhole(monthly) + " a month.", meterLabel: "Cash runway", meterText: fixed1(runEarly) + " / " + months + " mo", meter: runwayMeter(runEarly), tone: "warn" },
    { tag: "MONTH " + Math.max(1, Math.ceil(runEarly)), title: "Cash runs out mid-recovery", value: rmWhole(gapEarly), desc: "Still needed for the rest of recovery, extra costs and caregiving.", meterLabel: "Need funded", meterText: (total > 0 ? Math.min(100, Math.round(fundedPct)) : 100) + "%", meter: fundedPct, tone: "bad" },
    { tag: "WITH CI COVER", title: "Add " + rmWhole(suggest) + " of CI cover", value: months + " months", desc: "Cash for the full recovery period, if the new plan pays at early stage. Subject to the certificate’s definitions.", meterLabel: "Cash runway", meterText: months + " / " + months + " mo", meter: 100, tone: "good" },
  ]);

  const legend: LegendItem[] = [
    { label: "Early-stage runway", value: fixed1(runEarly) + " mo", tone: "good" },
    { label: "Late-stage runway", value: fixed1(runLate) + " mo", tone: "good" },
    { label: "Still needed (early)", value: rmWhole(gapEarly), tone: "bad" },
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
      label: "Animated runway bars: cash lasts " + fixed1(runEarly) + " months at early stage and " + fixed1(runLate) + " months at late stage out of a " + months + "-month recovery",
    },
    legend,
    caption,
    flow,
    warnings: [],
  };
}
