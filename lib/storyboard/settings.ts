// Storyboard settings: org defaults (SuperAdmin) <- agent overrides (own).
//
//  - Org: plan name, example base amount, benefit multiples, statistics
//    placeholders. Anything not set falls back to the built-in default. Org
//    values are language-neutral (one plan name, one multiple table).
//  - Agent: conversation script, objection answers, checklist items. These are
//    stored PER LANGUAGE: { script: { en?: [...], bm?: [...] }, ... }. Saving
//    in one language never touches the other. An override stored the old way
//    (a bare array) counts as English.
//
// Everything is validated here (unknown keys rejected, text length-limited,
// other operators' names refused) so the server actions stay thin.

import { mentionsOtherOperator } from "./summary/shared";
import type { BuiltModule } from "./modules";
import {
  HIBAH_CONTENT,
  HIBAH_DEFAULT_PLAN,
  HIBAH_MULT_LABELS,
} from "./defaults/hibah";
import { MEDICAL_CONTENT } from "./defaults/medical";
import { CI_CONTENT } from "./defaults/ci";
import { BUSINESS_CONTENT } from "./defaults/business";
import {
  COMMON_CONTENT,
  DEFAULT_PLAN_NAMES,
  defaultPlanName,
  type ModuleContent,
  type Objection,
  type RiskItem,
  type ScriptStep,
} from "./defaults/common";
import type { Localised } from "./defaults/localised";
import { LANGS, t, type Lang } from "./i18n";
import { cleanText, clampNumber, type Validated } from "./validate";

/**
 * Built-in content and plan-name placeholder for each built module.
 * `content` is the English content (kept for existing callers and tests);
 * `localised` has both languages.
 */
export const MODULE_CONTENT: Record<
  BuiltModule,
  { content: ModuleContent; localised: Localised<ModuleContent>; planName: string }
> = {
  hibah: { content: HIBAH_CONTENT.en, localised: HIBAH_CONTENT, planName: HIBAH_DEFAULT_PLAN.name },
  medical: { content: MEDICAL_CONTENT.en, localised: MEDICAL_CONTENT, planName: DEFAULT_PLAN_NAMES.medical },
  ci: { content: CI_CONTENT.en, localised: CI_CONTENT, planName: DEFAULT_PLAN_NAMES.ci },
  business: { content: BUSINESS_CONTENT.en, localised: BUSINESS_CONTENT, planName: DEFAULT_PLAN_NAMES.business },
};

export type OrgHibahSettings = {
  planName?: string;
  base?: number;
  mults?: number[];
  statistics?: string[];
};

/** One language's agent overrides (the flat shape the UI edits and the validators check). */
export type AgentHibahSettings = {
  /** One entry per script step; an empty string keeps the default for that step. */
  script?: string[];
  /** Answer overrides, matched to the default question text of the SAME language. */
  objections?: Objection[];
  /** The agent's complete checklist (replaces the default list when present). */
  riskItems?: RiskItem[];
};

export type OrgSettings = OrgHibahSettings;
export type AgentSettings = AgentHibahSettings;

export type ResolvedHibahSettings = {
  lang: Lang;
  planName: string;
  base: number;
  mults: number[];
  multLabels: string[];
  statistics: string[];
  script: ScriptStep[];
  riskItems: RiskItem[];
  riskReasons: RiskItem[];
  /** Module-specific objections, answers already overridden. */
  objectionsSpecific: Objection[];
  objectionGroups: { name: string; items: Objection[] }[];
  faq: Objection[];
  /** True where the agent changed the text, keyed by question. */
  overridden: string[];
};
export type ResolvedSettings = ResolvedHibahSettings;

const MULT_COUNT = HIBAH_DEFAULT_PLAN.mults.length;
const MAX_PLAN_NAME = 80;
const MAX_STAT = 200;
const MAX_ANSWER = 1200;
const MAX_SCRIPT = 1200;

function rejectUnknown(src: Record<string, unknown>, allowed: string[]): string | null {
  for (const k of Object.keys(src)) {
    if (!allowed.includes(k)) return `Unexpected field: ${cleanText(k, 40)}.`;
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Only Hibah has an example base amount and benefit multiples. */
const ORG_KEYS: Record<BuiltModule, string[]> = {
  hibah: ["planName", "base", "mults", "statistics"],
  medical: ["planName", "statistics"],
  ci: ["planName", "statistics"],
  business: ["planName", "statistics"],
};

export function sanitizeOrgSettings(raw: unknown, module: BuiltModule = "hibah", lang: Lang = "en"): Validated<OrgHibahSettings> {
  const src = asRecord(raw);
  if (!src) return { ok: false, error: t("err.invalidSettings", lang) };
  const bad = rejectUnknown(src, ORG_KEYS[module]);
  if (bad) return { ok: false, error: bad };
  const out: OrgHibahSettings = {};

  if (src.planName !== undefined) {
    const name = cleanText(src.planName, MAX_PLAN_NAME);
    if (name === "") return { ok: false, error: t("err.planNameEmpty", lang) };
    if (mentionsOtherOperator(name)) return { ok: false, error: t("err.planNameOperator", lang) };
    out.planName = name;
  }
  if (src.base !== undefined) {
    const n = clampNumber(src.base, 0, 100_000_000);
    if (n === null) return { ok: false, error: "Base amount must be a number." };
    out.base = n;
  }
  if (src.mults !== undefined) {
    if (!Array.isArray(src.mults) || src.mults.length !== MULT_COUNT) {
      return { ok: false, error: `Provide ${MULT_COUNT} benefit multiples.` };
    }
    const mults: number[] = [];
    for (const m of src.mults) {
      const n = clampNumber(m, 0, 100);
      if (n === null) return { ok: false, error: "Each multiple must be a number." };
      mults.push(n);
    }
    out.mults = mults;
  }
  if (src.statistics !== undefined) {
    if (!Array.isArray(src.statistics)) return { ok: false, error: "Invalid statistics." };
    const stats: string[] = [];
    for (const s of src.statistics.slice(0, 5)) {
      const text = cleanText(s, MAX_STAT);
      if (text === "") continue;
      if (mentionsOtherOperator(text)) return { ok: false, error: t("err.statsOperator", lang) };
      stats.push(text);
    }
    out.statistics = stats;
  }
  return { ok: true, value: out };
}

const AGENT_KEYS = ["script", "objections", "riskItems"] as const;
type AgentKey = (typeof AGENT_KEYS)[number];

/**
 * Validates ONE language's agent overrides (the flat shape). The language only
 * selects the language of the error messages: the rules are the same for both.
 */
export function sanitizeAgentSettings(raw: unknown, module: BuiltModule = "hibah", lang: Lang = "en"): Validated<AgentHibahSettings> {
  const src = asRecord(raw);
  if (!src) return { ok: false, error: t("err.invalidSettings", lang) };
  const bad = rejectUnknown(src, [...AGENT_KEYS]);
  if (bad) return { ok: false, error: bad };
  const out: AgentHibahSettings = {};

  if (src.script !== undefined) {
    if (!Array.isArray(src.script) || src.script.length > MODULE_CONTENT[module].content.script.length) {
      return { ok: false, error: t("err.invalidScript", lang) };
    }
    const script: string[] = [];
    for (const s of src.script) {
      const text = cleanText(s, MAX_SCRIPT, true);
      if (mentionsOtherOperator(text)) return { ok: false, error: t("err.scriptOperator", lang) };
      script.push(text);
    }
    out.script = script;
  }
  if (src.objections !== undefined) {
    if (!Array.isArray(src.objections) || src.objections.length > 80) return { ok: false, error: t("err.invalidObjections", lang) };
    const list: Objection[] = [];
    for (const item of src.objections) {
      const rec = asRecord(item);
      if (!rec) return { ok: false, error: t("err.invalidObjections", lang) };
      const extra = rejectUnknown(rec, ["q", "a"]);
      if (extra) return { ok: false, error: extra };
      const q = cleanText(rec.q, 160);
      const a = cleanText(rec.a, MAX_ANSWER, true);
      if (q === "" || a === "") continue;
      if (mentionsOtherOperator(a)) return { ok: false, error: t("err.answerOperator", lang) };
      list.push({ q, a });
    }
    out.objections = list;
  }
  if (src.riskItems !== undefined) {
    if (!Array.isArray(src.riskItems) || src.riskItems.length > 40) return { ok: false, error: t("err.invalidChecklist", lang) };
    const list: RiskItem[] = [];
    for (const item of src.riskItems) {
      const rec = asRecord(item);
      if (!rec) return { ok: false, error: t("err.invalidChecklist", lang) };
      // `key` is the language-neutral id of a default item (see defaults/common.ts).
      const extra = rejectUnknown(rec, ["label", "detail", "key"]);
      if (extra) return { ok: false, error: extra };
      const label = cleanText(rec.label, 80);
      const detail = cleanText(rec.detail, 400, true);
      if (label === "") continue;
      if (mentionsOtherOperator(label) || mentionsOtherOperator(detail)) {
        return { ok: false, error: t("err.checklistOperator", lang) };
      }
      const key = rec.key === undefined ? "" : cleanText(rec.key, 80);
      list.push(key !== "" && key !== label ? { label, detail, key } : { label, detail });
    }
    out.riskItems = list;
  }
  return { ok: true, value: out };
}

/** Read stored org settings (untrusted JSON) back, dropping anything invalid. */
export function readOrgSettings(raw: unknown, module: BuiltModule = "hibah"): OrgHibahSettings {
  const parsed = sanitizeOrgSettings(pickKeys(raw, ORG_KEYS[module]), module);
  return parsed.ok ? parsed.value : {};
}

function pickKeys(raw: unknown, keys: string[]): Record<string, unknown> {
  const rec = asRecord(raw);
  const out: Record<string, unknown> = {};
  if (!rec) return out;
  for (const k of keys) if (k in rec) out[k] = rec[k];
  return out;
}

// ---------------------------------------------------------------------------
// Agent settings, stored per language.
// ---------------------------------------------------------------------------

/** What storyboard_settings.settings holds for an agent row. JSON-only. */
export type StoredAgentSettings = Partial<Record<AgentKey, Partial<Record<Lang, unknown>>>>;

/**
 * Normalises a stored agent row into the per-language shape. A legacy
 * un-keyed value (a bare array) becomes the English value. Unknown keys and
 * non-array values are dropped.
 */
export function normaliseStoredAgent(raw: unknown): StoredAgentSettings {
  const rec = asRecord(raw);
  const out: StoredAgentSettings = {};
  if (!rec) return out;
  for (const key of AGENT_KEYS) {
    const v = rec[key];
    if (Array.isArray(v)) {
      out[key] = { en: v };
      continue;
    }
    const byLang = asRecord(v);
    if (!byLang) continue;
    const kept: Partial<Record<Lang, unknown>> = {};
    for (const lang of LANGS) if (Array.isArray(byLang[lang])) kept[lang] = byLang[lang];
    if (Object.keys(kept).length > 0) out[key] = kept;
  }
  return out;
}

/** One language's overrides from a stored agent row. Invalid keys are dropped one by one. */
export function readAgentSettings(raw: unknown, module: BuiltModule = "hibah", lang: Lang = "en"): AgentHibahSettings {
  const stored = normaliseStoredAgent(raw);
  const out: AgentHibahSettings = {};
  for (const key of AGENT_KEYS) {
    const v = stored[key]?.[lang];
    if (v === undefined) continue;
    const parsed = sanitizeAgentSettings({ [key]: v }, module, lang);
    if (parsed.ok) Object.assign(out, parsed.value);
  }
  return out;
}

/**
 * Puts one language's validated overrides into the stored row WITHOUT touching
 * the other language (or keys the payload did not send). Returns the new
 * value for storyboard_settings.settings.
 */
export function mergeAgentSettings(stored: unknown, lang: Lang, flat: AgentHibahSettings): StoredAgentSettings {
  const out = normaliseStoredAgent(stored);
  for (const key of AGENT_KEYS) {
    const v = flat[key];
    if (v !== undefined) out[key] = { ...(out[key] ?? {}), [lang]: v };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Resolving
// ---------------------------------------------------------------------------

const COMMON_QS_EN = new Set(COMMON_CONTENT.en.objections.flatMap((g) => g.items.map((i) => i.q)));

/**
 * Org defaults <- agent overrides over the built-in content, in `lang`.
 * `agent` is that language's flat overrides (readAgentSettings(raw, module, lang)).
 *
 * Default items carry a language-neutral `key` (the English question / label)
 * in Bahasa Malaysia, so ticks and the raised log survive a language switch.
 */
export function resolveSettings(
  module: BuiltModule,
  lang: Lang = "en",
  org: OrgHibahSettings = {},
  agent: AgentHibahSettings = {},
): ResolvedHibahSettings {
  const { localised } = MODULE_CONTENT[module];
  const en = localised.en;
  const c = localised[lang];
  const answers = new Map<string, string>();
  for (const o of agent.objections ?? []) answers.set(o.q, o.a);
  const overridden: string[] = [];
  const withKey = <T extends { key?: string }>(item: T, own: string, key: string): T => (key !== own ? { ...item, key } : item);
  const apply = (o: Objection, key: string): Objection => {
    const keyed = withKey(o, o.q, key);
    const a = answers.get(o.q);
    if (a !== undefined && a !== o.a) {
      overridden.push(o.q);
      return { ...keyed, a };
    }
    return keyed;
  };

  const script = en.script.map((step, i) => {
    const own = c.script[i] ?? step;
    const text = agent.script?.[i];
    return { title: own.title, group: own.group ?? step.group, text: text && text.trim() !== "" ? text : own.text };
  });

  const specific: Objection[] = [];
  en.objections.forEach((e, i) => {
    if (COMMON_QS_EN.has(e.q)) return;
    specific.push(apply(c.objections[i] ?? e, e.q));
  });
  const groups = COMMON_CONTENT[lang].objections.map((g, gi) => ({
    name: g.name,
    items: g.items.map((o, j) => apply(o, COMMON_CONTENT.en.objections[gi]?.items[j]?.q ?? o.q)),
  }));
  const faq = en.faq.map((e, i) => apply(c.faq[i] ?? e, e.q));

  const defaultRisk = en.riskItems.map((e, i) => withKey(c.riskItems[i] ?? e, (c.riskItems[i] ?? e).label, e.label));
  // Only Hibah has benefit multiples; the other modules ignore these fields.
  const isHibah = module === "hibah";

  return {
    lang,
    planName: org.planName ?? defaultPlanName(module, lang),
    base: isHibah ? (org.base ?? HIBAH_DEFAULT_PLAN.base) : 0,
    mults: isHibah ? (org.mults && org.mults.length === MULT_COUNT ? org.mults : [...HIBAH_DEFAULT_PLAN.mults]) : [],
    multLabels: isHibah ? [...HIBAH_MULT_LABELS[lang]] : [],
    statistics: org.statistics ?? [],
    script,
    riskItems: agent.riskItems && agent.riskItems.length > 0 ? agent.riskItems : defaultRisk,
    riskReasons: c.riskReasons,
    objectionsSpecific: specific,
    objectionGroups: groups,
    faq,
    overridden,
  };
}

/** Hibah settings (kept for existing callers). */
export function resolveHibahSettings(
  org: OrgHibahSettings = {},
  agent: AgentHibahSettings = {},
  lang: Lang = "en",
): ResolvedHibahSettings {
  return resolveSettings("hibah", lang, org, agent);
}

/** Fill {name} {need} {have} {gap} {base} in a script step. Unknown tokens stay as written. */
export function fillScript(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in tokens ? tokens[k] : m));
}

