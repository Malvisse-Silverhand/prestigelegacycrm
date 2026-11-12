import { defaultPlanName } from "../defaults/common";
import type { ModuleResults } from "../engine";
import { t, type Lang } from "../i18n";
import type { SummaryBody } from "./hibah";
import { cleanFlow, contributionText, safeText, type SummaryPlan } from "./shared";

/** The Critical Illness part of a client summary. The agent-only story is never an input here. */
export function summarizeCi(
  result: ModuleResults["ci"],
  plan: SummaryPlan | undefined,
  lang: Lang,
): SummaryBody {
  const { out, flow } = result;
  return {
    moduleLabel: t("ci.summary.moduleLabel", lang),
    kicker: t("ci.summary.kicker", lang),
    gap: out.text.gapEarly,
    need: out.text.total,
    have: out.text.srcEarly,
    gapNote: t("ci.summary.gapNote", lang),
    meaning: [t("ci.summary.meaning1", lang), t("ci.summary.meaning2", lang), t("ci.summary.meaning3", lang)],
    flow: cleanFlow(flow),
    haveVsNeed: [
      { label: t("ci.summary.have", lang), value: out.text.srcEarly, tone: "good" },
      { label: t("ci.summary.gap", lang), value: out.text.gapEarly, tone: "bad" },
      { label: t("ci.summary.need", lang), value: out.text.total, tone: "neutral" },
    ],
    plan: {
      name: safeText(plan?.name, defaultPlanName("ci", lang)),
      cover: safeText(plan?.cover, out.text.suggest),
      why: safeText(plan?.why, t("ci.summary.planWhy", lang), 240),
      contribution: contributionText(plan, lang),
    },
  };
}
