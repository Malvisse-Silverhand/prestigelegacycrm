// Storyboard dictionaries. One English + one Bahasa Malaysia file per module
// under ./dict, merged here. TKey is derived from the merged English keys, and
// every module's BM object is typed Record<ItsEnglishKeys, string>, so a
// missing key fails to compile and a test checks the rest (parity, placeholders,
// no empty strings, BM differs from EN).

import { commonEn } from "./dict/common.en";
import { commonBm } from "./dict/common.bm";
import { hibahEn } from "./dict/hibah.en";
import { hibahBm } from "./dict/hibah.bm";
import { medicalEn } from "./dict/medical.en";
import { medicalBm } from "./dict/medical.bm";
import { ciEn } from "./dict/ci.en";
import { ciBm } from "./dict/ci.bm";
import { businessEn } from "./dict/business.en";
import { businessBm } from "./dict/business.bm";
import { mortgageEn } from "./dict/mortgage.en";
import { mortgageBm } from "./dict/mortgage.bm";
import type { Lang } from "./lang";

export { LANGS, DEFAULT_LANG, LANG_COOKIE, isLang, parseLang, langFromCookie, htmlLang, dateLocale } from "./lang";
export type { Lang, Localised } from "./lang";

export const en = {
  ...commonEn,
  ...hibahEn,
  ...medicalEn,
  ...ciEn,
  ...businessEn,
  ...mortgageEn,
} as const;

export type TKey = keyof typeof en;

export const bm: Record<TKey, string> = {
  ...commonBm,
  ...hibahBm,
  ...medicalBm,
  ...ciBm,
  ...businessBm,
  ...mortgageBm,
};

const dictionaries: Record<Lang, Record<TKey, string>> = { en, bm };

/** Look up a UI string. `{name}` placeholders are filled from `vars`. */
export function t(
  key: TKey,
  lang: Lang = "en",
  vars?: Record<string, string | number>,
): string {
  // The English fallback is a safety net only: a test fails if any BM key is missing.
  const raw = dictionaries[lang]?.[key] ?? en[key];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k: string) =>
    k in vars ? String(vars[k]) : m,
  );
}

/** A translator bound to one language, for components and builders that call t() often. */
export type Translate = (key: TKey, vars?: Record<string, string | number>) => string;

export function translator(lang: Lang): Translate {
  return (key, vars) => t(key, lang, vars);
}
