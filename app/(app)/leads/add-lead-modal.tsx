"use client";

import { useState, useTransition } from "react";
import { createLead } from "./actions";
import { LeadFormFields } from "./lead-form-fields";

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
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-elevated">
        <div className="text-lg font-bold text-navy">Add Lead</div>
        <p className="mt-0.5 text-[12.5px] text-muted">Lead ID and Date Created are generated automatically once saved.</p>
        <form action={handleSubmit} className="mt-4 flex flex-col gap-3">
          <LeadFormFields defaults={{}} />

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
