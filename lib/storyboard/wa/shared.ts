// Shared pieces of the Copy-to-WhatsApp text. One builder per module lives in
// wa/<module>.ts; wa-summary.ts re-exports them all for existing callers.

import { t, type Lang } from "../i18n";
import { mentionsOtherOperator } from "../summary/shared";

/** The common disclaimer line, in the chosen language. */
export function waDisclaimer(lang: Lang): string {
  return t("wa.disclaimer", lang);
}

/** A figure's source for the client text: the agent's own words, or a clear "to be confirmed". */
export function sourceText(source: string, lang: Lang): string {
  const s = source.trim();
  if (s === "" || /^\[.*\]$/.test(s) || mentionsOtherOperator(s)) return t("wa.sourceTbc", lang);
  return t("wa.source", lang, { source: s });
}

export function greeting(name: string, lang: Lang): string {
  return t("wa.greeting", lang, { name: name.trim() || t("wa.there", lang) });
}

export function withAgent(lines: string[], agentFirstName?: string): string {
  if (agentFirstName) lines.push("", `- ${agentFirstName}`);
  return lines.join("\n");
}
