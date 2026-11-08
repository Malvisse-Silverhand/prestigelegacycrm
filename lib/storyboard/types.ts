// Hand-written row and payload types for the Financial Storyboard tables.
// Keep in step with supabase/migrations/202611050900*_storyboard*.sql and
// 20261105090400_portal_access_log.sql. A test compares STORYBOARD_MODULES with
// the enum in the migration, so the two cannot drift silently.

import type { Lang } from "./i18n/lang";

export const STORYBOARD_MODULES = [
  "hibah",
  "medical",
  "ci",
  "business",
  "mortgage",
] as const;
export type StoryboardModule = (typeof STORYBOARD_MODULES)[number];

export const STORYBOARD_STEPS = [
  "fill",
  "explain",
  "risk",
  "objections",
] as const;
export type StoryboardStep = (typeof STORYBOARD_STEPS)[number];

export type StepState = "none" | "saved";
export type StepStatus = Partial<Record<StoryboardStep, StepState>>;

export const STORYBOARD_OUTCOMES = [
  "ready_for_quote",
  "needs_spouse",
  "follow_up_later",
  "not_interested",
] as const;
export type StoryboardOutcome = (typeof STORYBOARD_OUTCOMES)[number];

// ---------------------------------------------------------------------------
// Client-safe payload. This is the ONLY shape the portal ever receives, and it
// is stored in storyboards.client_summary.
// ---------------------------------------------------------------------------

export type FlowTone = "neutral" | "warn" | "bad" | "good";

export type FlowSlide = {
  tag: string;
  title: string;
  value: string;
  desc: string;
  meterLabel: string;
  meterText: string;
  meter: number;
  tone: FlowTone;
};

export type HaveVsNeedItem = {
  label: string;
  value: string;
  tone: FlowTone;
};

export type ClientSummaryPlan = {
  name: string;
  cover: string;
  why: string;
  contribution: string;
};

export type ClientSummary = {
  moduleLabel: string;
  kicker: string;
  gap: string;
  need: string;
  have: string;
  gapNote: string;
  meaning: string[];
  flow: FlowSlide[];
  haveVsNeed: HaveVsNeedItem[];
  plan: ClientSummaryPlan;
  nextSteps: string[];
  agentFirstName: string;
  agentWa: string;
  disclaimerKey: string;
};

/**
 * What storyboards.client_summary now stores: the same ClientSummary built in
 * both languages. `defaultLang` is the UI language when the agent saved; the
 * portal shows that one first. JSON-only. Rows saved before this existed hold a
 * flat ClientSummary: read them with pickSummary() (client-summary.ts), which
 * accepts both shapes.
 */
export type ClientSummaryBundle = {
  defaultLang: Lang;
  en: ClientSummary;
  bm: ClientSummary;
};

// ---------------------------------------------------------------------------
// Row types (one per table).
// ---------------------------------------------------------------------------

export type StoryboardRow = {
  id: string;
  lead_id: string;
  module: StoryboardModule;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  /** A ClientSummaryBundle; a flat ClientSummary if saved before the language update. */
  client_summary: ClientSummaryBundle | ClientSummary | null;
  step_status: StepStatus;
  notes: string | null;
  outcome: StoryboardOutcome | null;
  saved_at: string | null;
  saved_by: string | null;
  shared_to_portal: boolean;
  shared_at: string | null;
  shared_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StoryboardSettingsScope = "org" | "agent";

export type StoryboardSettingsRow = {
  id: string;
  scope: StoryboardSettingsScope;
  owner_id: string | null;
  module: StoryboardModule;
  settings: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
};

export type StoryboardPortalLinkRow = {
  id: string;
  lead_id: string;
  token: string;
  expires_at: string;
  created_by: string | null;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  first_opened_at: string | null;
  last_opened_at: string | null;
  open_count: number;
};

export const PORTAL_ACCESS_EVENTS = [
  "link_open",
  "login_ok",
  "login_fail",
  "locked",
  "view",
  "share_on",
  "share_off",
  "link_revoked",
] as const;
export type PortalAccessEvent = (typeof PORTAL_ACCESS_EVENTS)[number];

export type PortalAccessLogRow = {
  id: string;
  lead_id: string;
  storyboard_id: string | null;
  event: PortalAccessEvent;
  ip_hash: string | null;
  user_agent: string | null;
  created_at: string;
};

// What public.portal_storyboards() / portal_storyboard() return. Four keys,
// never more -- the leak test asserts exactly this.
export type PortalStoryboardDTO = {
  id: string;
  module: StoryboardModule;
  client_summary: ClientSummaryBundle | ClientSummary;
  saved_at: string | null;
};
