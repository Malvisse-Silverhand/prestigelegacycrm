import type { MedicalInputs } from "../engine/medical";
import { COMMON_FAQ, COMMON_OBJECTIONS, type ModuleContent } from "./common";

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

/** Step 2 price table rows. The plan name comes from the organisation settings. */
export const MEDICAL_PLAN_ROWS = [
  { suffix: "[profile]" },
  { suffix: "+ riders · [profile]" },
  { suffix: "higher tier · [profile]" },
  { suffix: "higher tier + riders · [profile]" },
];

export const MEDICAL_CLAIM_STEPS = [
  { title: "Show card & IC", desc: "At the panel hospital admission counter" },
  { title: "Hospital requests a GL", desc: "A guarantee letter (GL) is sent to the operator" },
  { title: "You are treated", desc: "Focus on recovery, with no large deposit" },
  { title: "Bill paid directly", desc: "You pay only a small portion, for example the deductible" },
];

export const MEDICAL_TILES = [
  { t: "Room & board", d: "Daily room limit by plan" },
  { t: "ICU / CCU", d: "Intensive care on actual charges" },
  { t: "Surgery", d: "Surgeon, anaesthetist, operating theatre" },
  { t: "Medicine & tests", d: "MRI, CT scan, lab, ward medicine" },
  { t: "Cancer & dialysis", d: "Including outpatient treatment, if the plan includes it" },
  { t: "Other outpatient care", d: "Depends on the plan; check the benefit schedule" },
];

export const MEDICAL_COMPARE = [
  { k: "When you resign / retire", a: "Ends", b: "Yours, goes wherever you go" },
  { k: "Annual limit", a: "[check the employer's scheme]", b: "Depends on the plan; see the PDS" },
  { k: "Lifetime limit", a: "Set by the employer", b: "Per plan; see the PDS" },
  { k: "Spouse & children", a: "Often not covered", b: "Can be covered, subject to the plan" },
  { k: "Terms", a: "Can change when the employer changes provider", b: "Follow your own certificate" },
  { k: "Taken at an older age", a: "A new card may cost more; existing illness is excluded", b: "Taken while healthy, more is likely to be covered" },
  { k: "Coverage term", a: "While employed", b: "Up to the plan's expiry age" },
];

export const MEDICAL_GLOSSARY = [
  { t: "Room & board", d: "Daily room limit. A pricier room means you pay the difference; a cheaper room does not pay out the balance." },
  { t: "Annual limit", d: "Maximum claimable per year. Some plans add extra limits after certain diagnoses." },
  { t: "Lifetime limit", d: "Maximum over the life of the plan." },
  { t: "Deductible (per disability)", d: "You pay the first amount of each disability; some items may be exempt. Check the certificate." },
  { t: "Deductible (per year)", d: "You pay the first amount of eligible claims each year, then the plan pays up to the limit." },
  { t: "Co-payment", d: "On some plans, claims above a level are shared between you and the operator. See the certificate." },
  { t: "Waiting period", d: "Accidents are often covered earlier than illness, and specified illnesses can have a longer wait. [Check the plan's waiting periods in the PDS.]" },
  { t: "Pre-existing conditions", d: "Conditions that existed before joining are usually excluded or limited." },
  { t: "Cashless & GL", d: "Once the guarantee letter (GL) is approved, the panel hospital bills the operator directly, up to plan limits." },
  { t: "Step-up vs level", d: "Step-up starts lower and changes at set intervals; level starts higher but is steadier. Contributions can be revised under the certificate terms." },
  { t: "Government hospital allowance", d: "Daily cash if treated at a government hospital, if the plan includes it." },
  { t: "Tabarru'", d: "A donation contribution into the participants' shared fund." },
];

/** Plan-specific points shown beside the Step 3 checklist. */
export const MEDICAL_RISK_SPECIFIC = [
  "Pre-existing conditions are usually not covered even if the application is approved.",
  "Specified illnesses can have a longer waiting period. [Check the PDS for the days that apply.]",
  "Past hospital stays or repeated treatment are assessed closely by the underwriter.",
];

export const MEDICAL_DEFAULT_CONTENT: ModuleContent = {
  script: [
    { title: "A real case", text: "[Your claim story] Share one real case you handled, with the client's consent and no identifying details: when they joined, what happened, the bill, and how much the client paid in the end." },
    { title: "Daily risk", text: "The test we just did shows {name}'s daily risk is {level}, mainly because of: {reason}." },
    { title: "Connect it to them", text: "If it were {scenario}, the bill could be around {bill}. Company cover is {company}. The remaining {gap} would have to come from somewhere. [Source for the bill figure]" },
    { title: "The panel isn't yours", text: "A company panel can end when you change jobs, are let go or retire. An own card goes wherever you go, subject to its terms." },
    { title: "The age factor", text: "For the same plan and class, starting earlier usually means a lower monthly contribution, and you join while still healthy." },
    { title: "Close & disclosure", text: "I'll prepare 2 to 3 options with a clear comparison. Before we fill in the form, we declare all health history honestly so any claim can be assessed properly." },
  ],
  riskItems: [
    { label: "Existing illness", detail: "Examples: high blood pressure, diabetes, heart, asthma, cholesterol, kidney, cancer, mental health. Likely outcome: may be accepted with loading, an exclusion for that condition, postponed or declined. Declare fully with doctor's reports." },
    { label: "Smoke / vape", detail: "Examples: including vape and occasional smoking. Likely outcome: higher smoker rates. Never declare non-smoker if you smoke: a claim can be rejected." },
    { label: "High / low BMI", detail: "Examples: weight and height outside the normal range. Likely outcome: loading or postponement. Note the exact weight and height." },
    { label: "Hospitalised / surgery before", detail: "Examples: recent stays or operations such as C-section, appendix, kidney stones. Likely outcome: the underwriter may ask for hospital reports; an exclusion is possible." },
    { label: "Tests / symptoms not yet investigated", detail: "Examples: waiting for test results, a lump, chest pain, a specialist referral. Likely outcome: usually postponed until results are out. Never submit without declaring." },
    { label: "Hazardous occupation", detail: "Examples: construction, factory machinery, motorcycle delivery, offshore, security. Likely outcome: higher contribution or limits on accident benefits." },
    { label: "Risky hobbies", detail: "Examples: motorsport, scuba diving, high-altitude climbing, skydiving. Likely outcome: activity exclusion or loading." },
    { label: "Family history", detail: "Examples: parents or siblings with heart disease, cancer or stroke at a young age. Likely outcome: loading is possible." },
    { label: "Amount out of line with income", detail: "Examples: cover far above what the income level supports. Likely outcome: financial underwriting with payslips and proof of income; may be reduced or declined." },
    { label: "Age outside limits", detail: "Examples: too old or too young for the plan or rider. Likely outcome: choose another plan or a shorter term." },
    { label: "Incomplete documents / information", detail: "Examples: IC copy, address, nominee, signature, health confirmation. Likely outcome: application pending or cancelled. Check everything before submitting." },
  ],
  riskReasons: [
    { label: "Non-disclosure", detail: "Health information not declared at application. A common reason claims are rejected or certificates cancelled." },
    { label: "Waiting period", detail: "Illness within the waiting period of the plan. [Check the days in the PDS.] Accidents are often covered earlier." },
    { label: "Exclusions", detail: "Pre-existing conditions, cosmetic treatment, self-inflicted injury, drugs or alcohol, excluded activities." },
    { label: "Certificate lapsed", detail: "Contributions overdue past the grace period can end the cover. Set up auto-debit." },
    { label: "Doesn’t meet the definition", detail: "Specific benefits follow the certificate’s clinical definitions, not the name of the illness." },
    { label: "Incomplete claim documents", detail: "Medical reports, bills, GL forms or proof of the event are missing." },
  ],
  objections: [
    { q: "I’m young and healthy, why now?", a: "This is when the contribution is usually lowest and your health record is clean. After a diagnosis, that condition may be excluded or the application declined." },
    { q: "Government hospitals are cheap, right?", a: "They are good, but you can’t choose your doctor or timing, and there can be waiting lists. If you still choose government care, some plans pay a daily cash allowance. Check the PDS." },
    { q: "My company already has a panel.", a: "Panel limits depend on the employer’s scheme and end when you leave the job. Your own card complements the company benefit. [Check the company panel’s actual limit.]" },
    { q: "Can the contribution go up?", a: "Yes, contributions can be revised under the certificate terms. The operator notifies participants before a change takes effect; check the notice period in the certificate." },
    { q: "If I never claim, is it wasted?", a: "Your tabarru’ helps other participants. Some plans also have a cash value account; check the PDS for how it works. It is not guaranteed." },
    { q: "Can I use it from day one?", a: "Accidents are often covered earlier than illness, and specified illnesses can have a longer waiting period. Don’t wait until symptoms appear. [Check the waiting periods in the PDS.]" },
    { q: "Hospital bills aren’t that high.", a: "The scenario figures on screen are placeholders with a source. Let’s use a source we agreed on and check it against your own hospital’s estimate." },
    ...COMMON_OBJECTIONS.flatMap((g) => g.items),
  ],
  faq: [
    { q: "What happens at the hospital?", a: "Show card & IC, the hospital requests a GL, you are treated without a large deposit, and you pay a small portion such as the deductible and items not covered." },
    { q: "What if the room costs more than my limit?", a: "You pay the difference. If the room is cheaper, the balance is not paid out." },
    { q: "Are pre-existing conditions covered?", a: "Usually not. Declare honestly; if information is hidden, a claim can be rejected or the certificate terminated." },
    { q: "Can I cancel after signing up?", a: "There is a free-look period after you receive the certificate. [Check the number of days and the refund terms in the PDS.]" },
    { q: "Can I use it for outpatient visits?", a: "Depends on the plan. Check the benefit schedule in the PDS." },
    ...COMMON_FAQ,
  ],
};
