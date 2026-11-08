import { CONTRIBUTION_FROM_ILLUSTRATION } from "../engine/mortgage";
import type { ModuleResults } from "../engine";
import { t, type Lang } from "../i18n";
import type { SummaryBody } from "./hibah";
import { cleanFlow, safeText, type SummaryPlan } from "./shared";

// TODO(BM): Mortgage (Phase 4b) wording is English only apart from the
// official-illustration note. Move strings to i18n/dict/mortgage.{en,bm}.ts.

export function summarizeMortgage(
  result: ModuleResults["mortgage"],
  plan: SummaryPlan | undefined,
  lang: Lang,
): SummaryBody {
  const { out, flow } = result;
  const contribution = out.chosenPlan === "mltt" ? out.contribution.mltt : out.contribution.mrtt;
  return {
    moduleLabel: "Mortgage protection",
    kicker: "Home loan",
    gap: out.text.mrttGap,
    need: out.text.balance,
    have: out.text.mrttCover,
    gapNote: "Year " + out.atYear.year + " on the schedule discussed. Reducing cover follows the assumed schedule; level cover stays the same.",
    meaning: [
      "Loan balance is what is still owed at that year.",
      "Reducing cover (MRTT) follows the balance on the plan’s assumed schedule.",
      "Level cover (MLTT) keeps the same sum; any amount above the balance could go to the family.",
    ],
    flow: cleanFlow(flow),
    haveVsNeed: [
      { label: "Loan balance", value: out.text.balance, tone: "neutral" },
      { label: out.mrttName, value: out.text.mrttCover, tone: "good" },
      { label: out.mlttName, value: out.text.mlttCover, tone: "good" },
    ],
    plan: {
      name: safeText(plan?.name, out.chosenPlan === "mltt" ? out.mlttName : out.mrttName),
      cover: safeText(plan?.cover, out.chosenPlan === "mltt" ? out.text.mlttCover : out.text.mrttCover),
      why: safeText(plan?.why, "Compared side by side. Subject to the PDS & certificate terms.", 240),
      contribution: contribution === CONTRIBUTION_FROM_ILLUSTRATION ? t("scene.official", lang) : contribution,
    },
  };
}
