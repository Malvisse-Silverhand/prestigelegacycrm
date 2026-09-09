"use client";

import { useState } from "react";
import { ImportModal } from "./import-modal";

export function ImportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press flex items-center gap-2 rounded-[11px] border border-sand-2 bg-white px-3 py-2 text-[12.5px] font-semibold text-navy lg:px-[17px] lg:py-3 lg:text-[13px]"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        {/* The full label is what pushed this onto a row of its own on a
            phone; the icon already carries the meaning there. */}
        <span className="lg:hidden">Import</span>
        <span className="hidden lg:inline">Import from Google Sheets</span>
      </button>
      <ImportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
