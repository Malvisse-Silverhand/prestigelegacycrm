import { defaultPlanName } from "../defaults/common";
import { rmWhole, type ModuleResults } from "../engine";
import { t, type Lang } from "../i18n";
import type { SummaryBody } from "./hibah";
import { cleanFlow, contributionText, safeText, type SummaryPlan } from "./shared";

export function summarizeMedical(
  result: ModuleResults["medical"],
  plan: SummaryPlan | undefined,
  lang: Lang,
): SummaryBody {
  const { out, flow } = result;
  return {
    moduleLabel: t("medical.summary.moduleLabel", lang),
    kicker: t("medical.summary.kicker", lang),
    gap: out.text.gap,
    need: out.text.bill,
    have: rmWhole(out.companyUsed + out.savingsUsed),
    gapNote: t("medical.summary.gapNote", lang),
    meaning: [t("medical.summary.meaning1", lang), t("medical.summary.meaning2", lang), t("medical.summary.meaning3", lang)],
    flow: cleanFlow(flow),
    haveVsNeed: [
      { label: t("medical.legend.company", lang), value: out.text.company, tone: "neutral" },
      { label: t("medical.legend.savings", lang), value: out.text.savings, tone: "good" },
      { label: t("medical.legend.oop", lang), value: out.text.gap, tone: "bad" },
    ],
    plan: {
      name: safeText(plan?.name, defaultPlanName("medical", lang)),
      cover: safeText(plan?.cover, t("scene.official", lang)),
      why: safeText(plan?.why, t("medical.summary.planWhy", lang), 240),
      contribution: contributionText(plan, lang),
    },
  };
}
