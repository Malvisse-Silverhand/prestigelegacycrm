"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLead } from "./actions";

// Shared by the desktop icon and the mobile swipe action -- one place that
// calls deleteLead and tracks pending/error, so the two triggers can't drift
// into different confirm copy or different error handling. deleteLead is a
// soft delete (server-enforced SuperAdmin-only); the confirm text below
// reflects that, not a permanent removal.
export function useDeleteLead(leadId: string) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function requestDelete() {
    setError(null);
    setConfirming(true);
  }
  function cancel() {
    if (pending) return;
    setConfirming(false);
    setError(null);
  }
  function confirmDelete() {
    startTransition(async () => {
      try {
        const result = await deleteLead(leadId);
        if (result.error) {
          setError(result.error);
          return;
        }
        setConfirming(false);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return { confirming, pending, error, requestDelete, cancel, confirmDelete };
}

export function DeleteLeadDialog({
  fullName,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  fullName: string;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated">
        <div className="text-[15px] font-bold text-navy">Delete {fullName}?</div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          This removes them from every list, but nothing is gone for good -- a SuperAdmin can restore them from Leads
          Manager &rsaquo; Deleted at any time.
        </p>
        {error && <p className="mt-2 text-[12px] font-semibold text-alert-red">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="press flex-1 rounded-[10px] border border-sand-2 bg-cream py-2.5 text-[13px] font-semibold text-navy disabled:opacity-60"
          >
            Keep lead
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="press flex-1 rounded-[10px] bg-alert-red py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
