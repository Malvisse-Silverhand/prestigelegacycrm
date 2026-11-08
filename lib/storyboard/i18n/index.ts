import { en, type TKey } from "./en";
import { bm } from "./bm";

export type { TKey };
export type Lang = "en" | "bm";

const dictionaries: Record<Lang, Record<TKey, string>> = { en, bm };

/** Look up a UI string. `{name}` placeholders are filled from `vars`. */
export function t(
  key: TKey,
  lang: Lang = "en",
  vars?: Record<string, string | number>,
): string {
  const raw = dictionaries[lang][key] ?? en[key];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k: string) =>
    k in vars ? String(vars[k]) : m,
  );
}
