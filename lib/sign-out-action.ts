"use server";

import { createClient } from "@/lib/supabase/server";

// Signing out on the server instead of in the browser. The browser version
// needed the whole Supabase client SDK (auth, realtime, query builder) in the
// app shell -- 65 KB gzipped on every signed-in page -- for this one call.
// Same scope as before (the default, "global"), and the server client clears
// the auth cookies through its setAll, which is allowed inside an action.
export async function signOutAction(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  return { error: error ? "Couldn't sign out. Please try again." : null };
}
