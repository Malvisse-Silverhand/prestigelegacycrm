"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AppointmentRow } from "@/app/(app)/appointments/data";
import { AppointmentDialog, type AppointmentDraft } from "@/app/(app)/appointments/appointment-dialog";
import { setAppointmentStatus, deleteAppointment } from "@/app/(app)/appointments/actions";
import { formatTime, isoToLocalParts, relativeToNow, APPOINTMENT_STATUS_LABEL } from "@/lib/appointments";
import { CalendarIcon } from "@/components/icons";

const STATUS_TONE: Record<string, string> = {
  scheduled: "bg-navy text-white",
  completed: "bg-success-bg text-green",
  cancelled: "bg-sand-2 text-taupe-2",
};

// Outside the component: reading the clock during render is impure, and this
// only has to be right at the moment the list is built. Upcoming first, then
// everything already done, cancelled or in the past.
function splitByTime(list: AppointmentRow[]) {
  const now = Date.now();
  const upcoming: AppointmentRow[] = [];
  const past: AppointmentRow[] = [];
  for (const a of list) {
    if (a.status === "scheduled" && new Date(a.scheduledAt).getTime() >= now) upcoming.push(a);
    else past.push(a);
  }
  upcoming.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return { upcoming, past };
}

// Default slot for a fresh booking: tomorrow at 10am, so the common case is
// two taps rather than a full date entry.
function tomorrowAt10(): { date: string; time: string } {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, time: "10:00" };
}

export function LeadAppointments({
  leadId,
  leadName,
  appointments,
}: {
  leadId: string;
  leadName: string;
  appointments: AppointmentRow[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<AppointmentDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { upcoming, past } = splitByTime(appointments);

  function run(fn: () => Promise<{ error: string | null }>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await fn();
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="mt-[22px] rounded-[16px] border border-sand bg-white p-[18px]">
      {draft && (
        <AppointmentDialog
          draft={draft}
          leads={[]}
          lockedLeadName={leadName}
          onClose={() => setDraft(null)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarIcon width={15} height={15} className="text-navy" />
          <div className="text-[14.5px] font-bold text-navy">Appointment</div>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setDraft({ id: null, leadId, ...tomorrowAt10(), location: "", remarks: "" });
          }}
          className="rounded-[9px] bg-gold px-3.5 py-2 text-[12px] font-bold text-navy shadow-sm hover:brightness-95"
        >
          + Set appointment
        </button>
      </div>

      {error && <div className="mt-2.5 text-[12px] font-semibold text-alert-red">{error}</div>}

      {appointments.length === 0 ? (
        <p className="mt-3 rounded-[10px] border border-dashed border-sand-2 px-3.5 py-4 text-center text-[12px] font-medium text-taupe">
          No appointment set. Booking one moves this lead into the Appointment column and schedules reminders 24 hours,
          1 hour and 15 minutes before.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {[...upcoming, ...past].map((a, i) => {
            const isUpcoming = i < upcoming.length;
            return (
              <div key={a.id} className="rounded-[11px] border border-sand-2 bg-cream px-3.5 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-bold text-navy">
                        {new Date(a.scheduledAt).toLocaleDateString("en-MY", {
                          weekday: "short", day: "numeric", month: "short", year: "numeric",
                        })}{" "}
                        · {formatTime(a.scheduledAt)}
                      </span>
                      <span
                        className={`rounded-[6px] px-2 py-[2px] text-[9px] font-bold uppercase ${
                          STATUS_TONE[a.status] ?? STATUS_TONE.scheduled
                        }`}
                      >
                        {APPOINTMENT_STATUS_LABEL[a.status]}
                      </span>
                      {isUpcoming && (
                        <span className="text-[10.5px] font-bold text-warn-orange">
                          {relativeToNow(a.scheduledAt)}
                        </span>
                      )}
                    </div>
                    {a.location && (
                      <div className="mt-0.5 text-[11.5px] font-medium text-muted">{a.location}</div>
                    )}
                    {a.remarks && (
                      <div className="mt-1 text-[11.5px] leading-relaxed text-taupe">{a.remarks}</div>
                    )}
                  </div>
                  <div className="flex flex-none flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        const parts = isoToLocalParts(a.scheduledAt);
                        setDraft({
                          id: a.id,
                          leadId,
                          date: parts.date,
                          time: parts.time,
                          location: a.location ?? "",
                          remarks: a.remarks ?? "",
                        });
                      }}
                      className="rounded-[8px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy disabled:opacity-60"
                    >
                      Reschedule
                    </button>
                    {a.status === "scheduled" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => setAppointmentStatus(a.id, "completed"))}
                        className="rounded-[8px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy disabled:opacity-60"
                      >
                        Mark done
                      </button>
                    )}
                    {confirmDeleteId === a.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-[8px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy"
                        >
                          Keep
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => deleteAppointment(a.id))}
                          className="rounded-[8px] bg-alert-red px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
                        >
                          {pending ? "Deleting…" : "Yes, delete"}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setConfirmDeleteId(a.id)}
                        className="rounded-[8px] border border-[#f6d5cf] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-alert-red disabled:opacity-60"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
