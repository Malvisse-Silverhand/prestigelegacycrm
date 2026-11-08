import { defaultPlanName } from "../defaults/common";
import { rmWhole, type ModuleResults } from "../engine";
import type { Lang } from "../i18n";
import type { SummaryBody } from "./hibah";
import { cleanFlow, contributionText, safeText, type SummaryPlan } from "./shared";

// TODO(BM): the Business Protection wording below is English only. Move each string to
// i18n/dict/business.{en,bm}.ts and build it with t(key, lang) as summary/hibah.ts does.

export function summarizeBusiness(
  result: ModuleResults["business"],
  plan: SummaryPlan | undefined,
  lang: Lang,
): SummaryBody {
  const { out, flow } = result;
  return {
    moduleLabel: "Business protection",
    kicker: "If a key owner were gone",
    gap: out.text.total,
    need: out.text.total,
    have: rmWhole(0),
    gapNote: "This is an estimate across keyman, buy-sell and loan protection. Shown before any cover is arranged.",
    meaning: [
      "Keyman is the cost of lost profit and replacing a key person.",
      "Buy-sell is the cash partners would need for a share buy-out.",
      "Loan is the personally guaranteed debt without protection.",
    ],
    flow: cleanFlow(flow),
    haveVsNeed: out.rows.map((r) => ({ label: r.label, value: rmWhole(r.amount), tone: "neutral" as const })),
    plan: {
      name: safeText(plan?.name, defaultPlanName("business", lang)),
      cover: safeText(plan?.cover, out.text.total),
      why: safeText(plan?.why, "Each need could have its own funding, subject to the PDS & certificate terms.", 240),
      contribution: contributionText(plan, lang),
    },
  };
}
