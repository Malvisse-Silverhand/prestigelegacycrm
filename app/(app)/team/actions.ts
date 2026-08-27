"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

export async function setMemberActive(memberId: string, isActive: boolean) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "agent") return { error: "You don't have permission to do that." };

  const supabase = await createClient();
  // Column-level GRANT restricts `authenticated` to writing is_active only,
  // and the three UPDATE policies on profiles scope which rows each role can
  // reach -- this either succeeds within that scope or RLS silently matches
  // zero rows, which we treat as a real failure rather than pretending it
  // worked.
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", memberId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't update this member's status." };

  revalidatePath("/team");
  return { error: null };
}
