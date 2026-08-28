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

export async function saveUnitManagerTargets(
  monthDate: string,
  rows: { agentId: string; ancTarget: number | null; nocTarget: number | null }[],
) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "unit_manager") return { error: "You don't have permission to do that." };

  const supabase = await createClient();
  for (const row of rows) {
    // Belt-and-suspenders alongside the RLS policy: only ever write targets
    // for an agent actually in this unit manager's own unit.
    const { data: agent } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", row.agentId)
      .eq("unit_id", profile.unit_id)
      .eq("role", "agent")
      .maybeSingle();
    if (!agent) continue;

    const { data: existing } = await supabase
      .from("targets")
      .select("id")
      .eq("agent_id", row.agentId)
      .eq("month", monthDate)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("targets")
        .update({ anc_target: row.ancTarget, noc_target: row.nocTarget })
        .eq("id", existing.id)
        .select("id")
        .maybeSingle();
      if (error || !data) return { error: "Couldn't save targets. Please try again." };
    } else {
      const { error } = await supabase.from("targets").insert({
        agent_id: row.agentId,
        month: monthDate,
        anc_target: row.ancTarget,
        noc_target: row.nocTarget,
      });
      if (error) return { error: "Couldn't save targets. Please try again." };
    }
  }

  revalidatePath("/team");
  return { error: null };
}
