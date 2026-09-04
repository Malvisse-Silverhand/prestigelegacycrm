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
  address: string | null;
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

function filteredLeadsQuery(supabase: Awaited<ReturnType<typeof createClient>>, filters: LeadFilters) {
  let query = supabase
    .from("leads")
    .select(
      "id, full_name, phone, email, date_of_birth, state, occupation, address, postcode, agent_remark, lead_source, interest, gender, is_smoker, budget_indicated, best_time_to_reach, created_at, status, follow_up_date, pipeline_stage, agent_id, profiles(full_name)",
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

  return query;
}

export async function getLeads(filters: LeadFilters) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count } = await filteredLeadsQuery(supabase, filters).range(from, to).returns<LeadRow[]>();

  return { leads: data ?? [], total: count ?? 0, page };
}

// Same filters as getLeads but every matching row instead of one page --
// used by "Export to CSV" so it exports what the agent is actually looking
// at, not just the 20 rows currently on screen. Capped well above any real
// unit's lead count so a runaway filter can't pull the whole table.
const EXPORT_ROW_CAP = 20000;

export async function getAllLeadsForExport(filters: LeadFilters) {
  const supabase = await createClient();
  const { data } = await filteredLeadsQuery(supabase, filters)
    .range(0, EXPORT_ROW_CAP - 1)
    .returns<LeadRow[]>();

  return data ?? [];
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
