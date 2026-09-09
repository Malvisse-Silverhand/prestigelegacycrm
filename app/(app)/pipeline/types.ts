import { daysSinceLastActivity as daysSince } from "@/lib/staleness";
import { leadPotentialAnc, MONTHS_PER_YEAR, toAnc } from "@/lib/lead-anc";

// Re-exported so the pipeline's callers keep importing ANC helpers from
// one place; the definitions live with the rest of the ANC logic.
export { MONTHS_PER_YEAR, toAnc };

export type PipelineLead = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | null;
  is_smoker: boolean | null;
  lead_source: string | null;
  interest: string | null;
  budget_indicated: string | null;
  follow_up_date: string | null;
  pipeline_stage: string;
  status: string;
  agent_id: string | null;
  created_at: string;
  // updated_at, is_customizer and annual_contribution are what
  // leadPotentialAnc needs; the rest drive the column totals.
  quotations: {
    id: string;
    status: string;
    created_at: string;
    updated_at: string;
    is_customizer: string | null;
    quotation_plans: { sort_order: number; monthly_contribution: number | null; annual_contribution: number | null }[];
  }[];
  lead_activity: { created_at: string }[];
};

// budget_indicated is free-text (agents type things like "RM 250" or "250"),
// so pull out the first number rather than assuming a clean numeric string.
export function parseBudget(v: string | null): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// One lead's potential, as a monthly figure (the column totals annualise it
// once, at display time).
//
// This used to key off the stage: a real quotation from Quoted onwards, and
// the typed budget before that. But the cards now show a lead's potential ANC
// wherever one exists, and an early-stage card reading RM 6,000 while the
// column above it read RM 0 is worse than either number alone. So both come
// from the same place: the quotation if there is one -- customizer first,
// exactly as the card decides -- and only then the budget the lead named.
//
// A saved estimate is better evidence than free text an agent typed, so where
// this changes a total it raises it toward something real.
export function leadPotentialValue(lead: PipelineLead): number {
  if (lead.pipeline_stage === "closed_lost") return 0;
  const potential = leadPotentialAnc(lead.quotations);
  if (potential) return potential.anc / MONTHS_PER_YEAR;
  return parseBudget(lead.budget_indicated);
}

export function stagePotentialValue(stage: string, cards: PipelineLead[]): number {
  if (stage === "closed_lost") return 0;
  return cards.reduce((sum, l) => sum + leadPotentialValue(l), 0);
}

export function daysSinceLastActivity(lead: PipelineLead): number {
  return daysSince(lead.created_at, lead.lead_activity.map((a) => a.created_at));
}
