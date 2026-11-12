"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, parseLang } from "./lang";

/**
 * Sets the storyboard UI language cookie. The argument is untrusted, so it is
 * validated against the enum; anything else is refused and nothing is written.
 */
export async function setStoryboardLang(lang: unknown): Promise<{ error: string | null }> {
  const parsed = parseLang(lang);
  if (!parsed) return { error: "Unknown language." };
  const store = await cookies();
  store.set(LANG_COOKIE, parsed, {
    path: "/",
    maxAge: LANG_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  });
  revalidatePath("/", "layout");
  return { error: null };
}
