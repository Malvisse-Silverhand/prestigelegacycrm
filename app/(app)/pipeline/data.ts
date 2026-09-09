import { createClient } from "@/lib/supabase/server";
import type { PipelineLead } from "./types";

export type { PipelineLead } from "./types";
export { getStaleAfterDays } from "@/lib/staleness-server";

export async function getPipelineLeads(filters: { agent?: string; interest?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select(
      "id, full_name, phone, email, date_of_birth, gender, is_smoker, lead_source, interest, budget_indicated, follow_up_date, pipeline_stage, status, agent_id, created_at, quotations(id, status, created_at, updated_at, is_customizer:raw_payload->>__customizer, quotation_plans(sort_order, monthly_contribution, annual_contribution)), lead_activity(created_at)",
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
