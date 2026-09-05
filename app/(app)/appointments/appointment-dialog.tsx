"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveAppointment } from "./actions";
import type { LeadOption } from "./data";

const FIELD =
  "mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-white px-3.5 text-[13px] font-medium text-navy outline-none focus:border-gold dark:border-white/10 dark:bg-[#0b1a2b] dark:text-[#eef3f8]";
const LABEL = "text-[12px] font-semibold text-navy dark:text-[#eef3f8]";

export type AppointmentDraft = {
  id: string | null;
  leadId: string;
  date: string;
  time: string;
  location: string;
  remarks: string;
};

// One dialog for every entry point: an empty calendar slot on the Appointment
// page, an existing entry being edited, and the box on Lead Detail (which
// passes a single fixed lead and hides the picker).
export function AppointmentDialog({
  draft,
  leads,
  lockedLeadName,
  onClose,
}: {
  draft: AppointmentDraft;
  leads: LeadOption[];
  lockedLeadName?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(draft);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveAppointment(form);
        if (result.error) {
          setError(result.error);
          return;
        }
        onClose();
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  const noLeads = !lockedLeadName && leads.length === 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/55 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-2xl bg-white p-6 shadow-elevated dark:bg-[#12283f]"
      >
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-bold text-navy dark:text-[#eef3f8]">
            {draft.id ? "Edit Appointment" : "Set Appointment"}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[12.5px] font-semibold text-muted hover:text-navy dark:text-[#7f93aa]"
          >
            Close
          </button>
        </div>

        <div className="mt-4 border-t border-sand pt-4 dark:border-white/10">
          <label className="block">
            <span className={LABEL}>Lead</span>
            {lockedLeadName ? (
              <div className={`${FIELD} flex items-center font-semibold`}>{lockedLeadName}</div>
            ) : (
              <select
                required
                value={form.leadId}
                onChange={(e) => setForm({ ...form, leadId: e.target.value })}
                className={FIELD}
              >
                <option value="">Select lead</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fullName}
                    {l.phone ? ` — ${l.phone}` : ""}
                  </option>
                ))}
              </select>
            )}
          </label>

          <div className="mt-3.5 grid grid-cols-2 gap-3">
            <label className="block">
              <span className={LABEL}>Date</span>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className={LABEL}>Time</span>
              <input
                type="time"
                required
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className={FIELD}
              />
            </label>
          </div>

          <label className="mt-3.5 block">
            <span className={LABEL}>Location</span>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Office / Cafe / Zoom / Meet"
              className={FIELD}
            />
          </label>

          <label className="mt-3.5 block">
            <span className={LABEL}>Remarks (optional)</span>
            <textarea
              rows={3}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Quick notes..."
              className={`${FIELD} h-auto resize-none py-2.5`}
            />
          </label>
        </div>

        {error && <div className="mt-3 text-[12px] font-semibold text-alert-red">{error}</div>}

        {noLeads && (
          <div className="mt-3 rounded-[10px] bg-warn-gold-bg px-3 py-2.5 text-[11.5px] font-medium text-warn-gold-text">
            No leads available yet. Add a lead in Leads Manager first.
          </div>
        )}

        <div className="mt-5 flex justify-end border-t border-sand pt-4 dark:border-white/10">
          <button
            type="submit"
            disabled={pending || noLeads}
            className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50 dark:bg-gold dark:text-navy"
          >
            {pending ? "Saving…" : "Save Appointment"}
          </button>
        </div>
      </form>
    </div>
  );
}
