import type { HibahOut } from "../engine/hibah";
import { t, type Lang } from "../i18n";
import { greeting, waDisclaimer, withAgent } from "./shared";

/** Copy-to-WhatsApp text for Hibah. This is the reference for the other modules. */
export function buildHibahWaSummary(input: {
  nick: string;
  out: Pick<HibahOut, "text" | "gap" | "years" | "pct">;
  planName: string;
  agentFirstName?: string;
  lang?: Lang;
}): string {
  const { nick, out } = input;
  const lang = input.lang ?? "en";
  const lines: string[] = [
    greeting(nick, lang),
    "",
    t("hibah.wa.need", lang, { amount: out.text.need }),
    t("hibah.wa.support", lang, { years: out.years, amount: out.text.support }),
    t("hibah.wa.debts", lang, { amount: out.text.debts }),
    t("hibah.wa.oneoff", lang, { amount: out.text.oneoff }),
    t("hibah.wa.have", lang, { amount: out.text.have }),
    out.gap > 0 ? t("hibah.wa.gap", lang, { amount: out.text.gap }) : t("hibah.wa.met", lang),
  ];
  if (out.gap > 0) {
    lines.push("", t("hibah.wa.could", lang, { amount: out.text.gap }));
  }
  lines.push("", waDisclaimer(lang));
  return withAgent(lines, input.agentFirstName);
}
