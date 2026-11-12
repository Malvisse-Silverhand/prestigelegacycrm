"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LANG, t as translate, type Lang, type TKey } from "@/lib/storyboard/i18n";

const LangContext = createContext<Lang>(DEFAULT_LANG);

/**
 * Provides the storyboard UI language to every client component below it.
 * The server page reads the `sb_lang` cookie and passes it in; client
 * components then call useLang() / useT() instead of taking a `lang` prop.
 * Server components (no hooks) take an explicit `lang` prop instead.
 */
export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

/** `t(key, vars)` bound to the current language, plus the language itself. */
export function useT(): { lang: Lang; t: (key: TKey, vars?: Record<string, string | number>) => string } {
  const lang = useLang();
  const t = useCallback((key: TKey, vars?: Record<string, string | number>) => translate(key, lang, vars), [lang]);
  return useMemo(() => ({ lang, t }), [lang, t]);
}
