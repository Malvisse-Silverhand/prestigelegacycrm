import type { CiOut } from "../engine/ci";
import type { Lang } from "../i18n";
import { greeting, waDisclaimer, withAgent } from "./shared";

// TODO(BM): the Critical Illness lines below are English only. Move them to
// i18n/dict/ci.{en,bm}.ts and build them with t(key, lang) as wa/hibah.ts does.

/** The CI story is agent-only and is deliberately not an input here. */
export function buildCiWaSummary(input: {
  nick: string;
  out: Pick<CiOut, "text" | "gapEarly" | "months">;
  agentFirstName?: string;
  lang?: Lang;
}): string {
  const { out } = input;
  const lang = input.lang ?? "en";
  const lines: string[] = [
    greeting(input.nick, lang),
    "",
    `Estimated cash needed over a ${out.months}-month recovery: ${out.text.total}`,
    `  - Monthly commitments to cover: ${out.text.monthly}`,
    `Available if diagnosed at an early stage: ${out.text.srcEarly}`,
    `Available if diagnosed at a late stage: ${out.text.srcLate}`,
    out.gapEarly > 0 ? `Estimated gap at an early stage: ${out.text.gapEarly}` : "On these figures, what is available meets the estimated need at an early stage.",
    `Estimated gap at a late stage: ${out.text.gapLate}`,
    `Cash would last about ${out.text.runEarly} to ${out.text.runLate} months of commitments.`,
  ];
  if (out.gapEarly > 0) {
    lines.push(
      "",
      `Critical illness cover of around ${out.text.suggest} could help with the early-stage gap, subject to the PDS and the certificate's definitions.`,
    );
  }
  lines.push("", waDisclaimer(lang));
  return withAgent(lines, input.agentFirstName);
}
