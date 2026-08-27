"use client";

import { useState } from "react";
import { AddLeadModal } from "./add-lead-modal";

export function AddLeadButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-[11px] bg-navy px-[17px] py-3 text-[13px] font-semibold text-white"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth={2.4} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add Lead
      </button>
      <AddLeadModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
