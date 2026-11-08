import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, langFromCookie, type Lang } from "./lang";

/** The storyboard UI language for this request (cookie `sb_lang`, default 'en'). */
export async function getStoryboardLang(): Promise<Lang> {
  const store = await cookies();
  return langFromCookie(store.get(LANG_COOKIE)?.value);
}
