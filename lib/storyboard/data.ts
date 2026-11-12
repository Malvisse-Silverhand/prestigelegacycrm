import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError, STORYBOARD_MISSING_MESSAGE } from "./schema-error";
import { getStoryboardLang } from "./i18n/server";
import type { Lang } from "./i18n";
import { readAgentSettings, readOrgSettings, type AgentSettings, type OrgSettings } from "./settings";
import { BUILT_MODULES, type BuiltModule } from "./modules";
import { readStepStatus } from "./progress";
import { purgeCutoff } from "./practice";
import type { InsightRow } from "./insights";
import {
  STORYBOARD_MODULES,
  STORYBOARD_OUTCOMES,
  type StepStatus,
  type StoryboardModule,
  type StoryboardOutcome,
} from "./types";

export type DataResult<T> = { ok: true; data: T } | { ok: false; missing: boolean; message: string };

function fail<T>(error: { code?: string } | null): DataResult<T> {
  if (isMissingSchemaError(error)) return { ok: false, missing: true, message: STORYBOARD_MISSING_MESSAGE };
  return { ok: false, missing: false, message: "Couldn't load the storyboard. Please try again." };
}

export type SavedStoryboard = {
  id: string;
  module: StoryboardModule;
  inputs: unknown;
  notes: string | null;
  outcome: StoryboardOutcome | null;
  stepStatus: StepStatus;
  savedAt: string | null;
};

function asOutcome(v: unknown): StoryboardOutcome | null {
  return typeof v === "string" && (STORYBOARD_OUTCOMES as readonly string[]).includes(v) ? (v as StoryboardOutcome) : null;
}

type RawRow = {
  id: string;
  module: StoryboardModule;
  inputs: unknown;
  notes: string | null;
  outcome: string | null;
  step_status: unknown;
  saved_at: string | null;
};

function shape(r: RawRow): SavedStoryboard {
  return {
    id: r.id,
    module: r.module,
    inputs: r.inputs,
    notes: r.notes,
    outcome: asOutcome(r.outcome),
    stepStatus: readStepStatus(r.step_status),
    savedAt: r.saved_at,
  };
}

const COLS = "id, module, inputs, notes, outcome, step_status, saved_at";

/** All storyboards saved for a lead (RLS decides whether the viewer can see them). */
export async function getLeadStoryboards(leadId: string): Promise<DataResult<SavedStoryboard[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("storyboards").select(COLS).eq("lead_id", leadId).returns<RawRow[]>();
  if (error) return fail(error);
  return { ok: true, data: (data ?? []).map(shape) };
}

/** Light version for the lead popup tab: no inputs. */
export type StoryboardStatus = {
  module: StoryboardModule;
  savedAt: string | null;
  stepStatus: StepStatus;
  outcome: StoryboardOutcome | null;
};

/** `lang` is the viewer's storyboard language, so the lead tab needs no extra prop. */
export type LeadStoryboardStatus =
  | { ok: true; rows: StoryboardStatus[]; lang: Lang }
  | { ok: false; message: string; missing: boolean; lang: Lang };

export async function getLeadStoryboardStatus(leadId: string): Promise<LeadStoryboardStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("storyboards")
    .select("module, step_status, outcome, saved_at")
    .eq("lead_id", leadId)
    .returns<{ module: StoryboardModule; step_status: unknown; outcome: string | null; saved_at: string | null }[]>();
  const lang = await getStoryboardLang();
  if (error) {
    const r = fail<never>(error);
    return { ok: false, message: r.ok ? "" : r.message, missing: r.ok ? false : r.missing, lang };
  }
  return {
    ok: true,
    lang,
    rows: (data ?? []).map((r) => ({
      module: r.module,
      savedAt: r.saved_at,
      stepStatus: readStepStatus(r.step_status),
      outcome: asOutcome(r.outcome),
    })),
  };
}

/** Org defaults plus this agent's own overrides for a module. */
export async function getStoryboardSettings(
  module: BuiltModule,
  agentId: string,
  lang: Lang = "en",
): Promise<DataResult<{ org: OrgSettings; agent: AgentSettings }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("storyboard_settings")
    .select("scope, owner_id, settings")
    .eq("module", module)
    .returns<{ scope: "org" | "agent"; owner_id: string | null; settings: unknown }[]>();
  if (error) return fail(error);
  const rows = data ?? [];
  const org = rows.find((r) => r.scope === "org");
  const agent = rows.find((r) => r.scope === "agent" && r.owner_id === agentId);
  return {
    ok: true,
    data: { org: readOrgSettings(org?.settings, module), agent: readAgentSettings(agent?.settings, module, lang) },
  };
}

export function getHibahSettings(agentId: string, lang: Lang = "en") {
  return getStoryboardSettings("hibah", agentId, lang);
}

/** Org defaults for every built module (SuperAdmin settings tab). */
export async function getAllOrgSettings(): Promise<DataResult<Record<BuiltModule, OrgSettings>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("storyboard_settings")
    .select("module, settings")
    .eq("scope", "org")
    .returns<{ module: StoryboardModule; settings: unknown }[]>();
  if (error) return fail(error);
  const out = {} as Record<BuiltModule, OrgSettings>;
  for (const m of BUILT_MODULES) {
    out[m] = readOrgSettings((data ?? []).find((r) => r.module === m)?.settings, m);
  }
  return { ok: true, data: out };
}

export type StoryboardListRow = {
  id: string;
  leadId: string;
  leadNo: number | null;
  leadName: string;
  agentName: string | null;
  module: StoryboardModule;
  stepStatus: StepStatus;
  savedAt: string | null;
  outcome: StoryboardOutcome | null;
  gap: string | null;
  sharedToPortal: boolean;
};

type ListRaw = {
  id: string;
  lead_id: string;
  module: StoryboardModule;
  step_status: unknown;
  outcome: string | null;
  saved_at: string | null;
  outputs: unknown;
  shared_to_portal: boolean;
  leads: { lead_no: number | null; full_name: string; profiles: { full_name: string } | null } | null;
};

function readGap(outputs: unknown): string | null {
  if (!outputs || typeof outputs !== "object") return null;
  const text = (outputs as Record<string, unknown>).text;
  if (!text || typeof text !== "object") return null;
  // Hibah and Medical: gap. Critical illness: early-stage gap. Business: total need.
  const t = text as Record<string, unknown>;
  for (const key of ["gap", "gapEarly", "total"]) {
    if (typeof t[key] === "string") return t[key];
  }
  return null;
}

/** Storyboards of every lead the viewer can see (RLS), newest save first. */
export async function listStoryboards(filter: { q?: string; module?: string }): Promise<DataResult<StoryboardListRow[]>> {
  const supabase = await createClient();
  let query = supabase
    .from("storyboards")
    .select(
      "id, lead_id, module, step_status, outcome, saved_at, outputs, shared_to_portal, leads!inner(lead_no, full_name, profiles!leads_agent_id_fkey(full_name))",
    )
    .order("saved_at", { ascending: false, nullsFirst: false })
    .limit(300);
  if (filter.module && (STORYBOARD_MODULES as readonly string[]).includes(filter.module)) {
    query = query.eq("module", filter.module);
  }
  // Strip characters that mean something in a PostgREST filter value.
  const q = (filter.q ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, 60);
  if (q) query = query.ilike("leads.full_name", `%${q}%`);

  const { data, error } = await query.returns<ListRaw[]>();
  if (error) return fail(error);
  return {
    ok: true,
    data: (data ?? []).map((r) => ({
      id: r.id,
      leadId: r.lead_id,
      leadNo: r.leads?.lead_no ?? null,
      leadName: r.leads?.full_name ?? "—",
      agentName: r.leads?.profiles?.full_name ?? null,
      module: r.module,
      stepStatus: readStepStatus(r.step_status),
      savedAt: r.saved_at,
      outcome: asOutcome(r.outcome),
      gap: readGap(r.outputs),
      sharedToPortal: r.shared_to_portal === true,
    })),
  };
}

// ---------------------------------------------------------------------------
// Practice sessions (storyboards rows with no lead).
// ---------------------------------------------------------------------------

export type PracticeSession = {
  id: string;
  module: StoryboardModule;
  title: string | null;
  stepStatus: StepStatus;
  outcome: StoryboardOutcome | null;
  savedAt: string | null;
  updatedAt: string;
};

type PracticeRaw = {
  id: string;
  module: StoryboardModule;
  title: string | null;
  step_status: unknown;
  outcome: string | null;
  saved_at: string | null;
  updated_at: string;
};

/**
 * Deletes the signed-in user's OWN practice sessions nobody touched for 30
 * days. Runs through the RLS client (the delete policy only lets an owner
 * delete their own practice rows), and any error is ignored: the next visit
 * simply tries again.
 */
export async function purgeMyExpiredPractice(ownerId: string, now: Date = new Date()): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase
      .from("storyboards")
      .delete()
      .is("lead_id", null)
      .eq("owner_id", ownerId)
      .lt("updated_at", purgeCutoff(now).toISOString());
  } catch {
    // Housekeeping only.
  }
}

/** The signed-in user's practice sessions, most recently touched first. */
export async function listMyPractice(ownerId: string): Promise<DataResult<PracticeSession[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("storyboards")
    .select("id, module, title, step_status, outcome, saved_at, updated_at")
    .is("lead_id", null)
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false })
    .limit(200)
    .returns<PracticeRaw[]>();
  if (error) return fail(error);
  return {
    ok: true,
    data: (data ?? []).map((r) => ({
      id: r.id,
      module: r.module,
      title: r.title,
      stepStatus: readStepStatus(r.step_status),
      outcome: asOutcome(r.outcome),
      savedAt: r.saved_at,
      updatedAt: r.updated_at,
    })),
  };
}

export type PracticeDetail = {
  id: string;
  module: StoryboardModule;
  title: string | null;
  ownerId: string | null;
  ownerName: string | null;
  inputs: unknown;
  notes: string | null;
  outcome: StoryboardOutcome | null;
  stepStatus: StepStatus;
  savedAt: string | null;
  updatedAt: string;
};

/** One practice session, or null when it doesn't exist / RLS hides it / it was attached to a lead. */
export async function getPracticeStoryboard(id: string): Promise<DataResult<PracticeDetail | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("storyboards")
    .select("id, module, title, owner_id, inputs, notes, outcome, step_status, saved_at, updated_at")
    .eq("id", id)
    .is("lead_id", null)
    .maybeSingle<
      PracticeRaw & { owner_id: string | null; inputs: unknown; notes: string | null }
    >();
  if (error) return fail(error);
  if (!data) return { ok: true, data: null };
  let ownerName: string | null = null;
  if (data.owner_id) {
    const { data: p } = await supabase.from("profiles").select("full_name").eq("id", data.owner_id).maybeSingle<{ full_name: string }>();
    ownerName = p?.full_name ?? null;
  }
  return {
    ok: true,
    data: {
      id: data.id,
      module: data.module,
      title: data.title,
      ownerId: data.owner_id,
      ownerName,
      inputs: data.inputs,
      notes: data.notes,
      outcome: asOutcome(data.outcome),
      stepStatus: readStepStatus(data.step_status),
      savedAt: data.saved_at,
      updatedAt: data.updated_at,
    },
  };
}

/** Rows for the insights page: everything RLS lets the viewer see since `since`. */
export async function listInsightRows(since: Date): Promise<DataResult<InsightRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("storyboards")
    .select("module, lead_id, owner_id, saved_by, step_status, outcome, created_at, leads(agent_id)")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000)
    .returns<
      {
        module: StoryboardModule;
        lead_id: string | null;
        owner_id: string | null;
        saved_by: string | null;
        step_status: unknown;
        outcome: string | null;
        created_at: string;
        leads: { agent_id: string | null } | null;
      }[]
    >();
  if (error) return fail(error);
  return {
    ok: true,
    data: (data ?? []).map((r) => ({
      module: r.module,
      practice: r.lead_id === null,
      // Practice: its owner. Lead row: the lead's agent, else whoever saved it.
      actorId: r.lead_id === null ? r.owner_id : (r.leads?.agent_id ?? r.saved_by),
      stepStatus: readStepStatus(r.step_status),
      outcome: asOutcome(r.outcome),
      createdAt: r.created_at,
    })),
  };
}

/** Names for a set of profile ids (RLS-scoped: a leader reads their agents). */
export async function getProfileNames(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids).returns<{ id: string; full_name: string }[]>();
  for (const p of data ?? []) out.set(p.id, p.full_name);
  return out;
}
