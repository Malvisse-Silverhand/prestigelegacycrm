// Builds the ONLY payload a client (the portal) ever sees.
//
// Rules, enforced here rather than in the UI:
//  - The output is assembled field by field. Nothing is spread from `inputs`,
//    `outputs`, notes, scripts, objections, checklists, settings or the lead's
//    pipeline stage, so a new field added elsewhere cannot leak by accident.
//  - Great Eastern only. Plan names are the bracketed placeholders unless the
//    agent typed their own, and any name that mentions another operator is
//    replaced by the placeholder.
//  - No guarantees. The word "guarantee" is never used for benefits, and the
//    gap is never said to be filled 100%.
//  - Contribution is "From official illustration" unless the agent entered a figure.
//  - No IC numbers and no agency commission or ANC figures: none of those
//    exist in the engine outputs, and none are read.

import { rmWhole } from "./engine/money";
import { DEFAULT_PLAN_NAMES } from "./defaults/common";
import { CONTRIBUTION_FROM_ILLUSTRATION } from "./engine/mortgage";
import type { ModuleResults } from "./engine";
import type { ClientSummary, FlowSlide, HaveVsNeedItem, StoryboardModule } from "./types";

export type SummaryAgent = { firstName: string; wa: string };

/** What the agent chose to show as the plan card. All optional. */
export type SummaryPlan = {
  name?: string;
  cover?: string;
  why?: string;
  /** Monthly contribution the agent typed. Omit to show the illustration note. */
  contribution?: number | null;
};

export type SummaryOutputs<M extends StoryboardModule = StoryboardModule> = ModuleResults[M];

const DISCLAIMER_KEY = "disclaimer.default";

// Other takaful / insurance operators. A plan name containing one of these is
// replaced by the placeholder. Great Eastern is us, so it is not listed.
const OTHER_OPERATORS = [
  "etiqa", "takaful malaysia", "syarikat takaful", "prudential", "aia", "allianz", "manulife",
  "zurich", "generali", "axa", "hong leong", "fwd", "tokio marine", "sun life", "mcis", "allianz",
  "public mutual", "bsn takaful", "af takaful", "sunway",
];

export function mentionsOtherOperator(text: string): boolean {
  const lower = text.toLowerCase();
  return OTHER_OPERATORS.some((o) => new RegExp("(^|[^a-z])" + o + "([^a-z]|$)").test(lower));
}

function safeText(value: unknown, fallback: string, max = 120): string {
  const s = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (s === "" || mentionsOtherOperator(s)) return fallback;
  return s.slice(0, max);
}

function firstName(full: string): string {
  return String(full ?? "").trim().split(/\s+/)[0] ?? "";
}

function contributionText(plan: SummaryPlan | undefined): string {
  const c = plan?.contribution;
  return typeof c === "number" && Number.isFinite(c) && c > 0 ? rmWhole(c) + "/mo" : CONTRIBUTION_FROM_ILLUSTRATION;
}

function cleanFlow(flow: FlowSlide[]): FlowSlide[] {
  return flow.map((f) => ({
    tag: f.tag, title: f.title, value: f.value, desc: f.desc,
    meterLabel: f.meterLabel, meterText: f.meterText, meter: f.meter, tone: f.tone,
  }));
}

const NEXT_STEPS = [
  "Review the illustration together",
  "Confirm your details so the quotation is accurate",
  "Decide on an amount that fits your budget",
];

export function buildClientSummary<M extends StoryboardModule>(
  module: M,
  _inputs: unknown,
  result: SummaryOutputs<M>,
  agent: SummaryAgent,
  plan?: SummaryPlan,
): ClientSummary {
  // _inputs is accepted for API symmetry but deliberately never read: the
  // client payload comes from computed outputs and the whitelisted plan only.
  void _inputs;
  const base = {
    agentFirstName: firstName(agent.firstName),
    agentWa: String(agent.wa ?? "").replace(/[^\d+]/g, ""),
    disclaimerKey: DISCLAIMER_KEY,
    nextSteps: [...NEXT_STEPS],
  };

  // The module tag selects which result shape to read; each case narrows it.
  switch (module as StoryboardModule) {
    case "hibah": {
      const { out, flow } = result as ModuleResults["hibah"];
      const haveVsNeed: HaveVsNeedItem[] = [
        { label: "In place", value: out.text.have, tone: "good" },
        { label: "Still unprotected", value: out.text.gap, tone: "bad" },
        { label: "Estimated need", value: out.text.need, tone: "neutral" },
      ];
      return {
        ...base,
        moduleLabel: "Hibah",
        kicker: "Family protection",
        gap: out.text.gap,
        need: out.text.need,
        have: out.text.have,
        gapNote: out.gap > 0
          ? "This is an estimate based on the figures discussed. A hibah could fill the gap, subject to the PDS & certificate terms."
          : "On the figures discussed, what is in place meets the estimated need.",
        meaning: [
          "Need is the family support, debts and one-off costs we estimated together.",
          "In place is your savings and existing cover.",
          "The gap is what the family would still need to find.",
        ],
        flow: cleanFlow(flow),
        haveVsNeed,
        plan: {
          name: safeText(plan?.name, DEFAULT_PLAN_NAMES.hibah),
          cover: safeText(plan?.cover, out.text.gap),
          why: safeText(plan?.why, "Could help the family cover the gap, subject to the PDS & certificate terms.", 240),
          contribution: contributionText(plan),
        },
      };
    }
    case "medical": {
      const { out, flow } = result as ModuleResults["medical"];
      return {
        ...base,
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
          name: safeText(plan?.name, DEFAULT_PLAN_NAMES.medical),
          cover: safeText(plan?.cover, "From official illustration"),
          why: safeText(plan?.why, "An own card could help keep savings intact, subject to limits, deductibles and exclusions.", 240),
          contribution: contributionText(plan),
        },
      };
    }
    case "ci": {
      const { out, flow } = result as ModuleResults["ci"];
      return {
        ...base,
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
          name: safeText(plan?.name, DEFAULT_PLAN_NAMES.ci),
          cover: safeText(plan?.cover, out.text.suggest),
          why: safeText(plan?.why, "Could provide cash during recovery, subject to the PDS & certificate terms.", 240),
          contribution: contributionText(plan),
        },
      };
    }
    case "business": {
      const { out, flow } = result as ModuleResults["business"];
      return {
        ...base,
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
          name: safeText(plan?.name, DEFAULT_PLAN_NAMES.business),
          cover: safeText(plan?.cover, out.text.total),
          why: safeText(plan?.why, "Each need could have its own funding, subject to the PDS & certificate terms.", 240),
          contribution: contributionText(plan),
        },
      };
    }
    case "mortgage": {
      const { out, flow } = result as ModuleResults["mortgage"];
      return {
        ...base,
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
          contribution: out.chosenPlan === "mltt" ? out.contribution.mltt : out.contribution.mrtt,
        },
      };
    }
  }
}
