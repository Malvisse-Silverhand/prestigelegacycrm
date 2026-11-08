import type { MedicalOut } from "../engine/medical";
import type { Lang } from "../i18n";
import { greeting, sourceText, waDisclaimer, withAgent } from "./shared";

// TODO(BM): the Medical lines below are English only. Move them to
// i18n/dict/medical.{en,bm}.ts and build them with t(key, lang) as wa/hibah.ts does.

export function buildMedicalWaSummary(input: {
  nick: string;
  out: Pick<MedicalOut, "text" | "gap" | "bill" | "billLabel" | "billSource" | "level" | "inflation" | "inflationSource">;
  agentFirstName?: string;
  lang?: Lang;
}): string {
  const { out } = input;
  const lang = input.lang ?? "en";
  const lines: string[] = [
    greeting(input.nick, lang),
    "",
    `Hospital bill scenario: ${out.billLabel}`,
    `Estimated bill: ${out.text.bill} (an estimate for discussion; ${sourceText(out.billSource, "en")})`,
    `  - Company cover used: ${out.text.company}`,
    `  - Own savings used: ${out.text.savings}`,
    out.gap > 0 ? `Estimated out of pocket: ${out.text.gap}` : "On these figures, company cover and savings meet the estimated bill.",
    `The same bill in 5 years, at ${out.inflation}% a year (${sourceText(out.inflationSource, "en")}): ${out.text.future}`,
    `Daily risk level from our checklist: ${out.level}`,
  ];
  if (out.gap > 0) {
    lines.push("", "An own medical card could help keep your savings intact, subject to the plan limits, deductibles, waiting periods and exclusions.");
  }
  lines.push("", waDisclaimer(lang));
  return withAgent(lines, input.agentFirstName);
}
