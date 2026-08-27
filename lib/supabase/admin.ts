import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client. NEVER import this from a "use client" file or expose
// SUPABASE_SERVICE_ROLE_KEY to the browser -- this bypasses RLS entirely.
// Server Actions only (e.g. the invite-user flow, which needs the Auth Admin
// API to create real auth.users rows).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
