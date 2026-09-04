"use client";

import { useSignOut } from "@/lib/use-sign-out";
import { SignOutIcon } from "@/components/icons";

export function SignOutButton() {
  const { signOut, pending, error } = useSignOut();

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-2xl border border-sand-2 bg-white py-3.5 text-[13.5px] font-semibold text-alert-red disabled:opacity-60"
      >
        <SignOutIcon width={16} height={16} />
        {pending ? "Signing out…" : "Sign Out"}
      </button>
      {error && <div className="text-center text-[11.5px] font-medium text-alert-red">{error}</div>}
    </div>
  );
}
