"use client";

import { useState } from "react";
import { QuotationIcon } from "@/components/icons";
import { quoteLauncherUrl } from "@/lib/quote-launcher";
import { EditLeadModal } from "./edit-lead-modal";
import type { LeadRow } from "./data";

export function LeadRowActions({ lead }: { lead: LeadRow }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-sand-2 bg-cream"
        aria-label="Lead actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor" className="text-navy">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 z-20 mt-1.5 w-[210px] rounded-[14px] border border-sand-2 bg-white p-1.5 shadow-elevated">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setEditing(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-navy hover:bg-cream"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
                <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
              </svg>
              Edit
            </button>
            <a
              href={quoteLauncherUrl("imedi-evolusi-quote.html", lead)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-semibold text-navy hover:bg-cream"
            >
              <QuotationIcon width={14} height={14} />
              Generate estimate
            </a>
            <a
              href={quoteLauncherUrl("quickquote-hibah-life-takaful.html", lead)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-semibold text-navy hover:bg-cream"
            >
              <QuotationIcon width={14} height={14} />
              Create Quotation
            </a>
          </div>
        </>
      )}

      {editing && <EditLeadModal lead={lead} onClose={() => setEditing(false)} />}
    </div>
  );
}
