import type { CiInputs } from "../engine/ci";
import { COMMON_FAQ, COMMON_OBJECTIONS, COMMON_RISK_REASONS, type ModuleContent } from "./common";

export const CI_DEFAULT_INPUTS: CiInputs = {
  nick: "Siti",
  income: 5000,
  commit: 3000,
  pct: 70,
  months: 12,
  rehab: 20000,
  emer: 10000,
  cg: 0,
  cgMonths: 0,
  waiver: "yes",
  contrib: 0,
  savings: 10000,
  employer: 0,
  countEmp: "no",
  structure: "late",
  ciAmt: 30000,
  earlyPct: 50,
  booster: "0",
  recovery: "0",
  reduces: "unsure",
  base: 0,
  afford: 0,
  deps: {},
};

export const CI_COMMITMENT_LABELS = [
  "Home instalment / rent",
  "Car / motorcycle loan",
  "Electricity, water, phone & internet",
  "Groceries & family meals",
  "School fees, childcare, school transport",
  "Caregiver / helper",
  "Travel to hospital & parking",
  "Follow-up treatment, physio & rehab",
  "Business / staff costs if self-employed",
  "Living fund until able to work again",
];

export const CI_DEPENDENCY_ITEMS = [
  { label: "I’m the main breadwinner", hint: "The family relies on my income." },
  { label: "I run a business / earn commission", hint: "No work = income can drop fast." },
  { label: "Emergency fund under 6 months", hint: "Savings may run out quickly." },
  { label: "Home loan / high rent", hint: "Big commitments keep running." },
  { label: "Vehicle loan / other debts", hint: "Monthly payments still due." },
  { label: "Children / dependants", hint: "Their needs don’t stop while we’re ill." },
  { label: "Spouse also relies on my income", hint: "Household income is easily hit." },
  { label: "Company medical is limited / tied to the job", hint: "Cover can be lost when changing or leaving work." },
  { label: "Not sure how much CI I already have", hint: "Have a plan but don’t know the rider sum covered." },
  { label: "Current savings are earmarked", hint: "House, education, business, retirement and so on." },
];

/** The CI story starts empty and is agent-only: it is never copied to a client summary. */
export const CI_DEFAULT_STORY = "";

export const CI_DEFAULT_CONTENT: ModuleContent = {
  script: [
    { title: "Open", text: "{name}, if a doctor told you tomorrow that you had a critical illness, what would happen to the household income in the first few months?" },
    { title: "Show the numbers", text: "From what we just calculated, recovery could need {need}. What is available is {have}. The shortfall is {gap}." },
    { title: "Early or late", text: "Some plans pay only at a later stage and some pay a portion at an early stage. The definitions in the certificate decide which applies. [Check the plan’s stage definitions]" },
    { title: "Why cash helps", text: "CI cover pays a lump sum when the certificate’s definition is met, so treatment and living costs are not drawn from savings alone. [statistic + source, if you use one]" },
    { title: "Close", text: "Let’s choose an amount that fits your budget. Could I prepare an illustration for around {gap}? I’ll need your date of birth, occupation and smoking status." },
  ],
  riskItems: [
    { label: "Existing illness", detail: "May lead to loading, an exclusion or postponement. Prepare recent reports." },
    { label: "Family history", detail: "Early heart disease, cancer or stroke in close family may be considered." },
    { label: "Smoke / vape", detail: "Smoker rates may apply." },
    { label: "Pending tests or symptoms", detail: "Usually postponed until results are available." },
    { label: "Amount out of line with income", detail: "May trigger financial underwriting and proof of income." },
    { label: "Waiting period", detail: "[Check the CI waiting period in the PDS and certificate.]" },
  ],
  riskReasons: COMMON_RISK_REASONS,
  objections: [
    { q: "I have a medical card already.", a: "A medical card pays hospital bills. CI cover pays a lump sum for income, recovery and living costs when the definition is met. They do different jobs." },
    { q: "I’m too young for critical illness.", a: "Terms depend on age and health at application, so earlier is usually easier. [statistic + source, if you use one]" },
    { q: "Will CI reduce my hibah cover?", a: "It depends on the plan. Some plans reduce the base cover when a CI payout is made. We check the certificate together before deciding." },
    ...COMMON_OBJECTIONS.flatMap((g) => g.items),
  ],
  faq: [
    { q: "What is early-stage CI?", a: "Some plans pay a portion of the sum at an earlier stage of a listed condition. The certificate defines which stages and how much." },
    ...COMMON_FAQ,
  ],
};
