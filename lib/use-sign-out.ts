"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Shared by the sidebar and /me sign-out buttons so both get the same
// busy-guard and error handling instead of two independently drifting copies.
export function useSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError("Couldn't sign out. Please try again.");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setError("Couldn't connect. Check your internet connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return { signOut, pending, error };
}
