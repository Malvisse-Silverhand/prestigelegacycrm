/**
 * The plans an agent can file a case against, and what kind of cover each one
 * is.
 *
 * Two separate ideas live here and they are deliberately not the same field:
 *
 *   * the PLAN NAME is the product on the certificate -- one per case;
 *   * the CATEGORIES are what that cover actually does -- several per case,
 *     because a single certificate routinely carries more than one kind
 *     (a hibah plan with a medical rider attached is both).
 *
 * Picking a plan pre-selects its usual category, but the agent can add or
 * remove any of them: the product tells you what a case usually is, the tags
 * tell you what this one actually is, and only the tags are read downstream.
 *
 * No clock, no client data, no database -- a dictionary the forms and the
 * portal both resolve against.
 */

export const PLAN_CATEGORIES = ["medical_card", "hibah", "investment_linked", "critical_illness"] as const;

export type PlanCategoryKey = (typeof PLAN_CATEGORIES)[number];

export const PLAN_CATEGORY_LABEL: Record<PlanCategoryKey, string> = {
  medical_card: "Medical Card",
  hibah: "Life Takaful/Hibah",
  investment_linked: "Investment Linked Takaful",
  critical_illness: "Critical Illness",
};

/** The short form, for a chip on a crowded list row. */
export const PLAN_CATEGORY_SHORT: Record<PlanCategoryKey, string> = {
  medical_card: "MED",
  hibah: "HIBAH",
  investment_linked: "ILT",
  critical_illness: "CI",
};

export type PlanOption = {
  name: string;
  /** What this plan is, before the agent adjusts it. */
  defaultCategories: PlanCategoryKey[];
};

// Grouped the way an agent thinks about them, and rendered as option groups
// in the dropdown so the list stays readable as it grows.
export const PLAN_GROUPS: { label: string; plans: PlanOption[] }[] = [
  {
    label: "Medical Card",
    plans: [
      { name: "i-MEDI EVOLUSI", defaultCategories: ["medical_card"] },
      { name: "i-MEDI SIGNATURE", defaultCategories: ["medical_card"] },
    ],
  },
  {
    label: "Life Takaful/Hibah",
    plans: [
      { name: "i-GREAT NOVA", defaultCategories: ["hibah"] },
      { name: "i-GREAT CHINTA", defaultCategories: ["hibah"] },
    ],
  },
  {
    label: "Investment Linked Takaful",
    plans: [{ name: "i-GREAT MEGA PLUS", defaultCategories: ["investment_linked"] }],
  },
  {
    label: "Critical Illness",
    plans: [{ name: "i-GREAT YAQEEN", defaultCategories: ["critical_illness"] }],
  },
];

export const PLAN_OPTIONS: PlanOption[] = PLAN_GROUPS.flatMap((g) => g.plans);

/**
 * Anything not on the list. Cases filed before this dropdown existed carry
 * free text ("Medical Card", "Hibah i-GREAT NOVA"), and the operator adds
 * products faster than this ships -- so the escape hatch stays.
 */
export const PLAN_OTHER = "Others";

/**
 * Whether one benefit on a certificate is still being paid for. Free text
 * before this -- every row on the book today reads exactly "Inforce", so the
 * dropdown loses nothing by being closed rather than open like the plan
 * name's "Others" escape hatch.
 */
export const BENEFIT_STATUSES = ["Inforce", "Inforce Potential Lapse", "Lapsed"] as const;
export type BenefitStatus = (typeof BENEFIT_STATUSES)[number];

export function isKnownPlan(name: string): boolean {
  return PLAN_OPTIONS.some((p) => p.name === name.trim());
}

/** The categories a plan is usually filed under, for pre-selecting the tags. */
export function defaultCategoriesFor(planName: string): PlanCategoryKey[] {
  return PLAN_OPTIONS.find((p) => p.name === planName.trim())?.defaultCategories ?? [];
}

export function isPlanCategory(value: string): value is PlanCategoryKey {
  return (PLAN_CATEGORIES as readonly string[]).includes(value);
}

/** Drops anything unrecognised, so a stale tag can never reach the UI. */
export function cleanCategories(values: readonly string[] | null | undefined): PlanCategoryKey[] {
  if (!values) return [];
  const seen = new Set<PlanCategoryKey>();
  for (const value of values) {
    const key = String(value).trim();
    if (isPlanCategory(key)) seen.add(key);
  }
  // Returned in the canonical order rather than the order they were stored,
  // so the same set of tags always reads the same way.
  return PLAN_CATEGORIES.filter((key) => seen.has(key));
}
