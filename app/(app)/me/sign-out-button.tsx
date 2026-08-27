"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SignOutIcon } from "@/components/icons";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex items-center justify-center gap-2 rounded-2xl border border-sand-2 bg-white py-3.5 text-[13.5px] font-semibold text-alert-red"
    >
      <SignOutIcon width={16} height={16} />
      Sign Out
    </button>
  );
}
