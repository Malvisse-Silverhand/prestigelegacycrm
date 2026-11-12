// Language model for the Financial Storyboard. Pure (no React, no Next) so it
// is shared by the server, the client, the engine and the tests.

export const LANGS = ["en", "bm"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "en";

/** The UI language lives in this cookie (path /, one year, sameSite lax). */
export const LANG_COOKIE = "sb_lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}

/** Validates untrusted input (a cookie value, an action argument). null when not a Lang. */
export function parseLang(v: unknown): Lang | null {
  return isLang(v) ? v : null;
}

/** Reads a cookie value defensively: anything that is not 'en' or 'bm' is the default. */
export function langFromCookie(v: unknown): Lang {
  return parseLang(v) ?? DEFAULT_LANG;
}

/** The HTML lang attribute for a language ('ms' is the BCP 47 code for Malay). */
export function htmlLang(lang: Lang): "en" | "ms" {
  return lang === "bm" ? "ms" : "en";
}

/** Locale for number-free date formatting (Malay month names in BM). */
export function dateLocale(lang: Lang): "en-MY" | "ms-MY" {
  return lang === "bm" ? "ms-MY" : "en-MY";
}

/** A value in both languages. */
export type Localised<T> = { en: T; bm: T };
