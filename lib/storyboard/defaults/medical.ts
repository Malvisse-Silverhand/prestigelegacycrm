import type { MedicalInputs } from "../engine/medical";
import { COMMON_FAQ, COMMON_OBJECTIONS, COMMON_RISK_REASONS, type ModuleContent } from "./common";

const BILL_SOURCE = "[source + date, e.g. hospital estimate or published figure]";

/**
 * Bill amounts and inflation are PLACEHOLDERS, kept from the design only so the
 * calculator is not empty. They are not facts: the agent must replace the amount
 * and fill in the source before showing a client.
 */
export const MEDICAL_DEFAULT_INPUTS: MedicalInputs = {
  nick: "Nurul",
  work: "employed",
  company: 20000,
  savings: 10000,
  scenario: 7,
  monthlySave: 500,
  cardCost: 300,
  inflation: 15,
  inflationSource: "[source for medical inflation rate]",
  bills: [
    { label: "Heart attack, 2 stents", amount: 60000, source: BILL_SOURCE },
    { label: "Stroke, treatment & rehab", amount: 75000, source: BILL_SOURCE },
    { label: "Heart bypass", amount: 120000, source: BILL_SOURCE },
    { label: "Kidney transplant", amount: 150000, source: BILL_SOURCE },
    { label: "Accident with ICU stay", amount: 165000, source: BILL_SOURCE },
    { label: "Open-heart / valve surgery", amount: 200000, source: BILL_SOURCE },
    { label: "Leukaemia, bone marrow transplant", amount: 300000, source: BILL_SOURCE },
    { label: "Breast cancer, full treatment", amount: 395000, source: BILL_SOURCE },
    { label: "Liver transplant", amount: 500000, source: BILL_SOURCE },
  ],
  checked: { w0: true, l0: true },
};

export const MEDICAL_DEFAULT_CONTENT: ModuleContent = {
  script: [
    { title: "Your claim story", text: "[Your claim story] Share one real case you handled: when they joined, what happened, the bill, and how much the client paid in the end." },
    { title: "Daily risk", text: "The test we just did shows {name}’s daily risk is {level}, mainly because of the factors we ticked." },
    { title: "The bill", text: "If it were {scenario}, the bill could be around {bill}. The remaining {gap} would have to come from somewhere. [Cite the source for the bill figure]" },
    { title: "Company panel", text: "A company panel can end when you change jobs, are let go or retire. An own card stays with you, subject to its terms." },
    { title: "Start early", text: "For the same plan, starting earlier usually means a lower contribution at entry, and you join while healthy." },
    { title: "Close", text: "I’ll prepare 2 to 3 options with a clear comparison. Before we fill in the form, we declare all health history honestly so any claim can be assessed properly." },
  ],
  riskItems: [
    { label: "Existing illness", detail: "High blood pressure, diabetes, heart, asthma, cholesterol, kidney, cancer, mental health. May be accepted with loading, an exclusion, postponed or declined. Declare fully with doctor’s reports." },
    { label: "Smoke / vape", detail: "Including vape and occasional smoking. Never declare non-smoker if you smoke: a claim can be affected." },
    { label: "Recent symptoms or tests", detail: "Pending tests usually mean postponement until results are available." },
    { label: "Previous hospital stay or surgery", detail: "Declare dates, diagnosis and outcome. Discharge summaries speed up underwriting." },
    { label: "Waiting period", detail: "[Check the waiting periods in the PDS and certificate for accidents, illness and specified illness.]" },
    { label: "Pre-existing conditions", detail: "Conditions present before joining are usually excluded or limited. Check the certificate." },
  ],
  riskReasons: COMMON_RISK_REASONS,
  objections: [
    { q: "My company already gives me a medical card.", a: "That helps today. It may end when you leave the job, and limits can be used up. An own card goes wherever you go, subject to its terms." },
    { q: "I never get sick.", a: "That’s good. The card is for the bill you can’t plan for. Let’s look at the scenario we picked and what it would cost you." },
    { q: "Hospital bills aren’t that high.", a: "The scenario figures are placeholders with a source. Let’s use the source we agreed on and check it against your own hospital’s estimate." },
    ...COMMON_OBJECTIONS.flatMap((g) => g.items),
  ],
  faq: [
    { q: "What is a guarantee letter (GL)?", a: "At a panel hospital the plan can issue a letter so the hospital bills the operator directly, up to plan limits and subject to terms." },
    { q: "Can I use it for outpatient visits?", a: "Depends on the plan. Check the benefit schedule in the PDS." },
    ...COMMON_FAQ,
  ],
};
