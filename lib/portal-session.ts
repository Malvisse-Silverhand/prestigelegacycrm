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

export type PortalSession = { idNo: string };

const SEPARATOR = "|";

/** `<base64url(idNo|exp)>.<base64url(hmac)>` -- opaque to the browser. */
export function createSessionToken(idNo: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = idNo + SEPARATOR + String(exp);
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

  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const sep = payload.lastIndexOf(SEPARATOR);
  if (sep < 1) return null;
  const idNo = payload.slice(0, sep);
  const exp = Number(payload.slice(sep + 1));
  if (!idNo || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  return { idNo };
}

export const PORTAL_SESSION_MAX_AGE = SESSION_TTL_SECONDS;
