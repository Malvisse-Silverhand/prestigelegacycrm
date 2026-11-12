// Builds the ONLY payload a client (the portal) ever sees.
//
// Rules, enforced here rather than in the UI:
//  - The output is assembled field by field. Nothing is spread from `inputs`,
//    `outputs`, notes, scripts, objections, checklists, settings or the lead's
//    pipeline stage, so a new field added elsewhere cannot leak by accident.
//  - Great Eastern only. Plan names are the bracketed placeholders unless the
//    agent typed their own, and any name that mentions another operator is
//    replaced by the placeholder.
//  - No guarantees. The word "guarantee" is never used for benefits, and the
//    gap is never said to be filled 100%.
//  - Contribution is "From official illustration" unless the agent entered a figure.
//  - No IC numbers and no agency commission or ANC figures: none of those
//    exist in the engine outputs, and none are read.
//
// Language: the saved client_summary is a bundle with the summary built in
// BOTH languages, so the portal can show either. The module-specific part of
// each summary is built in summary/<module>.ts.

import { computeModule, type ModuleResults } from "./engine";
import { LANGS, DEFAULT_LANG, isLang, type Lang } from "./i18n";
import { summarizeBusiness } from "./summary/business";
import { summarizeCi } from "./summary/ci";
import { summarizeHibah, type SummaryBody } from "./summary/hibah";
import { summarizeMedical } from "./summary/medical";
import { summarizeMortgage } from "./summary/mortgage";
import { firstName, mentionsOtherOperator, type SummaryAgent, type SummaryPlan } from "./summary/shared";
import { t } from "./i18n";
import type { ClientSummary, ClientSummaryBundle, StoryboardModule } from "./types";

export type { SummaryAgent, SummaryPlan };
export { mentionsOtherOperator };

export type SummaryOutputs<M extends StoryboardModule = StoryboardModule> = ModuleResults[M];

const DISCLAIMER_KEY = "disclaimer.default";

export function buildClientSummary<M extends StoryboardModule>(
  module: M,
  _inputs: unknown,
  result: SummaryOutputs<M>,
  agent: SummaryAgent,
  plan?: SummaryPlan,
  lang: Lang = "en",
): ClientSummary {
  // _inputs is accepted for API symmetry but deliberately never read: the
  // client payload comes from computed outputs and the whitelisted plan only.
  void _inputs;
  const base = {
    agentFirstName: firstName(agent.firstName),
    agentWa: String(agent.wa ?? "").replace(/[^\d+]/g, ""),
    disclaimerKey: DISCLAIMER_KEY,
    nextSteps: [t("summary.next1", lang), t("summary.next2", lang), t("summary.next3", lang)],
  };

  // The module tag selects which result shape to read; each case narrows it.
  let body: SummaryBody;
  switch (module as StoryboardModule) {
    case "hibah":
      body = summarizeHibah(result as ModuleResults["hibah"], plan, lang);
      break;
    case "medical":
      body = summarizeMedical(result as ModuleResults["medical"], plan, lang);
      break;
    case "ci":
      body = summarizeCi(result as ModuleResults["ci"], plan, lang);
      break;
    case "business":
      body = summarizeBusiness(result as ModuleResults["business"], plan, lang);
      break;
    case "mortgage":
      body = summarizeMortgage(result as ModuleResults["mortgage"], plan, lang);
      break;
  }
  return { ...base, ...body };
}

/**
 * The summary in both languages, ready to store in storyboards.client_summary.
 * The engine is re-run here per language from the (already validated) stored
 * inputs, so nothing the browser sent can reach the client payload.
 * `plans` may give a different plan-name placeholder per language.
 */
export function buildClientSummaryBundle(input: {
  module: StoryboardModule;
  inputs: Record<string, unknown>;
  agent: SummaryAgent;
  plans: Partial<Record<Lang, SummaryPlan>>;
  defaultLang: Lang;
}): ClientSummaryBundle {
  const one = (lang: Lang): ClientSummary => {
    const result = computeModule(input.module, input.inputs as never, lang);
    return buildClientSummary(input.module, input.inputs, result as never, input.agent, input.plans[lang], lang);
  };
  return { defaultLang: input.defaultLang, en: one("en"), bm: one("bm") };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

/** Loose structural check: the fields every renderer needs. */
export function isClientSummary(v: unknown): v is ClientSummary {
  return (
    isRecord(v) &&
    typeof v.moduleLabel === "string" &&
    typeof v.gap === "string" &&
    Array.isArray(v.flow) &&
    isRecord(v.plan)
  );
}

export function isSummaryBundle(v: unknown): v is ClientSummaryBundle {
  return isRecord(v) && isLang(v.defaultLang) && isClientSummary(v.en) && isClientSummary(v.bm);
}

/**
 * Reads a stored client_summary in either shape. A bundle gives the requested
 * language (falling back to its default language, then English). A legacy flat
 * ClientSummary, saved before languages existed, is English and is returned
 * as is for any language. Anything else is null.
 */
export function pickSummary(stored: unknown, lang: Lang): ClientSummary | null {
  if (isSummaryBundle(stored)) return stored[lang] ?? stored[stored.defaultLang] ?? stored.en;
  if (isClientSummary(stored)) return stored;
  return null;
}

/** The language a stored summary should open in: the bundle's default, or English for a legacy row. */
export function summaryDefaultLang(stored: unknown): Lang {
  return isSummaryBundle(stored) ? stored.defaultLang : DEFAULT_LANG;
}

/** Which languages a stored summary has (a legacy flat row has only English). */
export function summaryLangs(stored: unknown): Lang[] {
  if (isSummaryBundle(stored)) return [...LANGS];
  return isClientSummary(stored) ? [DEFAULT_LANG] : [];
}
