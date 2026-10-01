"use client";

import { TrashIcon } from "@/components/icons";
import { useDeleteLead, DeleteLeadDialog } from "./delete-lead";

// Desktop only: a small red trash icon at the end of the Actions column,
// styled in red so it reads as destructive next to Edit and Quote.
// SuperAdmin-only, matching deleteLead's own server-side check -- callers
// only render this when isSuperAdmin is true.
export function DeleteLeadIcon({ lead }: { lead: { id: string; full_name: string } }) {
  const { confirming, pending, error, requestDelete, cancel, confirmDelete } = useDeleteLead(lead.id);

  return (
    <>
      <button
        type="button"
        onClick={requestDelete}
        aria-label={`Delete ${lead.full_name}`}
        title="Delete lead"
        className="press flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#f6d5cf] bg-white text-alert-red hover:bg-alert-red-bg"
      >
        <TrashIcon width={13} height={13} />
      </button>
      {confirming && (
        <DeleteLeadDialog
          fullName={lead.full_name}
          pending={pending}
          error={error}
          onCancel={cancel}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
