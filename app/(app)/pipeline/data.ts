import { createClient } from "@/lib/supabase/server";
import type { PipelineLead } from "./types";

export type { PipelineLead } from "./types";
export { primaryQuoteValue } from "./types";

export async function getPipelineLeads(filters: { agent?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select(
      "id, full_name, phone, lead_source, interest, follow_up_date, is_stale, pipeline_stage, status, agent_id, created_at, quotations(id, status, created_at, quotation_plans(sort_order, monthly_contribution))",
    )
    .order("created_at", { ascending: false });

  if (filters.agent) query = query.eq("agent_id", filters.agent);

  const { data } = await query.returns<PipelineLead[]>();
  return data ?? [];
}

export async function getPipelineAgents() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name").eq("role", "agent").order("full_name");
  return data ?? [];
}
