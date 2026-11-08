import type { BusinessOut } from "../engine/business";
import { t, type Lang } from "../i18n";
import { mentionsOtherOperator } from "../summary/shared";
import { waDisclaimer, withAgent } from "./shared";

/** Copy-to-WhatsApp text for Business Protection. The partner-share warning is never printed here. */
export function buildBusinessWaSummary(input: {
  company: string;
  out: Pick<BusinessOut, "text" | "showEstate">;
  agentFirstName?: string;
  lang?: Lang;
}): string {
  const { out } = input;
  const lang = input.lang ?? "en";
  const company =
    input.company.trim() && !mentionsOtherOperator(input.company) ? input.company.trim() : t("business.wa.fallbackCompany", lang);
  const lines: string[] = [
    t("business.wa.intro", lang, { company }),
    "",
    t("business.wa.heading", lang),
    t("business.wa.keyman", lang, { amount: out.text.kmTotal }),
    t("business.wa.buysell", lang, { amount: out.text.bsTotal }),
    t("business.wa.loan", lang, { amount: out.text.loanGap }),
  ];
  if (out.showEstate) lines.push(t("business.wa.estate", lang, { amount: out.text.eGap }));
  lines.push(t("business.wa.total", lang, { amount: out.text.total }), "", t("business.wa.closing", lang), "", waDisclaimer(lang));
  return withAgent(lines, input.agentFirstName);
}
