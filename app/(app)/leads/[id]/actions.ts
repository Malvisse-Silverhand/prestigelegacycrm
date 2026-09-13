"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dispatchWebhook } from "@/lib/dispatch-webhook";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getReassignableUsers } from "./data";
import { LEAD_SOURCES } from "@/lib/lead-constants";
import { malaysiaToday } from "@/lib/malaysia-date";
import { WON_STAGES } from "@/lib/pipeline-stages";

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

  // The picker only ever renders options from getReassignableUsers, but this
  // is a Server Action -- it can be called directly with any id, so the same
  // scope check runs again here rather than trusting the client sent a value
  // that came from the picker.
  const allowed = await getReassignableUsers(profile);
  if (!allowed.some((u) => u.id === newAgentId)) {
    return { error: "You don't have permission to assign this lead to that person." };
  }

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

export async function updateInterest(leadId: string, interest: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ interest })
    .eq("id", leadId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't save product interest." };

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { error: null };
}

export async function updateSource(leadId: string, source: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  if (!(LEAD_SOURCES as readonly string[]).includes(source)) {
    return { error: "Not a valid lead source." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ lead_source: source })
    .eq("id", leadId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't save lead source." };

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { error: null };
}

export async function updateStage(leadId: string, newStage: string, stageLabel: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();

  // Business rule: a lead can't enter Quoted without an actual quotation on
  // file -- enforced here (not just in the UI) so every caller (Lead Detail's
  // dropdown, Pipeline drag, Pipeline's popover, Pipeline's mobile arrow) gets
  // it for free, and it can't be bypassed by hitting the action directly.
  if (newStage === "quoted") {
    const { count, error: countError } = await supabase
      .from("quotations")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId);
    if (countError) return { error: "Couldn't verify this lead's quotations. Please try again." };
    if (!count) {
      return { error: "This lead needs a quotation before it can move to Quoted — create one from Lead Detail first." };
    }
  }

  const patch: { pipeline_stage: string; status?: "closed"; closed_on?: string | null } = {
    pipeline_stage: newStage,
  };
  // Servicing means the policy is already inforced, so the lead is closed in
  // the same sense as Closed Won -- it is no longer something to chase.
  if (newStage === "closed_won" || newStage === "closed_lost" || newStage === "servicing") {
    patch.status = "closed";
  }

  // The closing date defaults to today and is then left alone: moving a won
  // lead from Closed Won to Servicing is not a second close, and must not
  // overwrite a date an agent deliberately backdated. Moving back out of a won
  // stage clears it, so a lead that isn't closed can't keep a date that would
  // still count it in a month's figures.
  if (WON_STAGES.includes(newStage)) {
    const { data: current } = await supabase.from("leads").select("closed_on").eq("id", leadId).maybeSingle();
    if (!current?.closed_on) patch.closed_on = malaysiaToday();
  } else {
    patch.closed_on = null;
  }

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

  await dispatchWebhook("lead_stage_changed", {
    id: leadId,
    stage: newStage,
    stageLabel,
    movedBy: profile.full_name,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  return { error: null };
}

/**
 * Corrects the date a sale closed.
 *
 * Backdating is the normal case, not an exception: a case signed last week is
 * often only entered today, and without this every figure would report it in
 * the wrong month. Only leads that are actually won have one.
 */
export async function setClosedOn(leadId: string, closedOn: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(closedOn)) return { error: "Pick a valid closing date." };
  // A close in the future is a typo, not a plan -- and it would sit in a month
  // that hasn't happened, quietly missing from this month's figures.
  if (closedOn > malaysiaToday()) return { error: "A closing date can't be in the future." };

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("pipeline_stage")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { error: "That lead could not be found." };
  if (!WON_STAGES.includes(lead.pipeline_stage)) {
    return { error: "Only a lead that has closed has a closing date." };
  }

  const { data, error } = await supabase
    .from("leads")
    .update({ closed_on: closedOn })
    .eq("id", leadId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't save the closing date." };

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: profile.id,
    activity_type: "note",
    content: `Closing date set to ${closedOn.split("-").reverse().join("/")}`,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/statistics");
  revalidatePath("/my-sales/servicing");
  return { error: null };
}
