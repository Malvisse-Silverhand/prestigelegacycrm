"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreLead, purgeLead } from "./actions";
import type { LeadRow } from "./data";

// Row actions for the SuperAdmin-only Deleted view. A soft-deleted lead keeps
// its stage, owner and history, so restoring puts it back exactly where it
// was; purging is the only thing that actually removes it.
export function DeletedRowActions({ lead }: { lead: LeadRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ error: string | null }>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await fn();
        if (result.error) {
          setError(result.error);
          return;
        }
        setConfirmPurge(false);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {error && <span className="text-[10.5px] font-semibold text-alert-red">{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => restoreLead(lead.id))}
        className="press rounded-[8px] border border-sand-2 bg-cream px-2.5 py-1.5 text-[11px] font-semibold text-navy disabled:opacity-60"
      >
        Restore
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirmPurge(true)}
        className="press rounded-[8px] border border-[#f6d5cf] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-alert-red disabled:opacity-60"
      >
        Delete forever
      </button>

      {confirmPurge && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-4" onClick={() => setConfirmPurge(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-[15px] font-bold text-navy">Delete {lead.full_name} forever?</div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              This is the only action that actually removes the record. Their quotations, appointments and timeline go
              with it, and it cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmPurge(false)}
                className="press rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => purgeLead(lead.id))}
                className="press rounded-[10px] bg-alert-red px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
