import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError, STORYBOARD_MISSING_MESSAGE } from "./schema-error";
import { readAgentSettings, readOrgSettings, type AgentSettings, type OrgSettings } from "./settings";
import { BUILT_MODULES, type BuiltModule } from "./modules";
import { readStepStatus } from "./progress";
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

export type LeadStoryboardStatus = { ok: true; rows: StoryboardStatus[] } | { ok: false; message: string };

export async function getLeadStoryboardStatus(leadId: string): Promise<LeadStoryboardStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("storyboards")
    .select("module, step_status, outcome, saved_at")
    .eq("lead_id", leadId)
    .returns<{ module: StoryboardModule; step_status: unknown; outcome: string | null; saved_at: string | null }[]>();
  if (error) {
    const r = fail<never>(error);
    return { ok: false, message: r.ok ? "" : r.message };
  }
  return {
    ok: true,
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
    data: { org: readOrgSettings(org?.settings, module), agent: readAgentSettings(agent?.settings, module) },
  };
}

export function getHibahSettings(agentId: string) {
  return getStoryboardSettings("hibah", agentId);
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
