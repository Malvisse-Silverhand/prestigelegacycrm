import { defaultPlanName } from "../defaults/common";
import type { ModuleResults } from "../engine";
import type { Lang } from "../i18n";
import type { SummaryBody } from "./hibah";
import { cleanFlow, contributionText, safeText, type SummaryPlan } from "./shared";

// TODO(BM): the Critical Illness wording below is English only. Move each string to
// i18n/dict/ci.{en,bm}.ts and build it with t(key, lang) as summary/hibah.ts does.

export function summarizeCi(
  result: ModuleResults["ci"],
  plan: SummaryPlan | undefined,
  lang: Lang,
): SummaryBody {
  const { out, flow } = result;
  return {
    moduleLabel: "Critical illness",
    kicker: "Recovery cash",
    gap: out.text.gapEarly,
    need: out.text.total,
    have: out.text.srcEarly,
    gapNote: "This is an estimate for an early-stage diagnosis. The certificate’s definitions decide when a plan pays.",
    meaning: [
      "Need is income, recovery and extra costs over the recovery period.",
      "Available is savings plus any existing CI that pays at that stage.",
      "The gap is what would still be needed.",
    ],
    flow: cleanFlow(flow),
    haveVsNeed: [
      { label: "Available", value: out.text.srcEarly, tone: "good" },
      { label: "Still needed", value: out.text.gapEarly, tone: "bad" },
      { label: "Estimated need", value: out.text.total, tone: "neutral" },
    ],
    plan: {
      name: safeText(plan?.name, defaultPlanName("ci", lang)),
      cover: safeText(plan?.cover, out.text.suggest),
      why: safeText(plan?.why, "Could provide cash during recovery, subject to the PDS & certificate terms.", 240),
      contribution: contributionText(plan, lang),
    },
  };
}
