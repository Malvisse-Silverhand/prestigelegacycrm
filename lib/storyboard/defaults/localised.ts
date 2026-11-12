// Content defaults exist in both languages. `Localised<T>` is { en, bm }.
//
// Module agents: write the Bahasa Malaysia content as a full ModuleContent next
// to the English one, parallel in length and order (the tests check this), and
// put it in `<MODULE>_CONTENT.bm`. Until then a module's `bm` is its English
// text under a clearly named TODO_BM constant, so BM screens still render.

import type { Lang, Localised } from "../i18n/lang";

export type { Lang, Localised };

/** Pick one side of a Localised value. */
export function pick<T>(value: Localised<T>, lang: Lang): T {
  return lang === "bm" ? value.bm : value.en;
}
