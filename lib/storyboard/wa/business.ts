import type { BusinessOut } from "../engine/business";
import type { Lang } from "../i18n";
import { mentionsOtherOperator } from "../summary/shared";
import { waDisclaimer, withAgent } from "./shared";

// TODO(BM): the Business Protection lines below are English only. Move them to
// i18n/dict/business.{en,bm}.ts and build them with t(key, lang) as wa/hibah.ts does.

export function buildBusinessWaSummary(input: {
  company: string;
  out: Pick<BusinessOut, "text" | "showEstate">;
  agentFirstName?: string;
  lang?: Lang;
}): string {
  const { out } = input;
  const lang = input.lang ?? "en";
  const company = input.company.trim() && !mentionsOtherOperator(input.company) ? input.company.trim() : "your business";
  const lines: string[] = [
    `Salam, here is a short summary for ${company} of what we looked at together.`,
    "",
    "Estimated amounts that could fall due if a key owner were gone:",
    `  - Keyman (lost profit and replacing a key person): ${out.text.kmTotal}`,
    `  - Buy-sell (cash for a partner's shares), based on the holdings entered: ${out.text.bsTotal}`,
    `  - Business debt not yet protected: ${out.text.loanGap}`,
  ];
  if (out.showEstate) lines.push(`  - Cash for the transition while accounts may be frozen: ${out.text.eGap}`);
  lines.push(
    `Total: ${out.text.total}`,
    "",
    "Each need could have its own funding, subject to the PDS and certificate terms. Tax and legal points should be confirmed with your accountant and lawyer.",
    "",
    waDisclaimer(lang),
  );
  return withAgent(lines, input.agentFirstName);
}
