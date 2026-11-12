import type { MedicalOut } from "../engine/medical";
import { t, type Lang, type TKey } from "../i18n";
import { greeting, sourceText, waDisclaimer, withAgent } from "./shared";

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
    t("medical.wa.scenario", lang, { label: out.billLabel }),
    t("medical.wa.bill", lang, { amount: out.text.bill, source: sourceText(out.billSource, lang) }),
    t("medical.wa.company", lang, { amount: out.text.company }),
    t("medical.wa.savings", lang, { amount: out.text.savings }),
    out.gap > 0 ? t("medical.wa.gap", lang, { amount: out.text.gap }) : t("medical.wa.met", lang),
    t("medical.wa.future", lang, { rate: out.inflation, source: sourceText(out.inflationSource, lang), amount: out.text.future }),
    t("medical.wa.level", lang, { level: t(("medical.level." + out.level) as TKey, lang) }),
  ];
  if (out.gap > 0) {
    lines.push("", t("medical.wa.could", lang));
  }
  lines.push("", waDisclaimer(lang));
  return withAgent(lines, input.agentFirstName);
}
