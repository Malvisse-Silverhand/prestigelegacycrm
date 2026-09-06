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

  if (rows.length === 0) {
    revalidatePath("/team");
    return { error: null };
  }

  const supabase = await createClient();

  // Belt-and-suspenders alongside the RLS policy: only ever write targets
  // for agents actually in this unit manager's own unit. One query for every
  // row up front, rather than one per row.
  const { data: members } = await supabase
    .from("profiles")
    .select("id")
    .in(
      "id",
      rows.map((r) => r.agentId),
    )
    .eq("unit_id", profile.unit_id)
    .eq("role", "agent");
  const memberIds = new Set((members ?? []).map((m) => m.id));
  const validRows = rows.filter((r) => memberIds.has(r.agentId));
  if (validRows.length === 0) {
    revalidatePath("/team");
    return { error: null };
  }

  // One statement for every valid row rather than a per-row check-then-
  // update-or-insert loop -- targets_agent_id_month_key makes "one row per
  // agent per month" a real constraint upsert can target.
  const { error } = await supabase.from("targets").upsert(
    validRows.map((row) => ({
      agent_id: row.agentId,
      month: monthDate,
      anc_target: row.ancTarget,
      noc_target: row.nocTarget,
    })),
    { onConflict: "agent_id,month" },
  );
  if (error) return { error: "Couldn't save targets. Please try again." };

  revalidatePath("/team");
  return { error: null };
}
