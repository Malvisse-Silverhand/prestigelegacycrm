// Server-side validation for storyboard payloads. Pure functions so they can be
// tested without Next or Supabase. Nothing sent by a browser is trusted:
// numbers are clamped, strings are length-limited and stripped of angle
// brackets, enums are checked, and unknown keys are rejected.

import type { HibahCoverStatus, HibahInputs } from "./engine/hibah";
import { HIBAH_DEFAULT_INPUTS } from "./defaults/hibah";
import { STORYBOARD_MODULES, STORYBOARD_OUTCOMES, STORYBOARD_STEPS, type StoryboardModule, type StoryboardOutcome, type StoryboardStep } from "./types";

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export function isModule(v: unknown): v is StoryboardModule {
  return typeof v === "string" && (STORYBOARD_MODULES as readonly string[]).includes(v);
}

export function isStep(v: unknown): v is StoryboardStep {
  return typeof v === "string" && (STORYBOARD_STEPS as readonly string[]).includes(v);
}

export function isOutcome(v: unknown): v is StoryboardOutcome {
  return typeof v === "string" && (STORYBOARD_OUTCOMES as readonly string[]).includes(v);
}

/** Plain text: control characters and angle brackets removed, trimmed, length-limited. */
export function cleanText(v: unknown, max: number, multiline = false): string {
  if (typeof v !== "string") return "";
  const noCtl = v.replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, " ");
  return noCtl.replace(/[<>]/g, "").trim().slice(0, max);
}

/** Number clamped into [min, max], rounded to 2 decimal places. null when not a finite number. */
export function clampNumber(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.max(min, Math.min(max, n)) * 100) / 100;
}

const MONEY_MAX = 100_000_000;

// Numeric fields of HibahInputs and their allowed range.
const NUM_RANGES: Record<string, [number, number]> = {
  age: [0, 120],
  income: [0, MONEY_MAX],
  replace: [0, 100],
  other: [0, MONEY_MAX],
  years: [1, 30],
  inflation: [-10, 30],
  eFood: [0, MONEY_MAX], eUtil: [0, MONEY_MAX], eSchool: [0, MONEY_MAX], eTrans: [0, MONEY_MAX], eRent: [0, MONEY_MAX], eOther: [0, MONEY_MAX],
  home: [0, MONEY_MAX], homePart: [0, MONEY_MAX], car: [0, MONEY_MAX], carPart: [0, MONEY_MAX], otherDebt: [0, MONEY_MAX],
  edu: [0, MONEY_MAX], emergency: [0, MONEY_MAX], funeral: [0, MONEY_MAX],
  savings: [0, MONEY_MAX], existing: [0, MONEY_MAX],
};

const COVER: readonly HibahCoverStatus[] = ["covered", "partial", "unsure", "no"];

/** Per-step extras kept alongside the Hibah inputs in storyboards.inputs. */
export type HibahExtras = {
  /** Labels of the rejection-risk checklist items ticked in Step 3. */
  riskChecked: string[];
  /** Questions marked as raised in Step 4. */
  raised: string[];
};

export type HibahStored = HibahInputs & HibahExtras;

export const EMPTY_EXTRAS: HibahExtras = { riskChecked: [], raised: [] };

const ALLOWED_KEYS = new Set<string>([
  ...Object.keys(HIBAH_DEFAULT_INPUTS),
  "riskChecked",
  "raised",
]);

function cleanList(v: unknown, maxItems: number, maxLen: number): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") return null;
    const t = cleanText(item, maxLen);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= maxItems) break;
  }
  return out;
}

/**
 * Validate a (possibly partial) Hibah payload. Unknown keys are an error, not
 * silently dropped, so a typo or a smuggled key is visible. Keys that are
 * absent stay absent; callers merge the patch over what is already stored.
 */
export function sanitizeHibahPatch(raw: unknown): Validated<Partial<HibahStored>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "Invalid storyboard data." };
  const src = raw as Record<string, unknown>;
  for (const k of Object.keys(src)) {
    if (!ALLOWED_KEYS.has(k)) return { ok: false, error: `Unexpected field: ${cleanText(k, 40)}.` };
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (k in NUM_RANGES) {
      const [min, max] = NUM_RANGES[k];
      const n = clampNumber(v, min, max);
      if (n === null) return { ok: false, error: `${k} must be a number.` };
      out[k] = k === "years" || k === "age" ? Math.round(n) : n;
    } else if (k === "nick") {
      out.nick = cleanText(v, 40);
    } else if (k === "scenario") {
      if (v !== "death" && v !== "tpd") return { ok: false, error: "Unknown scenario." };
      out.scenario = v;
    } else if (k === "method") {
      if (v !== "replace" && v !== "itemize") return { ok: false, error: "Unknown method." };
      out.method = v;
    } else if (k === "homeCov" || k === "carCov") {
      if (typeof v !== "string" || !(COVER as readonly string[]).includes(v)) return { ok: false, error: "Unknown cover status." };
      out[k] = v;
    } else if (k === "riskChecked") {
      const list = cleanList(v, 40, 80);
      if (!list) return { ok: false, error: "Invalid checklist." };
      out.riskChecked = list;
    } else if (k === "raised") {
      const list = cleanList(v, 60, 120);
      if (!list) return { ok: false, error: "Invalid objection list." };
      out.raised = list;
    }
  }
  return { ok: true, value: out as Partial<HibahStored> };
}

/** Read what is already stored in storyboards.inputs back into a complete, valid shape. */
export function readStoredHibah(raw: unknown): HibahStored {
  const patch = raw && typeof raw === "object" && !Array.isArray(raw) ? pickKnown(raw as Record<string, unknown>) : {};
  const parsed = sanitizeHibahPatch(patch);
  return mergeHibah({ ...HIBAH_DEFAULT_INPUTS, ...EMPTY_EXTRAS }, parsed.ok ? parsed.value : {});
}

function pickKnown(src: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(src)) if (ALLOWED_KEYS.has(k)) out[k] = src[k];
  return out;
}

export function mergeHibah(base: HibahStored, patch: Partial<HibahStored>): HibahStored {
  return { ...base, ...patch };
}

export function sanitizeNotes(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const t = cleanText(v, 2000, true);
  return t === "" ? null : t;
}

/** YYYY-MM-DD that is a real calendar date. */
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
