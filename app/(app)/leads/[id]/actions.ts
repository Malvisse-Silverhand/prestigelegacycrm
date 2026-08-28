"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

export async function addNote(leadId: string, content: string) {
  const profile = await getCurrentProfile();
  if (!profile || !content.trim()) return { error: "Note can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: profile.id,
    activity_type: "note",
    content: content.trim(),
  });
  if (error) return { error: "Couldn't save that note." };

  revalidatePath(`/leads/${leadId}`);
  return { error: null };
}

export async function reassignLead(leadId: string, newAgentId: string, newAgentName: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ agent_id: newAgentId })
    .eq("id", leadId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't reassign this lead." };

  const { error: activityError } = await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: profile.id,
    activity_type: "assigned",
    content: `Reassigned to ${newAgentName}`,
  });
  if (activityError) console.error("reassignLead: lead_activity insert failed", activityError);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { error: null };
}

export async function updateStage(leadId: string, newStage: string, stageLabel: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  const patch: { pipeline_stage: string; status?: "closed" } = { pipeline_stage: newStage };
  if (newStage === "closed_won" || newStage === "closed_lost") patch.status = "closed";

  // A plain .update() without .select() reports success even when RLS
  // filters the WHERE down to zero matching rows -- e.g. the lead was
  // reassigned away from this agent between page load and this drag.
  // Only treat it as real if a row actually came back.
  const { data, error } = await supabase.from("leads").update(patch).eq("id", leadId).select("id").maybeSingle();
  if (error || !data) return { error: "Couldn't update the pipeline stage." };

  const { error: activityError } = await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: profile.id,
    activity_type: "stage_change",
    content: `Moved to ${stageLabel}`,
  });
  if (activityError) console.error("updateStage: lead_activity insert failed", activityError);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  return { error: null };
}
