export type PipelineLead = {
  id: string;
  full_name: string;
  phone: string;
  lead_source: string | null;
  interest: string | null;
  budget_indicated: string | null;
  follow_up_date: string | null;
  is_stale: boolean;
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

// Closed Won cards should reflect the deal that was actually won, not
// whichever quotation happens to sort first -- prefer an accepted one, fall
// back to a sent one, then to whatever exists.
export function closedWonQuoteValue(lead: PipelineLead): number {
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

// Per-lead version of the same open-vs-closed-won rule, for contexts (Table
// view, sorting) that need one lead's figure rather than a column's sum.
export function leadPotentialValue(lead: PipelineLead): number {
  if (lead.pipeline_stage === "closed_won") return closedWonQuoteValue(lead);
  if (lead.pipeline_stage === "closed_lost") return 0;
  return parseBudget(lead.budget_indicated);
}

// For open stages there's no real premium yet -- budget_indicated (what the
// client said they can afford) is the closest thing to a potential-value
// figure. Closed Won has a real number instead: the accepted/sent
// quotation's actual monthly contribution.
export function stagePotentialValue(stage: string, cards: PipelineLead[]): number {
  if (stage === "closed_won") {
    return cards.reduce((sum, l) => sum + closedWonQuoteValue(l), 0);
  }
  if (stage === "closed_lost") return 0;
  return cards.reduce((sum, l) => sum + parseBudget(l.budget_indicated), 0);
}

export function daysSinceLastActivity(lead: PipelineLead): number {
  const timestamps = [lead.created_at, ...lead.lead_activity.map((a) => a.created_at)];
  const last = timestamps.reduce((max, t) => (t > max ? t : max));
  return Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
}
