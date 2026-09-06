import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// A minimal fixed-window limiter backed by Postgres, for the handful of
// Server Actions reachable with no session at all -- a valid request needs
// no cookie or JWT, just the URL (password reset, the public /join/<token>
// registration form). Session-gated actions don't need this: a stolen
// session is a bigger problem than a fast clicker, and Supabase Auth already
// rate-limits sign-in itself.
//
// The rate_limits table has RLS enabled with no policies at all, so it is
// reachable only through the service role -- exactly what every caller here
// already holds anyway (both requestPasswordReset and submitRegistration use
// createAdminClient() for other reasons on these same public paths).
export async function checkRateLimit(
  bucket: string,
  subject: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  // Opportunistic cleanup of this bucket's expired rows -- keeps the table
  // small without a separate scheduled job (there is no cron in this
  // deployment).
  await admin.from("rate_limits").delete().eq("bucket", bucket).lt("created_at", since);

  const { count } = await admin
    .from("rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket)
    .eq("subject", subject)
    .gte("created_at", since);

  if ((count ?? 0) >= max) return false;

  await admin.from("rate_limits").insert({ bucket, subject });
  return true;
}

// The caller's IP as a rate-limit subject, read from the header Vercel (and
// most reverse proxies) set. Never trust this for identity -- it's spoofable
// off-platform -- but as a rate-limit key it only ever makes throttling
// *easier* to bypass, never harder, so a spoofed value can't lock anyone out.
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
