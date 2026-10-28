import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Proof that this browser passed a lead form's name + phone check, for ONE
 * link. Same construction as lib/portal-session.ts: stateless, HMAC-signed,
 * keyed from the service-role key with its own domain separator.
 *
 * It only answers "did this browser verify for this link". Whether the link
 * is still live (not revoked, not expired) is re-checked on every request, so
 * revoking cuts off an already-verified browser immediately.
 */
function signingKey(): Buffer {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update("lead-form-session-v1").digest();
}

// Long enough to fill in a long application over an evening, short enough
// that a borrowed phone does not stay open for days.
const SESSION_TTL_SECONDS = 60 * 60 * 6;

export const FORM_SESSION_MAX_AGE = SESSION_TTL_SECONDS;
/** Cookie scope: one cookie per link (name carries the link id), all under /f. */
export const FORM_SESSION_PATH = "/f";

export function formSessionCookieName(linkId: string): string {
  return `pl_form_${linkId.replace(/-/g, "").slice(0, 16)}`;
}

/** `<base64url(json)>.<base64url(hmac)>` */
export function createFormSessionToken(linkId: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const encoded = Buffer.from(JSON.stringify({ linkId, exp }), "utf8").toString("base64url");
  const sig = createHmac("sha256", signingKey()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

/** True only when the token is authentic, unexpired and issued for exactly this link. */
export function verifyFormSessionToken(token: string | undefined | null, linkId: string): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = createHmac("sha256", signingKey()).update(encoded).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  let parsed: { linkId?: unknown; exp?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (parsed.linkId !== linkId) return false;
  const exp = typeof parsed.exp === "number" ? parsed.exp : NaN;
  return Number.isFinite(exp) && exp >= Math.floor(Date.now() / 1000);
}
