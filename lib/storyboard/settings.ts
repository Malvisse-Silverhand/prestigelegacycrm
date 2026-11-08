// Storyboard settings: org defaults (SuperAdmin) <- agent overrides (own).
//
//  - Org: plan name, example base amount, benefit multiples, statistics
//    placeholders. Anything not set falls back to the built-in default.
//  - Agent: conversation script, objection answers, checklist items.
//
// Everything is validated here (unknown keys rejected, text length-limited,
// other operators' names refused) so the server actions stay thin.

import { mentionsOtherOperator } from "./client-summary";
import {
  HIBAH_DEFAULT_CONTENT,
  HIBAH_DEFAULT_PLAN,
} from "./defaults/hibah";
import { MEDICAL_DEFAULT_CONTENT } from "./defaults/medical";
import { CI_DEFAULT_CONTENT } from "./defaults/ci";
import { BUSINESS_DEFAULT_CONTENT } from "./defaults/business";
import { COMMON_OBJECTIONS, DEFAULT_PLAN_NAMES, type ModuleContent, type Objection, type RiskItem, type ScriptStep } from "./defaults/common";
import type { BuiltModule } from "./modules";
import { cleanText, clampNumber, type Validated } from "./validate";

/** Built-in content and plan-name placeholder for each built module. */
export const MODULE_CONTENT: Record<BuiltModule, { content: ModuleContent; planName: string }> = {
  hibah: { content: HIBAH_DEFAULT_CONTENT, planName: HIBAH_DEFAULT_PLAN.name },
  medical: { content: MEDICAL_DEFAULT_CONTENT, planName: DEFAULT_PLAN_NAMES.medical },
  ci: { content: CI_DEFAULT_CONTENT, planName: DEFAULT_PLAN_NAMES.ci },
  business: { content: BUSINESS_DEFAULT_CONTENT, planName: DEFAULT_PLAN_NAMES.business },
};

export type OrgHibahSettings = {
  planName?: string;
  base?: number;
  mults?: number[];
  statistics?: string[];
};

export type AgentHibahSettings = {
  /** One entry per script step; an empty string keeps the default for that step. */
  script?: string[];
  /** Answer overrides, matched to the default question text. */
  objections?: Objection[];
  /** The agent's complete checklist (replaces the default list when present). */
  riskItems?: RiskItem[];
};

export type OrgSettings = OrgHibahSettings;
export type AgentSettings = AgentHibahSettings;

export type ResolvedHibahSettings = {
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

export function sanitizeOrgSettings(raw: unknown, module: BuiltModule = "hibah"): Validated<OrgHibahSettings> {
  const src = asRecord(raw);
  if (!src) return { ok: false, error: "Invalid settings." };
  const bad = rejectUnknown(src, ORG_KEYS[module]);
  if (bad) return { ok: false, error: bad };
  const out: OrgHibahSettings = {};

  if (src.planName !== undefined) {
    const name = cleanText(src.planName, MAX_PLAN_NAME);
    if (name === "") return { ok: false, error: "Plan name can't be empty." };
    if (mentionsOtherOperator(name)) return { ok: false, error: "Use a Great Eastern plan name only." };
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
      const t = cleanText(s, MAX_STAT);
      if (t === "") continue;
      if (mentionsOtherOperator(t)) return { ok: false, error: "Statistics must not name other operators." };
      stats.push(t);
    }
    out.statistics = stats;
  }
  return { ok: true, value: out };
}

export function sanitizeAgentSettings(raw: unknown, module: BuiltModule = "hibah"): Validated<AgentHibahSettings> {
  const src = asRecord(raw);
  if (!src) return { ok: false, error: "Invalid settings." };
  const bad = rejectUnknown(src, ["script", "objections", "riskItems"]);
  if (bad) return { ok: false, error: bad };
  const out: AgentHibahSettings = {};

  if (src.script !== undefined) {
    if (!Array.isArray(src.script) || src.script.length > MODULE_CONTENT[module].content.script.length) {
      return { ok: false, error: "Invalid script." };
    }
    const script: string[] = [];
    for (const s of src.script) {
      const t = cleanText(s, MAX_SCRIPT, true);
      if (mentionsOtherOperator(t)) return { ok: false, error: "The script must not name other operators." };
      script.push(t);
    }
    out.script = script;
  }
  if (src.objections !== undefined) {
    if (!Array.isArray(src.objections) || src.objections.length > 80) return { ok: false, error: "Invalid objections." };
    const list: Objection[] = [];
    for (const item of src.objections) {
      const rec = asRecord(item);
      if (!rec) return { ok: false, error: "Invalid objection." };
      const extra = rejectUnknown(rec, ["q", "a"]);
      if (extra) return { ok: false, error: extra };
      const q = cleanText(rec.q, 160);
      const a = cleanText(rec.a, MAX_ANSWER, true);
      if (q === "" || a === "") continue;
      if (mentionsOtherOperator(a)) return { ok: false, error: "Answers must not name other operators." };
      list.push({ q, a });
    }
    out.objections = list;
  }
  if (src.riskItems !== undefined) {
    if (!Array.isArray(src.riskItems) || src.riskItems.length > 40) return { ok: false, error: "Invalid checklist." };
    const list: RiskItem[] = [];
    for (const item of src.riskItems) {
      const rec = asRecord(item);
      if (!rec) return { ok: false, error: "Invalid checklist item." };
      const extra = rejectUnknown(rec, ["label", "detail"]);
      if (extra) return { ok: false, error: extra };
      const label = cleanText(rec.label, 80);
      const detail = cleanText(rec.detail, 400, true);
      if (label === "") continue;
      if (mentionsOtherOperator(label) || mentionsOtherOperator(detail)) {
        return { ok: false, error: "Checklist items must not name other operators." };
      }
      list.push({ label, detail });
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

export function readAgentSettings(raw: unknown, module: BuiltModule = "hibah"): AgentHibahSettings {
  const parsed = sanitizeAgentSettings(pickKeys(raw, ["script", "objections", "riskItems"]), module);
  return parsed.ok ? parsed.value : {};
}

function pickKeys(raw: unknown, keys: string[]): Record<string, unknown> {
  const rec = asRecord(raw);
  const out: Record<string, unknown> = {};
  if (!rec) return out;
  for (const k of keys) if (k in rec) out[k] = rec[k];
  return out;
}

const COMMON_QS = new Set(COMMON_OBJECTIONS.flatMap((g) => g.items.map((i) => i.q)));

/** Org defaults <- agent overrides over the built-in content, for any built module. */
export function resolveSettings(module: BuiltModule, org: OrgHibahSettings = {}, agent: AgentHibahSettings = {}): ResolvedHibahSettings {
  const { content, planName } = MODULE_CONTENT[module];
  const answers = new Map<string, string>();
  for (const o of agent.objections ?? []) answers.set(o.q, o.a);
  const overridden: string[] = [];
  const apply = (o: Objection): Objection => {
    const a = answers.get(o.q);
    if (a !== undefined && a !== o.a) {
      overridden.push(o.q);
      return { q: o.q, a };
    }
    return o;
  };

  const script = content.script.map((step, i) => {
    const text = agent.script?.[i];
    return { title: step.title, group: step.group, text: text && text.trim() !== "" ? text : step.text };
  });

  const specific = content.objections.filter((o) => !COMMON_QS.has(o.q)).map(apply);
  const groups = COMMON_OBJECTIONS.map((g) => ({ name: g.name, items: g.items.map(apply) }));
  // Only Hibah has benefit multiples; the other modules ignore these fields.
  const isHibah = module === "hibah";

  return {
    planName: org.planName ?? planName,
    base: isHibah ? (org.base ?? HIBAH_DEFAULT_PLAN.base) : 0,
    mults: isHibah ? (org.mults && org.mults.length === MULT_COUNT ? org.mults : [...HIBAH_DEFAULT_PLAN.mults]) : [],
    multLabels: isHibah ? [...HIBAH_DEFAULT_PLAN.multLabels] : [],
    statistics: org.statistics ?? [],
    script,
    riskItems: agent.riskItems && agent.riskItems.length > 0 ? agent.riskItems : content.riskItems,
    riskReasons: content.riskReasons,
    objectionsSpecific: specific,
    objectionGroups: groups,
    faq: content.faq.map(apply),
    overridden,
  };
}

/** Hibah settings (kept for existing callers). */
export function resolveHibahSettings(org: OrgHibahSettings = {}, agent: AgentHibahSettings = {}): ResolvedHibahSettings {
  return resolveSettings("hibah", org, agent);
}

/** Fill {name} {need} {have} {gap} {base} in a script step. Unknown tokens stay as written. */
export function fillScript(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in tokens ? tokens[k] : m));
}
