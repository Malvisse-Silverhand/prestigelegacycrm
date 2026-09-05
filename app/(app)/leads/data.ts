import { createClient } from "@/lib/supabase/server";
import type { MalaysianState, LeadSource } from "@/lib/lead-constants";

export const PAGE_SIZE = 20;

// The Dashboard's three alert cards each drill into one of these. They're a
// saved view rather than a plain column filter: each needs follow-up dates or
// quotation coverage compared against today, which the field filters can't
// express. Definitions live in ./views so client components can read them.
import { isLeadView } from "./views";
export { LEAD_VIEWS, isLeadView, type LeadView } from "./views";

export type LeadFilters = {
  q?: string;
  from?: string;
  to?: string;
  status?: string;
  agent?: string;
  view?: string;
  page?: number;
};

// Stages where a lead is still being worked. Mirrors OPEN_STAGES in the
// dashboard's data.ts -- the counts on the cards and the rows behind them have
// to agree, otherwise a card says 6 and the list it opens shows 9.
const OPEN_STAGES = ["new", "contacted", "follow_up", "quoted"];

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

// Lead ids that already have a quotation. Fetched by the callers rather than
// inside filteredLeadsQuery: that has to stay synchronous, because a
// PostgREST builder is itself a thenable -- `await`ing a function that
// returns one would execute the query instead of handing back the builder.
async function quotedLeadIds(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("quotations").select("lead_id").not("lead_id", "is", null);
  return [...new Set((data ?? []).map((q) => q.lead_id as string))];
}

function filteredLeadsQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: LeadFilters,
  alreadyQuotedIds?: string[],
) {
  let query = supabase
    .from("leads")
    .select(
      "id, full_name, phone, email, date_of_birth, state, occupation, address, postcode, agent_remark, lead_source, interest, gender, is_smoker, budget_indicated, best_time_to_reach, created_at, status, follow_up_date, pipeline_stage, agent_id, profiles(full_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (isLeadView(filters.view)) {
    const today = new Date().toISOString().slice(0, 10);
    if (filters.view === "overdue") {
      query = query.not("follow_up_date", "is", null).lt("follow_up_date", today).in("pipeline_stage", OPEN_STAGES);
    } else if (filters.view === "followup_today") {
      query = query.eq("follow_up_date", today).in("pipeline_stage", OPEN_STAGES);
    } else if (filters.view === "no_quotation") {
      // No join to express "has no quotation", so the quoted ids come in from
      // the caller and get excluded here.
      query = query.in("pipeline_stage", ["contacted", "follow_up"]);
      if (alreadyQuotedIds && alreadyQuotedIds.length > 0) {
        query = query.not("id", "in", `(${alreadyQuotedIds.join(",")})`);
      }
    }
  }

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

  const excludeIds = filters.view === "no_quotation" ? await quotedLeadIds(supabase) : undefined;
  const { data, count } = await filteredLeadsQuery(supabase, filters, excludeIds)
    .range(from, to)
    .returns<LeadRow[]>();

  return { leads: data ?? [], total: count ?? 0, page };
}

// Same filters as getLeads but every matching row instead of one page --
// used by "Export to CSV" so it exports what the agent is actually looking
// at, not just the 20 rows currently on screen. Capped well above any real
// unit's lead count so a runaway filter can't pull the whole table.
const EXPORT_ROW_CAP = 20000;

export async function getAllLeadsForExport(filters: LeadFilters) {
  const supabase = await createClient();
  const excludeIds = filters.view === "no_quotation" ? await quotedLeadIds(supabase) : undefined;
  const { data } = await filteredLeadsQuery(supabase, filters, excludeIds)
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
