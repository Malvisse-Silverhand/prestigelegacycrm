// Helpers shared by every module's client-summary builder. Kept apart from
// client-summary.ts so each module's builder (summary/<module>.ts) can import
// them without a circular import, and so parallel module work never touches
// the same file.

import { rmWhole } from "../engine/money";
import { t, type Lang } from "../i18n";
import type { FlowSlide } from "../types";

export type SummaryAgent = { firstName: string; wa: string };

/** What the agent chose to show as the plan card. All optional. */
export type SummaryPlan = {
  name?: string;
  cover?: string;
  why?: string;
  /** Monthly contribution the agent typed. Omit to show the illustration note. */
  contribution?: number | null;
};

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

/** Agent-typed text, whitespace-collapsed and length-limited; the fallback when empty or naming another operator. */
export function safeText(value: unknown, fallback: string, max = 120): string {
  const s = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (s === "" || mentionsOtherOperator(s)) return fallback;
  return s.slice(0, max);
}

export function firstName(full: string): string {
  return String(full ?? "").trim().split(/\s+/)[0] ?? "";
}

/** "RM250/mo" when the agent entered a figure, otherwise "From official illustration". */
export function contributionText(plan: SummaryPlan | undefined, lang: Lang): string {
  const c = plan?.contribution;
  return typeof c === "number" && Number.isFinite(c) && c > 0
    ? t("summary.perMonth", lang, { amount: rmWhole(c) })
    : t("scene.official", lang);
}

export function cleanFlow(flow: FlowSlide[]): FlowSlide[] {
  return flow.map((f) => ({
    tag: f.tag, title: f.title, value: f.value, desc: f.desc,
    meterLabel: f.meterLabel, meterText: f.meterText, meter: f.meter, tone: f.tone,
  }));
}
