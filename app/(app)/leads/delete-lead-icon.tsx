"use client";

import { TrashIcon } from "@/components/icons";
import { useDeleteLead, DeleteLeadDialog } from "./delete-lead";

// Desktop only: a small red trash icon under the status badge, in the Status
// column rather than the far-right Actions column -- deleting is not "one
// more row action" alongside Edit and Quote, it is destructive enough to sit
// apart, next to the thing it changes (the lead stops having a status at
// all). SuperAdmin-only, matching deleteLead's own server-side check --
// callers only render this when isSuperAdmin is true.
export function DeleteLeadIcon({ lead }: { lead: { id: string; full_name: string } }) {
  const { confirming, pending, error, requestDelete, cancel, confirmDelete } = useDeleteLead(lead.id);

  return (
    <>
      <button
        type="button"
        onClick={requestDelete}
        aria-label={`Delete ${lead.full_name}`}
        title="Delete lead"
        className="press mt-1 flex h-6 w-6 items-center justify-center rounded-[7px] text-alert-red hover:bg-alert-red-bg"
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
