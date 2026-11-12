import { defaultPlanName } from "../defaults/common";
import { rmWhole, type ModuleResults } from "../engine";
import { t, type Lang } from "../i18n";
import type { SummaryBody } from "./hibah";
import { cleanFlow, contributionText, safeText, type SummaryPlan } from "./shared";

/** The Business Protection part of a client summary. */
export function summarizeBusiness(
  result: ModuleResults["business"],
  plan: SummaryPlan | undefined,
  lang: Lang,
): SummaryBody {
  const { out, flow } = result;
  return {
    moduleLabel: t("business.summary.moduleLabel", lang),
    kicker: t("business.summary.kicker", lang),
    gap: out.text.total,
    need: out.text.total,
    have: rmWhole(0),
    gapNote: t("business.summary.gapNote", lang),
    meaning: [t("business.summary.meaning1", lang), t("business.summary.meaning2", lang), t("business.summary.meaning3", lang)],
    flow: cleanFlow(flow),
    haveVsNeed: out.rows.map((r) => ({ label: r.label, value: rmWhole(r.amount), tone: "neutral" as const })),
    plan: {
      name: safeText(plan?.name, defaultPlanName("business", lang)),
      cover: safeText(plan?.cover, out.text.total),
      why: safeText(plan?.why, t("business.summary.planWhy", lang), 240),
      contribution: contributionText(plan, lang),
    },
  };
}
