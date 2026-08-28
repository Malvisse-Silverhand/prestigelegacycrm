"use client";

import { useState, useTransition } from "react";
import { createLead } from "./actions";

const LEAD_SOURCES = [
  "FB Ads — Medical Card",
  "Referral",
  "WhatsApp inbound",
  "Roadshow",
  "Walk-in",
];

export function AddLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createLead(formData);
        if (result.error) {
          setError(result.error);
        } else {
          onClose();
        }
      } catch {
        // The Server Action call itself failed (offline, request dropped
        // mid-flight) rather than returning a handled {error} result --
        // surface it the same way instead of leaving an uncaught rejection.
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated">
        <div className="text-lg font-bold text-navy">Add Lead</div>
        <form action={handleSubmit} className="mt-4 flex flex-col gap-3">
          <Field label="Full name" name="full_name" required />
          <Field label="Phone" name="phone" required />
          <Field label="Email" name="email" type="email" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="State" name="state" />
            <Field label="Occupation" name="occupation" />
          </div>
          <label className="block">
            <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">
              Lead source
            </span>
            <select
              name="lead_source"
              className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy"
            >
              <option value="">—</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <Field label="Interest / product note" name="interest" />

          {error && (
            <div className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
              {error}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, name, required, type = "text",
}: { label: string; name: string; required?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
      />
    </label>
  );
}
