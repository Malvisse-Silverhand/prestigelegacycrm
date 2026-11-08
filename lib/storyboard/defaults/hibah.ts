import type { HibahInputs } from "../engine/hibah";
import { COMMON_FAQ, COMMON_OBJECTIONS, COMMON_RISK_REASONS, DEFAULT_PLAN_NAMES, type ModuleContent } from "./common";

/** Design defaults from 02-Main.src.html. Produces need RM720,806 / have RM175,000 / gap RM545,806. */
export const HIBAH_DEFAULT_INPUTS: HibahInputs = {
  nick: "Aiman",
  age: 34,
  scenario: "death",
  income: 6000,
  method: "replace",
  replace: 80, // Default: replace 80%
  other: 0,
  years: 5,
  inflation: 3,
  eFood: 1500,
  eUtil: 400,
  eSchool: 800,
  eTrans: 600,
  eRent: 0,
  eOther: 500,
  home: 320000,
  homeCov: "unsure",
  homePart: 0,
  car: 60000,
  carCov: "covered",
  carPart: 0,
  otherDebt: 12000,
  edu: 60000,
  emergency: 15000,
  funeral: 8000,
  savings: 25000,
  existing: 150000,
};

export const HIBAH_DEFAULT_PLAN = {
  name: DEFAULT_PLAN_NAMES.hibah,
  base: 350000,
  /** Benefit multiples of the base amount. Check the PDS. */
  mults: [1, 0, 0, 0, 0],
  multLabels: [
    "Death",
    "Accidental death",
    "Accidental death · public transport",
    "Accidental death · overseas",
    "Accidental death · natural disaster",
  ],
};

export const HIBAH_DEFAULT_CONTENT: ModuleContent = {
  script: [
    { title: "Open", text: "{name}, we work hard every day, and we also leave something behind. If you were gone last night, who would carry on paying for the house, the kitchen and the children’s school today?" },
    { title: "Show the numbers", text: "From what we just calculated, your family would need {need}. What is in place today is {have}. The gap is {gap}." },
    { title: "Explain hibah", text: "With a conditional hibah nomination, the death benefit is paid to the beneficiary you name, subject to the certificate and a valid nomination. An executor (wasi) only administers the estate." },
    { title: "Show the plan", text: "As an example, a base amount of {base} can pay a multiple for accidental death, depending on the plan. I’ll show you the exact figures from the official illustration." },
    { title: "Close", text: "Let’s talk it through, understand it first, and choose what fits your budget. Could I prepare an illustration for around {gap}? I’ll need your date of birth, occupation and smoking status." },
  ],
  riskItems: [
    { label: "Existing illness", detail: "e.g. diabetes, high blood pressure, asthma. May lead to extra contribution (loading), an exclusion or postponement. Prepare recent reports." },
    { label: "Smoke / vape", detail: "Smoker rates may apply. Some operators run a nicotine test. [Check the plan rules on how long since quitting counts.]" },
    { label: "High / low BMI", detail: "BMI outside the normal range may trigger loading or a medical check." },
    { label: "Hospitalised / surgery before", detail: "Declare dates, diagnosis and outcome. Discharge summaries speed up underwriting." },
    { label: "Tests / symptoms not yet investigated", detail: "Pending tests usually mean postponement until results are available. Apply after the results." },
    { label: "Hazardous occupation", detail: "Occupation class affects acceptance and contribution; some roles may be declined or excluded." },
    { label: "Risky hobbies", detail: "e.g. diving, motor racing, mountaineering. May lead to an activity exclusion." },
    { label: "Family history", detail: "Early heart disease, cancer or hereditary illness among parents or siblings may be considered." },
    { label: "Amount out of line with income", detail: "Cover much higher than income can justify may trigger financial underwriting and proof of income." },
    { label: "Age outside limits", detail: "Check the plan’s entry age and coverage term before quoting." },
    { label: "Incomplete documents / information", detail: "Missing details slow down or stop the application. Use the checklist from Step 2." },
  ],
  riskReasons: COMMON_RISK_REASONS,
  objections: [
    { q: "I already have EPF / ASB.", a: "That’s a good foundation. EPF is mainly for retirement and goes through its own nomination; ASB is savings that may take time to release. Compare the balance with the family-support figure from Step 1." },
    { q: "It’s expensive.", a: "Let’s start from the budget you’re comfortable with. Protection that fits the budget today is better than none, and it can be increased as income grows." },
    { q: "I’m still young, maybe later.", a: "Terms depend on age and health when you apply, so earlier is usually easier. The family’s needs already exist today." },
    { q: "My wife works, she can manage.", a: "Her income helps, and we already counted it as ongoing support. The gap figure is what is still left after her contribution." },
    { q: "My home loan already has MRTT.", a: "Good, then the loan is addressed. MRTT only clears the loan; the family still needs money for daily living, school and other debts." },
    ...COMMON_OBJECTIONS.flatMap((g) => g.items),
  ],
  faq: [
    { q: "Is hibah takaful the same as a medical card?", a: "No. Hibah takaful pays a lump sum to your beneficiaries on death (and TPD if included). A medical card pays hospital bills while you are alive." },
    { q: "Is this hibah subject to faraid?", a: "With a valid conditional hibah nomination, the benefit is paid to the beneficiary you name, subject to the certificate terms. I’ll show you the operator’s exact wording." },
    { q: "Is critical illness included?", a: "It depends on the plan and any rider added. Check the Product Disclosure Sheet before assuming it is covered." },
    ...COMMON_FAQ,
  ],
};
