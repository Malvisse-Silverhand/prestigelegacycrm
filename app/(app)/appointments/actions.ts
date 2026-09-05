"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { syncAppointmentReminders, clearAppointmentReminders, notify } from "@/lib/appointment-reminders";
import { formatDateTime, localInputToIso } from "@/lib/appointments";

// Saving an appointment moves the lead into the Appointment stage. That is the
// whole point of the column: a card sits there because there is a confirmed
// meeting in the diary, so the stage is a consequence of the booking rather
// than something the agent has to remember to do as a second step.
//
// Closed leads are left alone -- a won deal doesn't get dragged backwards
// because someone booked a handover meeting.
const STAGES_TO_ADVANCE = ["new", "contacted", "follow_up", "quoted"];

export async function saveAppointment(input: {
  id: string | null;
  leadId: string;
  date: string;
  time: string;
  location: string;
  remarks: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const scheduledAt = localInputToIso(input.date, input.time);
  if (!scheduledAt) return { error: "Pick a valid date and time." };
  if (!input.leadId) return { error: "Choose which lead this appointment is with." };

  const supabase = await createClient();

  // RLS decides whether this lead is reachable at all; selecting it first also
  // gives the owner to notify and the name for the reminder text.
  const { data: lead } = await supabase
    .from("leads")
    .select("id, full_name, agent_id, pipeline_stage")
    .eq("id", input.leadId)
    .maybeSingle();
  if (!lead) return { error: "That lead could not be found." };

  const payload = {
    lead_id: input.leadId,
    // The lead's owner keeps the diary entry; if the lead has no owner yet,
    // it falls to whoever booked it.
    agent_id: (lead.agent_id as string | null) ?? profile.id,
    scheduled_at: scheduledAt,
    location: input.location.trim() || null,
    remarks: input.remarks.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error } = input.id
    ? await supabase.from("appointments").update(payload).eq("id", input.id).select("id").maybeSingle()
    : await supabase
        .from("appointments")
        .insert({ ...payload, created_by: profile.id })
        .select("id")
        .maybeSingle();

  if (error || !saved) {
    Sentry.captureException(error ?? new Error("appointment save matched no row"), {
      tags: { action: "saveAppointment" },
    });
    return { error: "Couldn't save this appointment. Please try again." };
  }

  const appointmentId = saved.id as string;
  const leadName = lead.full_name as string;
  const ownerId = (lead.agent_id as string | null) ?? profile.id;

  await syncAppointmentReminders({
    appointmentId,
    scheduledAt,
    leadName,
    leadId: input.leadId,
    recipientIds: [ownerId, profile.id],
  });

  // Booking on someone else's lead: tell them now, not just 24h before.
  if (ownerId !== profile.id) {
    await notify({
      profileId: ownerId,
      kind: "appointment_booked",
      title: `${profile.full_name} booked an appointment`,
      body: `${leadName} · ${formatDateTime(scheduledAt)}`,
      href: `/leads/${input.leadId}`,
    });
  }

  let movedToAppointment = false;
  if (STAGES_TO_ADVANCE.includes(lead.pipeline_stage as string)) {
    const { data: moved } = await supabase
      .from("leads")
      .update({ pipeline_stage: "appointment" })
      .eq("id", input.leadId)
      .select("id")
      .maybeSingle();
    if (moved) {
      movedToAppointment = true;
      await supabase.from("lead_activity").insert({
        lead_id: input.leadId,
        actor_id: profile.id,
        activity_type: "stage_change",
        content: "Moved to Appointment",
      });
    }
  }

  await supabase.from("lead_activity").insert({
    lead_id: input.leadId,
    actor_id: profile.id,
    activity_type: "appointment",
    content: `${input.id ? "Appointment rescheduled" : "Appointment set"} for ${formatDateTime(scheduledAt)}${
      payload.location ? ` at ${payload.location}` : ""
    }`,
  });

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  revalidatePath(`/leads/${input.leadId}`);
  return { error: null, movedToAppointment };
}

export async function setAppointmentStatus(id: string, status: "scheduled" | "completed" | "cancelled") {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, lead_id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't update this appointment." };

  // A meeting that already happened or was called off has nothing left to
  // remind anyone about.
  if (status !== "scheduled") await clearAppointmentReminders(id);

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
  revalidatePath(`/leads/${data.lead_id as string}`);
  return { error: null };
}

export async function deleteAppointment(id: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("appointments").select("lead_id").eq("id", id).maybeSingle();

  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) return { error: "Couldn't delete this appointment." };

  // The notifications FK cascades, but clear explicitly so a reminder can
  // never outlive its appointment even if the row was already gone.
  await clearAppointmentReminders(id);

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
  if (existing?.lead_id) revalidatePath(`/leads/${existing.lead_id as string}`);
  return { error: null };
}
