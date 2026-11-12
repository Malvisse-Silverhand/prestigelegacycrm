import type { CiOut } from "../engine/ci";
import { t, type Lang } from "../i18n";
import { greeting, waDisclaimer, withAgent } from "./shared";

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
    t("ci.wa.total", lang, { months: out.months, amount: out.text.total }),
    t("ci.wa.monthly", lang, { amount: out.text.monthly }),
    t("ci.wa.early", lang, { amount: out.text.srcEarly }),
    t("ci.wa.late", lang, { amount: out.text.srcLate }),
    out.gapEarly > 0 ? t("ci.wa.gapEarly", lang, { amount: out.text.gapEarly }) : t("ci.wa.met", lang),
    t("ci.wa.gapLate", lang, { amount: out.text.gapLate }),
    t("ci.wa.runway", lang, { early: out.text.runEarly, late: out.text.runLate }),
  ];
  if (out.gapEarly > 0) {
    lines.push("", t("ci.wa.could", lang, { amount: out.text.suggest }));
  }
  lines.push("", waDisclaimer(lang));
  return withAgent(lines, input.agentFirstName);
}
