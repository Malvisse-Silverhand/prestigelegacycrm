export type PipelineLead = {
  id: string;
  full_name: string;
  phone: string;
  lead_source: string | null;
  interest: string | null;
  follow_up_date: string | null;
  is_stale: boolean;
  pipeline_stage: string;
  status: string;
  agent_id: string | null;
  created_at: string;
  quotations: { id: string; status: string; created_at: string; quotation_plans: { sort_order: number; monthly_contribution: number | null }[] }[];
};

export function primaryQuoteValue(lead: PipelineLead): number | null {
  const q = lead.quotations[0];
  if (!q || q.quotation_plans.length === 0) return null;
  const primary = [...q.quotation_plans].sort((a, b) => a.sort_order - b.sort_order)[0];
  return primary.monthly_contribution ?? null;
}
