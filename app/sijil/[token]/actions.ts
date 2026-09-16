"use server";

import { cookies } from "next/headers";
import { resolvePortalAnchor, matchesIdentity } from "@/lib/client-portal";
import { createSessionToken, PORTAL_SESSION_COOKIE, PORTAL_SESSION_MAX_AGE } from "@/lib/portal-session";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * The client portal's one login action: does what was typed match the
 * certificate this link points to?
 *
 * Rate-limited per token+IP rather than per IP alone, so a genuine client
 * mistyping their own details a few times never gets caught by traffic
 * against someone else's link on the same connection (a shared office
 * network, a hotspot). Ten attempts in fifteen minutes is generous for a
 * real client and tight against a script: guessing needs BOTH the right
 * last-4 (1 in 10,000) and the lead's own email or phone, which is not
 * public.
 */
export async function loginToPortal(token: string, emailOrPhone: string, last4: string) {
  const ip = await clientIp();
  const allowed = await checkRateLimit(`portal-login:${token}`, ip, 10, 15 * 60);
  if (!allowed) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const anchor = await resolvePortalAnchor(token);
  if (!anchor) return { error: "This link is no longer active." };

  if (!anchor.idNo) {
    // No NRIC on file for this certificate -- nobody can ever pass the check.
    // The agent needs to fill it in before this link is usable at all.
    return { error: "This certificate is missing an NRIC on file. Please contact your agent." };
  }

  if (!matchesIdentity(anchor, emailOrPhone, last4)) {
    return { error: "Those details don't match our records. Please check and try again." };
  }

  const jar = await cookies();
  jar.set(PORTAL_SESSION_COOKIE, createSessionToken(anchor.idNo, anchor.leadEmail), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/sijil",
    maxAge: PORTAL_SESSION_MAX_AGE,
  });

  return { error: null };
}

/** A client-initiated sign-out, for a shared or borrowed device. */
export async function logoutOfPortal() {
  const jar = await cookies();
  jar.delete({ name: PORTAL_SESSION_COOKIE, path: "/sijil" });
  return { error: null };
}
