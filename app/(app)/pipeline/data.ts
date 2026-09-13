import { createClient } from "@/lib/supabase/server";
import type { PipelineLead } from "./types";
import { COUNTED_CASE_STATUSES, type AncCase } from "@/lib/case-anc";
import type { PaymentFrequency } from "@/lib/contribution-schedule";

export type { PipelineLead } from "./types";
export { getStaleAfterDays } from "@/lib/staleness-server";

export async function getPipelineLeads(filters: { agent?: string; interest?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select(
      "id, lead_no, full_name, phone, email, date_of_birth, gender, is_smoker, lead_source, interest, budget_indicated, follow_up_date, pipeline_stage, status, agent_id, created_at, quotations(id, status, created_at, updated_at, is_customizer:raw_payload->>__customizer, quotation_plans(sort_order, monthly_contribution, annual_contribution)), lead_activity(created_at)",
    )
    .order("created_at", { ascending: false });

  if (filters.agent) query = query.eq("agent_id", filters.agent);
  if (filters.interest) query = query.eq("interest", filters.interest);

  const { data } = await query.returns<PipelineLead[]>();
  return data ?? [];
}

export async function getPipelineAgents() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name").eq("role", "agent").order("full_name");
  return data ?? [];
}

/**
 * Every case that counts toward ANC, flattened to what the ANC maths needs.
 *
 * Fetched separately rather than nested under the leads query: RLS on
 * case_submissions inherits lead visibility, so this is already scoped to the
 * same book, and nesting would drag a whole schedule (up to 72 rows) under
 * every lead just to count the ticked ones.
 */
export async function getCaseAncRows(): Promise<AncCase[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_submissions")
    .select("lead_id, status, payment_frequency, installment_contribution, contribution_schedule(paid)")
    .in("status", COUNTED_CASE_STATUSES as unknown as string[]);

  return (data ?? []).map((row) => {
    const r = row as unknown as {
      lead_id: string;
      status: string;
      payment_frequency: PaymentFrequency;
      installment_contribution: number | string | null;
      contribution_schedule: { paid: boolean }[] | null;
    };
    return {
      leadId: r.lead_id,
      status: r.status,
      paymentFrequency: r.payment_frequency,
      installmentContribution: r.installment_contribution == null ? null : Number(r.installment_contribution),
      paidCount: (r.contribution_schedule ?? []).filter((s) => s.paid).length,
    };
  });
}
