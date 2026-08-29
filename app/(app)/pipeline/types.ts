import { daysSinceLastActivity as daysSince } from "@/lib/staleness";

export type PipelineLead = {
  id: string;
  full_name: string;
  phone: string;
  lead_source: string | null;
  interest: string | null;
  budget_indicated: string | null;
  follow_up_date: string | null;
  pipeline_stage: string;
  status: string;
  agent_id: string | null;
  created_at: string;
  quotations: { id: string; status: string; created_at: string; quotation_plans: { sort_order: number; monthly_contribution: number | null }[] }[];
  lead_activity: { created_at: string }[];
};

export function primaryQuoteValue(lead: PipelineLead): number | null {
  const q = lead.quotations[0];
  if (!q || q.quotation_plans.length === 0) return null;
  const primary = [...q.quotation_plans].sort((a, b) => a.sort_order - b.sort_order)[0];
  return primary.monthly_contribution ?? null;
}

// Quoted and Closed Won cards both have a guaranteed real quotation (Quoted
// can't be entered without one -- see updateStage), so both should reflect
// the deal itself rather than whichever quotation happens to sort first --
// prefer an accepted one, fall back to a sent one, then to whatever exists.
export function realQuoteValue(lead: PipelineLead): number {
  const accepted = lead.quotations.find((q) => q.status === "accepted");
  const sent = lead.quotations.find((q) => q.status === "sent");
  const q = accepted ?? sent ?? lead.quotations[0];
  if (!q || q.quotation_plans.length === 0) return 0;
  const primary = [...q.quotation_plans].sort((a, b) => a.sort_order - b.sort_order)[0];
  return primary.monthly_contribution ?? 0;
}

// budget_indicated is free-text (agents type things like "RM 250" or "250"),
// so pull out the first number rather than assuming a clean numeric string.
export function parseBudget(v: string | null): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// Per-lead version of the same rule, for contexts (Table view, sorting) that
// need one lead's figure rather than a column's sum.
export function leadPotentialValue(lead: PipelineLead): number {
  if (lead.pipeline_stage === "closed_won" || lead.pipeline_stage === "quoted") return realQuoteValue(lead);
  if (lead.pipeline_stage === "closed_lost") return 0;
  return parseBudget(lead.budget_indicated);
}

// New/Contacted/Follow Up have no real premium yet -- budget_indicated (what
// the client said they can afford) is the closest thing to a potential-value
// figure there. Quoted and Closed Won both have a real number instead: the
// accepted/sent quotation's actual monthly contribution.
export function stagePotentialValue(stage: string, cards: PipelineLead[]): number {
  if (stage === "closed_won" || stage === "quoted") {
    return cards.reduce((sum, l) => sum + realQuoteValue(l), 0);
  }
  if (stage === "closed_lost") return 0;
  return cards.reduce((sum, l) => sum + parseBudget(l.budget_indicated), 0);
}

export function daysSinceLastActivity(lead: PipelineLead): number {
  return daysSince(lead.created_at, lead.lead_activity.map((a) => a.created_at));
}
