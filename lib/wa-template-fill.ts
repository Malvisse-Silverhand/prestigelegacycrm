// Shared by the WhatsApp Flow page and the WhatsApp card on Lead Detail, so a
// template previewed in one place can never come out differently in the other.

export type FillableLead = {
  id: string;
  full_name: string;
  phone: string;
  quotations: {
    product: string;
    quotation_plans: {
      sort_order: number;
      monthly_contribution: number | null;
      coverage_detail: Record<string, unknown>;
    }[];
  }[];
};

export const PRODUCT_LABEL: Record<string, string> = {
  imedi_evolusi: "i-Medi Evolusi",
  hibah_nova: "Hibah i-Great Nova",
  hibah_chinta: "Hibah i-Great Chinta",
  hibah_mixed: "Hibah (mixed)",
};

export function fillTemplate(body: string, values: Record<string, string>) {
  // An unknown placeholder is left as-is rather than blanked, so a typo in a
  // template shows up as {{Whatever}} instead of silently vanishing.
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => values[key] ?? match);
}

function primaryPlan(lead: FillableLead | null) {
  const q = lead?.quotations[0];
  if (!q || q.quotation_plans.length === 0) return null;
  return [...q.quotation_plans].sort((a, b) => a.sort_order - b.sort_order)[0];
}

export function fillValuesFor(lead: FillableLead | null, agentName: string): Record<string, string> {
  if (!lead) return {};
  const q = lead.quotations[0];
  const plan = primaryPlan(lead);
  const detail = (plan?.coverage_detail ?? {}) as Record<string, unknown>;
  return {
    Name: lead.full_name,
    Agent: agentName,
    Product: q ? (PRODUCT_LABEL[q.product] ?? q.product) : "",
    Contribution: plan?.monthly_contribution != null ? String(plan.monthly_contribution) : "",
    Limit: plan ? String(detail.annual_limit ?? detail.sum_covered ?? "") : "",
  };
}

// Templates are authored with <br> in places; WhatsApp wants real newlines.
export function toMessageText(body: string, values: Record<string, string>) {
  return fillTemplate(body, values).replace(/<br\s*\/?>/g, "\n");
}
