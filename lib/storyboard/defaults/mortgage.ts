import type { MortgageInputs } from "../engine/mortgage";
import { MLTT_PLAN_PLACEHOLDER, MRTT_PLAN_PLACEHOLDER } from "../engine/mortgage";
import { COMMON_FAQ, COMMON_OBJECTIONS, COMMON_RISK_REASONS, type ModuleContent } from "./common";
import type { Localised } from "./localised";

/**
 * No design exists for this module. Loan figures are illustrative defaults, not
 * advice. Contributions are left empty on purpose: they show as "From official
 * illustration" until the agent enters a figure.
 */
export const MORTGAGE_DEFAULT_INPUTS: MortgageInputs = {
  nick: "Aiman",
  loanAmount: 320000,
  rate: 4.5,
  termYears: 30,
  mrttCoverYears: null,
  mrttAssumedRate: null,
  mlttCoverYears: null,
  mlttCover: null,
  policyYear: 5,
  mrttContribution: null,
  mlttContribution: null,
  mrttName: MRTT_PLAN_PLACEHOLDER,
  mlttName: MLTT_PLAN_PLACEHOLDER,
  chosenPlan: null,
};

export const MORTGAGE_DEFAULT_CONTENT: ModuleContent = {
  script: [
    { title: "Open", text: "{name}, the house is usually the biggest commitment. If you were gone, who would keep paying the instalment?" },
    { title: "Show the loan", text: "Your loan balance falls over time, but in the early years it stays close to the original amount, because most of the instalment is interest." },
    { title: "MRTT", text: "A reducing term plan lets the cover follow the loan balance on the schedule the plan assumes. If the actual rate is higher than the assumed rate, the cover may be below the balance. Check the certificate." },
    { title: "MLTT", text: "A level term plan keeps the same sum for the term. Where the sum is above the balance, the difference could go to the family after the loan is cleared, subject to the PDS & certificate terms." },
    { title: "Close", text: "Contribution figures come from the official illustration. Shall I prepare both so you can compare them side by side?" },
  ],
  riskItems: [
    { label: "Existing illness", detail: "May lead to loading, an exclusion or postponement. Prepare recent reports." },
    { label: "Joint borrowers", detail: "Decide who is covered and whether each borrower needs their own cover. Check how the plan treats joint loans." },
    { label: "Refinance or transfer", detail: "If the loan is refinanced or moved to another bank, check whether the cover continues or needs to be reassigned." },
    { label: "Loan term or rate changes", detail: "Variable rates and extended terms can leave a reducing-cover plan below the balance." },
    { label: "Assignment to the bank", detail: "Check whether the plan is assigned to the bank, and who receives any amount above the balance." },
  ],
  riskReasons: COMMON_RISK_REASONS,
  objections: [
    { q: "The bank already offered me MRTT.", a: "Let’s compare what the bank offered with these options on cover term, who receives the benefit and the contribution on the official illustration." },
    { q: "Why pay for level cover if the loan keeps falling?", a: "A level plan can leave an amount above the balance for the family. Whether that is worth the difference depends on the illustration figures." },
    { q: "I will pay off the loan early.", a: "If so, a reducing plan matches the balance more closely. If not, we can look at the other option. Tell me your plan and we choose together." },
    ...COMMON_OBJECTIONS.flatMap((g) => g.items),
  ],
  faq: [
    { q: "What is the difference between MRTT and MLTT?", a: "MRTT cover reduces over time, following a schedule. MLTT cover stays at the same sum for the term. Check the PDS for how each plan works." },
    ...COMMON_FAQ,
  ],
};

// TODO_BM: the Bahasa Malaysia content for this module is not written yet.
// MORTGAGE_TODO_BM is the English content standing in so the BM screens still
// render. Replace it with a full ModuleContent that is parallel to
// MORTGAGE_DEFAULT_CONTENT (same number of items, same order; spread
// COMMON_CONTENT.bm for the shared objections and FAQ), then delete this
// constant. See defaults/hibah.ts (HIBAH_CONTENT_BM) for the finished example.
export const MORTGAGE_TODO_BM: ModuleContent = MORTGAGE_DEFAULT_CONTENT;

export const MORTGAGE_CONTENT: Localised<ModuleContent> = {
  en: MORTGAGE_DEFAULT_CONTENT,
  bm: MORTGAGE_TODO_BM,
};
