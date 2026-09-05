import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { REMINDER_OFFSETS, formatDateTime } from "@/lib/appointments";

// Reminders are written through the service role on purpose: booking an
// appointment notifies the lead's owner, who is frequently not the person who
// clicked Save, and notifications are readable only by their own recipient.

// Replaces every reminder for one appointment. Called on create and on every
// reschedule, so the ladder always describes the current time rather than
// leaving a stale "in 1 hour" pointing at yesterday.
//
// Never throws: a reminder that fails to write must not fail the booking that
// the agent just made.
export async function syncAppointmentReminders(input: {
  appointmentId: string;
  scheduledAt: string;
  leadName: string;
  leadId: string;
  recipientIds: string[];
}) {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").delete().eq("appointment_id", input.appointmentId);

    const when = new Date(input.scheduledAt).getTime();
    const now = Date.now();
    // Dedup: booking a lead you own yourself must not ring twice.
    const recipients = [...new Set(input.recipientIds.filter(Boolean))];

    const rows = recipients.flatMap((profileId) =>
      REMINDER_OFFSETS
        // An offset already in the past is dropped rather than fired
        // immediately -- booking something for 10 minutes from now should not
        // instantly produce a "tomorrow" and an "in 1 hour" reminder.
        .filter((o) => when - o.minutes * 60_000 > now)
        .map((o) => ({
          profile_id: profileId,
          kind: "appointment_reminder",
          title: `Appointment ${o.lead}`,
          body: `${input.leadName} · ${formatDateTime(input.scheduledAt)}`,
          href: `/leads/${input.leadId}`,
          appointment_id: input.appointmentId,
          fire_at: new Date(when - o.minutes * 60_000).toISOString(),
        })),
    );

    if (rows.length === 0) return;
    const { error } = await admin.from("notifications").insert(rows);
    if (error) Sentry.captureException(error, { tags: { area: "appointment-reminders", step: "insert" } });
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "appointment-reminders" } });
  }
}

// Cancelling or deleting an appointment takes its pending reminders with it.
export async function clearAppointmentReminders(appointmentId: string) {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").delete().eq("appointment_id", appointmentId);
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "appointment-reminders", step: "clear" } });
  }
}

// A one-off, non-reminder notification (e.g. "X booked an appointment on your
// lead"). Same service-role reasoning as above.
export async function notify(input: {
  profileId: string;
  kind: string;
  title: string;
  body?: string;
  href?: string;
}) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notifications").insert({
      profile_id: input.profileId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    });
    if (error) Sentry.captureException(error, { tags: { area: "notify" } });
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "notify" } });
  }
}
