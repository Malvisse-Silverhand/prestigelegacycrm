import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client. NEVER import this from a "use client" file or expose
// SUPABASE_SERVICE_ROLE_KEY to the browser -- this bypasses RLS entirely.
// Server Actions only (e.g. the invite-user flow, which needs the Auth Admin
// API to create real auth.users rows).
//
// The "server-only" import above is the actual enforcement: it makes the
// build fail the moment this module is pulled into a client bundle, instead
// of relying on this comment being read and respected.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
