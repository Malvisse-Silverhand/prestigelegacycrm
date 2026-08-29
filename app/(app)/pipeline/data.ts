import { createClient } from "@/lib/supabase/server";
import type { PipelineLead } from "./types";

export type { PipelineLead } from "./types";
export { primaryQuoteValue } from "./types";

export async function getPipelineLeads(filters: { agent?: string; interest?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select(
      "id, full_name, phone, lead_source, interest, budget_indicated, follow_up_date, is_stale, pipeline_stage, status, agent_id, created_at, quotations(id, status, created_at, quotation_plans(sort_order, monthly_contribution)), lead_activity(created_at)",
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

// Same source Settings > Lead Distribution reads/writes (global row, unit_id
// is null) -- is_stale itself is never actually updated anywhere in the app
// (it's stuck at its `default false`), so staleness here is computed live
// from lead_activity instead of trusting that column.
export async function getStaleAfterDays() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("distribution_settings")
    .select("stale_after_days")
    .is("unit_id", null)
    .maybeSingle();
  return data?.stale_after_days ?? 3;
}
