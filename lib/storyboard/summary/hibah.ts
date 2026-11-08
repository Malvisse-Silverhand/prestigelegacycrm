import { defaultPlanName } from "../defaults/common";
import type { ModuleResults } from "../engine";
import { t, type Lang } from "../i18n";
import type { ClientSummary, HaveVsNeedItem } from "../types";
import { cleanFlow, contributionText, safeText, type SummaryPlan } from "./shared";

/** What a module builder returns; buildClientSummary adds the agent, disclaimer and next steps. */
export type SummaryBody = Omit<ClientSummary, "agentFirstName" | "agentWa" | "disclaimerKey" | "nextSteps">;

/** The Hibah part of a client summary. This is the reference for the other modules. */
export function summarizeHibah(
  result: ModuleResults["hibah"],
  plan: SummaryPlan | undefined,
  lang: Lang,
): SummaryBody {
  const { out, flow } = result;
  const haveVsNeed: HaveVsNeedItem[] = [
    { label: t("hibah.legend.inPlace", lang), value: out.text.have, tone: "good" },
    { label: t("hibah.legend.unprotected", lang), value: out.text.gap, tone: "bad" },
    { label: t("hibah.summary.estNeed", lang), value: out.text.need, tone: "neutral" },
  ];
  return {
    moduleLabel: t("hibah.summary.moduleLabel", lang),
    kicker: t("hibah.summary.kicker", lang),
    gap: out.text.gap,
    need: out.text.need,
    have: out.text.have,
    gapNote: out.gap > 0 ? t("hibah.summary.gapNote.gap", lang) : t("hibah.summary.gapNote.met", lang),
    meaning: [t("hibah.summary.meaning1", lang), t("hibah.summary.meaning2", lang), t("hibah.summary.meaning3", lang)],
    flow: cleanFlow(flow),
    haveVsNeed,
    plan: {
      name: safeText(plan?.name, defaultPlanName("hibah", lang)),
      cover: safeText(plan?.cover, out.text.gap),
      why: safeText(plan?.why, t("hibah.summary.planWhy", lang), 240),
      contribution: contributionText(plan, lang),
    },
  };
}
