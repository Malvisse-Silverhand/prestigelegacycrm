// Reminder ladder for an appointment. Each offset becomes one notification row
// written when the appointment is saved (see lib/appointment-reminders.ts), so
// no scheduler is involved -- the bell just asks which rows are due.
export const REMINDER_OFFSETS = [
  { minutes: 24 * 60, lead: "tomorrow" },
  { minutes: 60, lead: "in 1 hour" },
  { minutes: 15, lead: "in 15 minutes" },
] as const;

export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

// A datetime-local value ("2026-09-06T14:30") is wall-clock with no zone, and
// the CRM runs in one timezone (UTC+8), so it means the browser's local time.
// new Date(value) reads it as local, which is exactly right -- toISOString()
// then converts to UTC for storage.
export function localInputToIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Local date/time parts for the form's two inputs. Never toISOString() -- that
// shifts to UTC and lands on the wrong day for anyone east of Greenwich.
export function isoToLocalParts(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

export function dayKeyOf(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// "in 2 hours", "in 3 days", "now" -- how the reminder reads in the bell.
export function relativeToNow(iso: string, from = Date.now()) {
  const diffMs = new Date(iso).getTime() - from;
  const mins = Math.round(diffMs / 60000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
