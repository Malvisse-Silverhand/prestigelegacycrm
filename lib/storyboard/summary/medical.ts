import { defaultPlanName } from "../defaults/common";
import { rmWhole, type ModuleResults } from "../engine";
import { t, type Lang } from "../i18n";
import type { SummaryBody } from "./hibah";
import { cleanFlow, contributionText, safeText, type SummaryPlan } from "./shared";

// TODO(BM): the Medical wording below is English only. Move each string to
// i18n/dict/medical.{en,bm}.ts and build it with t(key, lang) as summary/hibah.ts does.

export function summarizeMedical(
  result: ModuleResults["medical"],
  plan: SummaryPlan | undefined,
  lang: Lang,
): SummaryBody {
  const { out, flow } = result;
  return {
    moduleLabel: "Medical card",
    kicker: "Hospital bill",
    gap: out.text.gap,
    need: out.text.bill,
    have: rmWhole(out.companyUsed + out.savingsUsed),
    gapNote: "This is an estimate for one scenario. The bill figure is a placeholder the agent has sourced.",
    meaning: [
      "Bill is the scenario estimate we looked at.",
      "Covered is company cover plus your own savings.",
      "Out of pocket is what would still need to be found.",
    ],
    flow: cleanFlow(flow),
    haveVsNeed: [
      { label: "Company cover", value: out.text.company, tone: "neutral" },
      { label: "Own savings", value: out.text.savings, tone: "good" },
      { label: "Out of pocket", value: out.text.gap, tone: "bad" },
    ],
    plan: {
      name: safeText(plan?.name, defaultPlanName("medical", lang)),
      cover: safeText(plan?.cover, t("scene.official", lang)),
      why: safeText(plan?.why, "An own card could help keep savings intact, subject to limits, deductibles and exclusions.", 240),
      contribution: contributionText(plan, lang),
    },
  };
}
