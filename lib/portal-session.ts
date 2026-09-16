import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A stateless proof that a browser passed the client portal's identity check
 * for one NRIC.
 *
 * No sessions table: which certificates this unlocks is decided fresh on
 * every render by querying which case_submissions currently share this NRIC
 * and still carry a live client_portal_links row -- so revoking a link takes
 * effect immediately even for an already-"logged in" browser, without this
 * token needing to know or care. The token only ever answers "did this
 * browser prove who they are", never "what may they see".
 *
 * Signed with a key derived from the service-role key rather than a secret of
 * its own: that key is already server-only, already rotates with the
 * project, and domain-separating the hash means a forged portal session
 * proves nothing about the real key.
 */
function signingKey(): Buffer {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update("client-portal-session-v1").digest();
}

// Long enough that a client who logs in, browses, and gets a callback later
// the same evening isn't asked to log in twice; short enough that a shared or
// borrowed device doesn't stay open for days.
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export const PORTAL_SESSION_COOKIE = "pl_portal_session";

/**
 * Who the browser proved itself to be. Both identifiers are carried because a
 * client's certificates are grouped by either -- see getPortalCertificates.
 */
export type PortalSession = { idNo: string; email: string | null };

/** `<base64url(json)>.<base64url(hmac)>` -- opaque to the browser.
 *
 *  JSON rather than a positional separator: the payload has grown once
 *  already, and an email address is not something to go splitting on
 *  punctuation. */
export function createSessionToken(idNo: string, email: string | null): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = JSON.stringify({ idNo, email: email ?? null, exp });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const sig = createHmac("sha256", signingKey()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): PortalSession | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expectedSig = createHmac("sha256", signingKey()).update(encoded).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  // Signature and expected signature must match in length before
  // timingSafeEqual will even look at them -- a length mismatch is itself not
  // secret, so branching on it first leaks nothing extra.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let parsed: { idNo?: unknown; email?: unknown; exp?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  const idNo = typeof parsed.idNo === "string" ? parsed.idNo : "";
  const email = typeof parsed.email === "string" && parsed.email ? parsed.email : null;
  const exp = typeof parsed.exp === "number" ? parsed.exp : NaN;

  // At least one identifier, not specifically an NRIC. In practice the login
  // step only ever mints a session with one, because proving identity means
  // giving the last 4 of the NRIC -- but the grouping query understands an
  // email-only identity, and a session type that could not express one would
  // be lying about its own contract.
  if (!idNo && !email) return null;
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  return { idNo, email };
}

export const PORTAL_SESSION_MAX_AGE = SESSION_TTL_SECONDS;
