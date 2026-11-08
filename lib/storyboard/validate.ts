// Server-side validation for storyboard payloads. Pure functions so they can be
// tested without Next or Supabase. Nothing sent by a browser is trusted:
// numbers are clamped, strings are length-limited and stripped of angle
// brackets, enums are checked, and unknown keys are rejected.

import type { HibahCoverStatus, HibahInputs } from "./engine/hibah";
import { HIBAH_DEFAULT_INPUTS } from "./defaults/hibah";
import { MEDICAL_DEFAULT_INPUTS } from "./defaults/medical";
import { CI_DEFAULT_INPUTS, CI_DEFAULT_STORY } from "./defaults/ci";
import { BUSINESS_DEFAULT_INPUTS } from "./defaults/business";
import { MEDICAL_RISK_GROUPS, type MedicalInputs } from "./engine/medical";
import { CI_DEPENDENCY_COUNT, type CiInputs } from "./engine/ci";
import type { BusinessInputs } from "./engine/business";
import { mentionsOtherOperator } from "./summary/shared";
import type { BuiltModule } from "./modules";
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

// ---------------------------------------------------------------------------
// Medical, Critical Illness and Business Protection.
//
// Same rules as Hibah, driven by a small per-module schema: numbers are clamped,
// strings length-limited and stripped of angle brackets, enums checked, and
// unknown keys rejected. Free text that could reach a client (plan names,
// sources) may not name another operator.
// ---------------------------------------------------------------------------

type Field =
  | { t: "num"; min: number; max: number; int?: boolean }
  | { t: "text"; max: number; multiline?: boolean; gate?: boolean }
  | { t: "enum"; values: readonly string[] }
  | { t: "list"; maxItems: number; maxLen: number }
  | { t: "custom"; parse: (v: unknown) => Validated<unknown> };

type Schema = Record<string, Field>;

const money: Field = { t: "num", min: 0, max: MONEY_MAX };
/** English text of the "other operators" refusal; actions translate it by comparing against this. */
export const OPERATOR_MSG ="Use Great Eastern wording only: other operators' names are not allowed.";

function parseField(key: string, f: Field, v: unknown): Validated<unknown> {
  switch (f.t) {
    case "num": {
      const n = clampNumber(v, f.min, f.max);
      if (n === null) return { ok: false, error: `${key} must be a number.` };
      return { ok: true, value: f.int ? Math.round(n) : n };
    }
    case "text": {
      const s = cleanText(v, f.max, f.multiline === true);
      if (f.gate && mentionsOtherOperator(s)) return { ok: false, error: OPERATOR_MSG };
      return { ok: true, value: s };
    }
    case "enum":
      if (typeof v !== "string" || !f.values.includes(v)) return { ok: false, error: `Unknown value for ${key}.` };
      return { ok: true, value: v };
    case "list": {
      const list = cleanList(v, f.maxItems, f.maxLen);
      return list ? { ok: true, value: list } : { ok: false, error: `Invalid ${key}.` };
    }
    case "custom":
      return f.parse(v);
  }
}

function sanitizeWith(schema: Schema, raw: unknown): Validated<Record<string, unknown>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "Invalid storyboard data." };
  const src = raw as Record<string, unknown>;
  for (const k of Object.keys(src)) {
    if (!Object.prototype.hasOwnProperty.call(schema, k)) return { ok: false, error: `Unexpected field: ${cleanText(k, 40)}.` };
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    const r = parseField(k, schema[k], v);
    if (!r.ok) return r;
    out[k] = r.value;
  }
  return { ok: true, value: out };
}

/** Object with only known keys, each a boolean-ish tick. Returns the ticked keys as `true`. */
function tickMap(v: unknown, valid: (key: string) => boolean): Validated<Record<string, boolean>> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, error: "Invalid ticks." };
  const out: Record<string, boolean> = {};
  for (const [k, on] of Object.entries(v as Record<string, unknown>)) {
    if (!valid(k)) return { ok: false, error: "Unknown checklist item." };
    if (typeof on !== "boolean") return { ok: false, error: "Invalid tick." };
    if (on) out[k] = true;
  }
  return { ok: true, value: out };
}

/** An array of objects with exact keys; each item parsed by `item`. */
function objectArray(
  v: unknown,
  min: number,
  max: number,
  keys: string[],
  item: (o: Record<string, unknown>) => Validated<unknown>,
): Validated<unknown[]> {
  if (!Array.isArray(v) || v.length < min || v.length > max) return { ok: false, error: "Invalid list." };
  const out: unknown[] = [];
  for (const el of v) {
    if (!el || typeof el !== "object" || Array.isArray(el)) return { ok: false, error: "Invalid list item." };
    const rec = el as Record<string, unknown>;
    for (const k of Object.keys(rec)) if (!keys.includes(k)) return { ok: false, error: `Unexpected field: ${cleanText(k, 40)}.` };
    const r = item(rec);
    if (!r.ok) return r;
    out.push(r.value);
  }
  return { ok: true, value: out };
}

function numIn(v: unknown, label: string, min: number, max: number, int = false): Validated<number> {
  const n = clampNumber(v, min, max);
  if (n === null) return { ok: false, error: `${label} must be a number.` };
  return { ok: true, value: int ? Math.round(n) : n };
}

// ---- Medical ----

export type MedicalExtras = HibahExtras & {
  /** Agent-only claim story and the amounts from it. Never in client_summary or WhatsApp text. */
  story: string;
  storyPaid: number;
  storyClient: number;
  /** Monthly contribution per plan row in the Step 2 price table. Agent-typed text. */
  prices: string[];
  ageNow: string;
  priceNow: string;
  ageLater: string;
  priceLater: string;
};
export type MedicalStored = MedicalInputs & MedicalExtras;

export const MEDICAL_EXTRAS_DEFAULT: MedicalExtras = {
  ...EMPTY_EXTRAS,
  story: "",
  storyPaid: 0,
  storyClient: 0,
  prices: ["[RM]", "[RM]", "[RM]", "[RM]"],
  ageNow: "31",
  priceNow: "[RM]",
  ageLater: "41",
  priceLater: "[RM]",
};

const MEDICAL_CHECK_KEYS = new Set(MEDICAL_RISK_GROUPS.flatMap((g) => g.items.map((_, i) => g.key + i)));

const MEDICAL_SCHEMA: Schema = {
  nick: { t: "text", max: 40 },
  work: { t: "enum", values: ["employed", "self", "none"] },
  company: money,
  savings: money,
  scenario: { t: "num", min: 0, max: 50, int: true },
  monthlySave: money,
  cardCost: money,
  inflation: { t: "num", min: -10, max: 100 },
  inflationSource: { t: "text", max: 200, gate: true },
  bills: {
    t: "custom",
    parse: (v) =>
      objectArray(v, 1, 12, ["label", "amount", "source"], (o) => {
        const amount = numIn(o.amount, "Bill amount", 0, MONEY_MAX);
        if (!amount.ok) return amount;
        const source = cleanText(o.source, 200);
        if (mentionsOtherOperator(source)) return { ok: false, error: OPERATOR_MSG };
        return { ok: true, value: { label: cleanText(o.label, 60) || "Scenario", amount: amount.value, source } };
      }),
  },
  checked: { t: "custom", parse: (v) => tickMap(v, (k) => MEDICAL_CHECK_KEYS.has(k)) },
  riskChecked: { t: "list", maxItems: 40, maxLen: 80 },
  raised: { t: "list", maxItems: 60, maxLen: 120 },
  story: { t: "text", max: 1500, multiline: true },
  storyPaid: money,
  storyClient: money,
  prices: {
    t: "custom",
    parse: (v) => {
      if (!Array.isArray(v) || v.length > 4) return { ok: false, error: "Invalid prices." };
      return { ok: true, value: v.map((x) => cleanText(x, 24)) };
    },
  },
  ageNow: { t: "text", max: 6 },
  priceNow: { t: "text", max: 24 },
  ageLater: { t: "text", max: 6 },
  priceLater: { t: "text", max: 24 },
};

// ---- Critical illness ----

export type CiProof = { t: string; v: string; d: string };
export type CiExtras = HibahExtras & {
  /** AGENT-ONLY. Empty by default. Never read by buildClientSummary, the WhatsApp text or the portal. */
  story: string;
  /** Labels of the commitments ticked in Step 1 ("still need paying even when ill"). */
  commitChecked: string[];
  /** Agent-only approved-claim proofs for Step 2. */
  proofs: CiProof[];
  /** Plan names for the three structures in Step 2. */
  approachNames: string[];
};
export type CiStored = CiInputs & CiExtras;

export const CI_EXTRAS_DEFAULT: CiExtras = {
  ...EMPTY_EXTRAS,
  story: CI_DEFAULT_STORY,
  commitChecked: [],
  proofs: [],
  approachNames: [],
};

const CI_DEP_KEYS = new Set(Array.from({ length: CI_DEPENDENCY_COUNT }, (_, i) => String(i)));

const CI_SCHEMA: Schema = {
  nick: { t: "text", max: 40 },
  income: money,
  commit: money,
  pct: { t: "num", min: 0, max: 100 },
  months: { t: "num", min: 0, max: 120, int: true },
  rehab: money,
  emer: money,
  cg: money,
  cgMonths: { t: "num", min: 0, max: 120, int: true },
  waiver: { t: "enum", values: ["yes", "no"] },
  contrib: money,
  savings: money,
  employer: money,
  countEmp: { t: "enum", values: ["yes", "no"] },
  structure: { t: "enum", values: ["late", "staged", "standalone", "none"] },
  ciAmt: money,
  earlyPct: { t: "num", min: 0, max: 100 },
  booster: { t: "num", min: 0, max: 100 },
  recovery: money,
  reduces: { t: "enum", values: ["yes", "no", "unsure"] },
  base: money,
  afford: money,
  deps: { t: "custom", parse: (v) => tickMap(v, (k) => CI_DEP_KEYS.has(k)) },
  riskChecked: { t: "list", maxItems: 40, maxLen: 80 },
  raised: { t: "list", maxItems: 60, maxLen: 120 },
  story: { t: "text", max: 2000, multiline: true },
  commitChecked: { t: "list", maxItems: 12, maxLen: 80 },
  proofs: {
    t: "custom",
    parse: (v) =>
      objectArray(v, 0, 3, ["t", "v", "d"], (o) => ({
        ok: true,
        value: { t: cleanText(o.t, 60), v: cleanText(o.v, 30), d: cleanText(o.d, 120) },
      })),
  },
  approachNames: {
    t: "custom",
    parse: (v) => {
      if (!Array.isArray(v) || v.length > 3) return { ok: false, error: "Invalid plan names." };
      const names = v.map((x) => cleanText(x, 60));
      if (names.some(mentionsOtherOperator)) return { ok: false, error: OPERATOR_MSG };
      return { ok: true, value: names };
    },
  },
};

// ---- Business protection ----

export type BusinessStored = BusinessInputs & HibahExtras;

const SUCC = ["none", "second", "ready"] as const;

const BUSINESS_SCHEMA: Schema = {
  company: { t: "text", max: 80 },
  entity: { t: "enum", values: ["sdn", "plt", "partner", "sole"] },
  revenue: money,
  profit: money,
  fixed: money,
  reserve: money,
  kMethod: { t: "enum", values: ["profit", "salary", "replace"] },
  kMult: { t: "num", min: 0, max: 50 },
  kCount: { t: "num", min: 0, max: 3, int: true },
  kps: {
    t: "custom",
    parse: (v) =>
      objectArray(v, 0, 3, ["name", "role", "salary", "impact", "stable", "ci", "cost", "succ", "exD", "exC"], (o) => {
        const salary = numIn(o.salary, "Salary", 0, MONEY_MAX);
        const impact = numIn(o.impact, "Impact", 0, 100);
        const stable = numIn(o.stable, "Months to stabilise", 0, 120);
        const ci = numIn(o.ci, "CI disruption months", 0, 120);
        const cost = numIn(o.cost, "Replacement cost", 0, MONEY_MAX);
        const exD = numIn(o.exD, "Existing cover", 0, MONEY_MAX);
        const exC = numIn(o.exC, "Existing CI cover", 0, MONEY_MAX);
        for (const r of [salary, impact, stable, ci, cost, exD, exC]) if (!r.ok) return r;
        if (typeof o.succ !== "string" || !(SUCC as readonly string[]).includes(o.succ)) return { ok: false, error: "Unknown successor status." };
        const kp = {
          name: cleanText(o.name, 40),
          role: cleanText(o.role, 40),
          salary: (salary as { ok: true; value: number }).value,
          impact: (impact as { ok: true; value: number }).value,
          stable: (stable as { ok: true; value: number }).value,
          ci: (ci as { ok: true; value: number }).value,
          cost: (cost as { ok: true; value: number }).value,
          succ: o.succ,
          exD: (exD as { ok: true; value: number }).value,
          exC: (exC as { ok: true; value: number }).value,
        };
        return { ok: true, value: kp };
      }),
  },
  valMethod: { t: "enum", values: ["multiple", "manual"] },
  valMult: { t: "num", min: 0, max: 50 },
  valManual: money,
  pCount: { t: "num", min: 0, max: 5, int: true },
  partners: {
    t: "custom",
    parse: (v) =>
      objectArray(v, 0, 5, ["name", "pct", "age", "ex"], (o) => {
        const pct = numIn(o.pct, "Holding", 0, 100);
        const age = numIn(o.age, "Age", 0, 120, true);
        const ex = numIn(o.ex, "Existing cover", 0, MONEY_MAX);
        for (const r of [pct, age, ex]) if (!r.ok) return r;
        return {
          ok: true,
          value: {
            name: cleanText(o.name, 40),
            pct: (pct as { ok: true; value: number }).value,
            age: (age as { ok: true; value: number }).value,
            ex: (ex as { ok: true; value: number }).value,
          },
        };
      }),
  },
  structure: { t: "enum", values: ["cross", "entity", "own"] },
  agreement: { t: "enum", values: ["none", "draft", "written"] },
  lTerm: money,
  lOd: money,
  lHp: money,
  lTrade: money,
  lOther: money,
  lInst: money,
  guarantor: { t: "text", max: 40 },
  guarPct: { t: "num", min: 0, max: 100 },
  lCover: money,
  eBank: money,
  eStock: money,
  eDebt: money,
  eInst: money,
  ePlan: { t: "enum", values: ["continue", "sell", "close"] },
  eMonths: { t: "num", min: 0, max: 36, int: true },
  eOpex: money,
  eWages: money,
  eFamily: money,
  eHibah: money,
  eWill: { t: "enum", values: ["none", "preparing", "in_place"] },
  riskChecked: { t: "list", maxItems: 40, maxLen: 80 },
  raised: { t: "list", maxItems: 60, maxLen: 120 },
};

// ---- Dispatch ----

export type StoredByModule = {
  hibah: HibahStored;
  medical: MedicalStored;
  ci: CiStored;
  business: BusinessStored;
};

const SCHEMAS: Record<Exclude<BuiltModule, "hibah">, Schema> = {
  medical: MEDICAL_SCHEMA,
  ci: CI_SCHEMA,
  business: BUSINESS_SCHEMA,
};

/** The complete default state for a module (design defaults plus empty extras). */
export function defaultStored<M extends BuiltModule>(module: M): StoredByModule[M];
export function defaultStored(module: BuiltModule): StoredByModule[BuiltModule] {
  switch (module) {
    case "hibah":
      return { ...HIBAH_DEFAULT_INPUTS, ...EMPTY_EXTRAS };
    case "medical":
      return structuredClone({ ...MEDICAL_DEFAULT_INPUTS, ...MEDICAL_EXTRAS_DEFAULT });
    case "ci":
      return structuredClone({ ...CI_DEFAULT_INPUTS, ...CI_EXTRAS_DEFAULT });
    case "business":
      return structuredClone({ ...BUSINESS_DEFAULT_INPUTS, ...EMPTY_EXTRAS });
  }
}

/** Validate a (possibly partial) payload for any built module. Unknown keys are an error. */
export function sanitizePatch<M extends BuiltModule>(module: M, raw: unknown): Validated<Partial<StoredByModule[M]>>;
export function sanitizePatch(module: BuiltModule, raw: unknown): Validated<Partial<StoredByModule[BuiltModule]>> {
  if (module === "hibah") return sanitizeHibahPatch(raw);
  const r = sanitizeWith(SCHEMAS[module], raw);
  return r.ok ? { ok: true, value: r.value as Partial<StoredByModule[BuiltModule]> } : r;
}

export function sanitizeMedicalPatch(raw: unknown) {
  return sanitizePatch("medical", raw);
}
export function sanitizeCiPatch(raw: unknown) {
  return sanitizePatch("ci", raw);
}
export function sanitizeBusinessPatch(raw: unknown) {
  return sanitizePatch("business", raw);
}

/** Read what is stored in storyboards.inputs back into a complete, valid shape, field by field. */
export function readStored<M extends BuiltModule>(module: M, raw: unknown): StoredByModule[M];
export function readStored(module: BuiltModule, raw: unknown): StoredByModule[BuiltModule] {
  if (module === "hibah") return readStoredHibah(raw);
  const base = defaultStored(module) as Record<string, unknown>;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const schema = SCHEMAS[module];
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!Object.prototype.hasOwnProperty.call(schema, k)) continue;
      const one = sanitizeWith(schema, { [k]: v });
      if (one.ok) base[k] = one.value[k];
    }
  }
  return mergeStored(module, defaultStored(module), base as Partial<StoredByModule[typeof module]>);
}

/** Patch over what is stored. Keeps cross-field references (scenario index) in range. */
export function mergeStored<M extends BuiltModule>(module: M, base: StoredByModule[M], patch: Partial<StoredByModule[M]>): StoredByModule[M];
export function mergeStored(
  module: BuiltModule,
  base: StoredByModule[BuiltModule],
  patch: Partial<StoredByModule[BuiltModule]>,
): StoredByModule[BuiltModule] {
  const merged = { ...base, ...patch } as StoredByModule[BuiltModule];
  if (module === "medical") {
    const m = merged as MedicalStored;
    m.scenario = Math.max(0, Math.min(m.scenario, m.bills.length - 1));
  }
  return merged;
}

/** YYYY-MM-DD that is a real calendar date. */
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
