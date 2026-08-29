import { createClient } from "@/lib/supabase/server";
import type { MalaysianState, LeadSource } from "@/lib/lead-constants";

export const PAGE_SIZE = 20;

export type LeadFilters = {
  q?: string;
  from?: string;
  to?: string;
  status?: string;
  agent?: string;
  page?: number;
};

export type LeadRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  state: MalaysianState | null;
  occupation: string | null;
  postcode: string | null;
  agent_remark: string | null;
  lead_source: LeadSource | null;
  interest: string | null;
  gender: "male" | "female" | null;
  is_smoker: boolean | null;
  budget_indicated: string | null;
  best_time_to_reach: string | null;
  created_at: string;
  status: "hot" | "warm" | "cold" | "unassigned" | "closed";
  follow_up_date: string | null;
  pipeline_stage: string;
  agent_id: string | null;
  profiles: { full_name: string } | null;
};

export async function getLeads(filters: LeadFilters) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("leads")
    .select(
      "id, full_name, phone, email, date_of_birth, state, occupation, postcode, agent_remark, lead_source, interest, gender, is_smoker, budget_indicated, best_time_to_reach, created_at, status, follow_up_date, pipeline_stage, agent_id, profiles(full_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (filters.q) {
    // Strip characters with special meaning in PostgREST's ilike (%, _) and
    // its .or() filter DSL (`,` separates conditions, `(` `)` group them) --
    // otherwise a search term containing one can distort which condition
    // actually gets evaluated. RLS still governs the final result set either
    // way, but a malformed filter shouldn't produce confusing search results.
    // lead_source is a fixed enum now (Batch D) -- ilike against it would be
    // a Postgres type error, so it's dropped from the free-text search.
    const q = filters.q.replace(/[%_,()]/g, "");
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59`);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.agent) query = query.eq("agent_id", filters.agent);

  const { data, count } = await query.range(from, to).returns<LeadRow[]>();

  return { leads: data ?? [], total: count ?? 0, page };
}

export async function getFilterOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "agent")
    .order("full_name");
  return { agents: data ?? [] };
}

export async function getVisibleLeadTotal() {
  const supabase = await createClient();
  const { count } = await supabase.from("leads").select("id", { count: "exact", head: true });
  return count ?? 0;
}
