"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLead } from "./actions";
import type { LeadRow } from "./data";

const LEAD_SOURCES = [
  "FB Ads — Medical Card",
  "Referral",
  "WhatsApp inbound",
  "Roadshow",
  "Walk-in",
];

export function EditLeadModal({ lead, onClose }: { lead: LeadRow; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateLead(lead.id, formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated">
        <div className="text-lg font-bold text-navy">Edit Lead</div>
        <form action={handleSubmit} className="mt-4 flex flex-col gap-3">
          <Field label="Full name" name="full_name" defaultValue={lead.full_name} required />
          <Field label="Phone" name="phone" defaultValue={lead.phone} required />
          <Field label="Email" name="email" type="email" defaultValue={lead.email ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth" name="date_of_birth" type="date" defaultValue={lead.date_of_birth ?? ""} />
            <Field label="State" name="state" defaultValue={lead.state ?? ""} />
          </div>
          <Field label="Occupation" name="occupation" defaultValue={lead.occupation ?? ""} />
          <label className="block">
            <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">
              Lead source
            </span>
            <select
              name="lead_source"
              defaultValue={lead.lead_source ?? ""}
              className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy"
            >
              <option value="">—</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <Field label="Interest / product note" name="interest" defaultValue={lead.interest ?? ""} />

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
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, name, required, type = "text", defaultValue,
}: { label: string; name: string; required?: boolean; type?: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
      />
    </label>
  );
}
