"use client";

import type { ReactNode } from "react";
import { TrashIcon } from "@/components/icons";
import { useDeleteLead, DeleteLeadDialog } from "./delete-lead";
import { useSwipeToDelete, SWIPE_REVEAL_PX } from "./use-swipe-to-delete";

/**
 * Mobile only: swipe the card left to reveal a red "Delete" action behind it
 * -- the same gesture Shopee uses to remove a checkout item. Wraps the
 * existing mobile lead card unchanged; this component only adds the reveal
 * layer and the drag, so a caller who doesn't have delete permission just
 * renders `children` plain instead of reaching for this at all.
 */
export function SwipeToDeleteLeadCard({
  lead,
  children,
}: {
  lead: { id: string; full_name: string };
  children: ReactNode;
}) {
  const { ref, x, dragging, close } = useSwipeToDelete();
  const { confirming, pending, error, requestDelete, cancel, confirmDelete } = useDeleteLead(lead.id);
  const revealed = x < -8;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => {
          close();
          requestDelete();
        }}
        aria-label={`Delete ${lead.full_name}`}
        tabIndex={revealed ? 0 : -1}
        className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 bg-alert-red text-white"
        style={{ width: SWIPE_REVEAL_PX, opacity: revealed ? 1 : 0 }}
      >
        <TrashIcon width={18} height={18} />
        <span className="text-[10.5px] font-bold">Delete</span>
      </button>

      <div
        ref={ref}
        className="relative touch-pan-y select-none"
        style={{
          transform: `translateX(${x}px)`,
          transition: dragging ? "none" : "transform 200ms cubic-bezier(.2,0,.2,1)",
        }}
      >
        {children}
        {/* A tap anywhere on the card while it's revealed closes it instead
            of following the link/buttons underneath -- without this, the
            first tap after a swipe would both close the reveal AND trigger
            whatever was under the finger, which reads as the app
            misbehaving rather than as two separate actions. */}
        {x !== 0 && (
          <button
            type="button"
            aria-label="Close delete action"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              close();
            }}
            className="absolute inset-0 z-10"
          />
        )}
      </div>

      {confirming && (
        <DeleteLeadDialog
          fullName={lead.full_name}
          pending={pending}
          error={error}
          onCancel={cancel}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
