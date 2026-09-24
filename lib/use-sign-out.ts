"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOutAction } from "@/lib/sign-out-action";

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
      const result = await signOutAction();
      if (result.error) {
        setError(result.error);
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
