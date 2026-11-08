// Shared shapes and content for the module defaults.
//
// Everything here is an editable default, not a fact. Scripts use bracketed
// placeholders ([statistic + source]) wherever a number would otherwise be
// invented. Wording is Great Eastern only, with no guarantees and no promise of
// acceptance, claim payment or returns.

export type ScriptStep = { title: string; text: string };
export type RiskItem = { label: string; detail: string };
export type Objection = { q: string; a: string };
export type ObjectionGroup = { name: string; items: Objection[] };

export type ModuleContent = {
  script: ScriptStep[];
  riskItems: RiskItem[];
  /** Why a claim or application can fail, shown under the checklist. */
  riskReasons: RiskItem[];
  objections: Objection[];
  faq: Objection[];
};

/** Tokens a script may use. Filled at render time, never stored filled in. */
export const SCRIPT_TOKENS = ["{name}", "{need}", "{have}", "{gap}", "{base}", "{bill}", "{level}", "{scenario}"] as const;

export const DEFAULT_PLAN_NAMES = {
  hibah: "[GE hibah plan]",
  medical: "[GE medical plan]",
  ci: "[GE critical illness plan]",
  business: "[GE business protection plan]",
  mrtt: "[GE MRTT plan]",
  mltt: "[GE MLTT plan]",
} as const;

export const COMMON_RISK_REASONS: RiskItem[] = [
  { label: "Non-disclosure", detail: "Health or lifestyle facts not declared at application can affect a claim when they come to light." },
  { label: "Waiting period", detail: "Certain benefits only apply after a waiting period from the start date. Explain it clearly at sign-up." },
  { label: "Exclusions", detail: "Conditions or activities excluded in the certificate or by underwriting are not paid." },
  { label: "Certificate lapsed", detail: "Unpaid contributions past the grace period can end the cover. Set up auto-debit." },
  { label: "Doesn’t meet the definition", detail: "Benefits are paid only when the event meets the certificate’s exact definition." },
  { label: "Incomplete claim documents", detail: "Missing forms, reports or proof of relationship delay a claim. Keep a document checklist for the family." },
];

export const COMMON_OBJECTIONS: ObjectionGroup[] = [
  {
    name: "Money",
    items: [
      { q: "No money / tight budget.", a: "Understood. We don’t need everything now. Cover the biggest risk first with an amount that feels comfortable, then add when the budget allows." },
      { q: "More expensive than other companies.", a: "Let’s compare like for like: amount covered, benefits, term and exclusions. The lowest price is not always the plan that suits the need." },
      { q: "Afraid I can’t keep paying later.", a: "Choose a contribution that is sustainable for you and set up auto-debit. We can review together if your situation changes." },
      { q: "When my salary goes up.", a: "Fair. Can we start small now and increase it when the raise comes? The risk doesn’t wait for a raise." },
    ],
  },
  {
    name: "Delay",
    items: [
      { q: "Let me think about it first.", a: "Of course. Which part would you like to think about: the amount, the budget, or the plan itself? I’ll send a short summary." },
      { q: "Need to discuss with my wife / husband.", a: "That’s the right call for a family decision. Can we set 20 minutes this week so you both see the same numbers?" },
      { q: "I’ll contact you later.", a: "Sure. To make it easy, may I follow up on a day that suits you? I’ll put it in my calendar." },
      { q: "Maybe next month.", a: "No problem. Shall we prepare the illustration now so it’s ready, and start whenever you decide?" },
    ],
  },
  {
    name: "Trust",
    items: [
      { q: "Takaful claims are difficult.", a: "Most claim problems come from non-disclosure or missing documents. We’ll declare everything properly now, and I’ll guide the family when the time comes. [statistic + source, if you use one]" },
      { q: "Agents disappear after the sale.", a: "You’ll get my contact and the operator’s hotline. Servicing is part of my job, not an extra." },
      { q: "My friend got rejected.", a: "Sorry to hear that. Do you know why? Usually it is a waiting period, an exclusion or something not declared. That is what we check in Step 3." },
    ],
  },
  {
    name: "Perception & religion",
    items: [
      { q: "Takaful means not accepting fate (takdir).", a: "Takaful is planning and effort (ikhtiar), then we leave the outcome to Allah. Like locking the house before travelling." },
      { q: "It’s like gambling / riba.", a: "Takaful is built on mutual help (ta’awun) and donation (tabarru’), and products are reviewed by the operator’s Shariah committee. I can show you the Shariah concept in the PDS." },
      { q: "Afraid that buying it will make it happen.", a: "Planning doesn’t invite misfortune. It simply means the family is prepared, whatever happens." },
    ],
  },
  {
    name: "Feels covered enough",
    items: [
      { q: "I’m healthy, I don’t need it.", a: "Being healthy is when applications are usually easier, since terms depend on health today. The family’s needs already exist." },
      { q: "I’m already covered.", a: "Good, let’s count it. Step 1 already deducts existing cover; the gap is what is still left." },
      { q: "I want to compare other products first.", a: "Please do. Here is a checklist to compare: amount, benefits, term, exclusions and contribution." },
    ],
  },
];

export const COMMON_FAQ: Objection[] = [
  { q: "How much is the monthly contribution?", a: "It depends on age, gender, smoking status, occupation and the amount of cover. I’ll prepare an official illustration with the exact figure." },
  { q: "What if I already have health problems?", a: "Declare everything. The underwriter may accept on standard terms, add a loading, exclude a condition or postpone. See Step 3." },
  { q: "Are contributions and cash values guaranteed?", a: "Contributions can be revised under the certificate terms. Investment-linked cash values are not guaranteed. Check the PDS." },
  { q: "How does the family make a claim?", a: "Notify the operator or agent, then submit the claim form and the documents the certificate asks for. I will help the family through it." },
];
