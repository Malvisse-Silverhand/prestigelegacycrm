import { MONTHS_PER_YEAR } from "@/app/(app)/pipeline/types";

// A lead's quotations, reduced to just what a potential-value figure needs.
// is_customizer arrives as PostgREST's `raw_payload->>__customizer`, so it is
// the *text* "true", not a boolean -- pulling the whole raw_payload for every
// row of a list page would carry the entire calculator state with it.
export type AncQuotation = {
  is_customizer: string | boolean | null;
  updated_at: string;
  quotation_plans: {
    sort_order: number;
    monthly_contribution: number | null;
    annual_contribution: number | null;
  }[];
};

export type LeadAnc = {
  anc: number;
  /** Which document the figure came from -- the two are not equally firm. */
  source: "quotation" | "estimate";
};

function isCustomizer(q: AncQuotation) {
  return q.is_customizer === true || q.is_customizer === "true";
}

function primaryPlanAnc(q: AncQuotation): number | null {
  if (q.quotation_plans.length === 0) return null;
  // sort_order 0 is the plan the agent leads with; the rest are alternatives.
  const primary = [...q.quotation_plans].sort((a, b) => a.sort_order - b.sort_order)[0];
  // annual_contribution is stored alongside the monthly figure, but fall back
  // to annualising rather than showing nothing if a row predates it.
  if (primary.annual_contribution != null) return primary.annual_contribution;
  if (primary.monthly_contribution != null) return primary.monthly_contribution * MONTHS_PER_YEAR;
  return null;
}

// The potential annual contribution for one lead.
//
// A customizer quotation wins over a calculator estimate whenever both exist:
// the estimate is what the calculator produced, the quotation is what the
// agent actually decided to put in front of the client. Within a kind, the
// most recently saved one wins.
export function leadPotentialAnc(quotations: AncQuotation[] | null | undefined): LeadAnc | null {
  if (!quotations || quotations.length === 0) return null;

  const newestFirst = (a: AncQuotation, b: AncQuotation) => (a.updated_at < b.updated_at ? 1 : -1);
  const customizer = quotations.filter(isCustomizer).sort(newestFirst);
  const estimates = quotations.filter((q) => !isCustomizer(q)).sort(newestFirst);

  for (const q of customizer) {
    const anc = primaryPlanAnc(q);
    if (anc != null) return { anc, source: "quotation" };
  }
  for (const q of estimates) {
    const anc = primaryPlanAnc(q);
    if (anc != null) return { anc, source: "estimate" };
  }
  return null;
}

export function fmtAnc(anc: number): string {
  return `RM ${Math.round(anc).toLocaleString("en-MY")}`;
}
