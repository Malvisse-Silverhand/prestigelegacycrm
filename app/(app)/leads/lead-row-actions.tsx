"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { quoteLauncherUrl } from "@/lib/quote-launcher";
import { QuotationModal } from "@/components/quotation-modal";
import { EditLeadModal } from "./edit-lead-modal";
import type { LeadRow } from "./data";

const editPencil = (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
  </svg>
);

const quotationReceipt = (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
    <path d="M14 2v5h5" />
    <path d="M9 13h6M9 17h4" />
  </svg>
);

export function LeadRowActions({ lead }: { lead: LeadRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [quoteMenuOpen, setQuoteMenuOpen] = useState(false);
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  return (
    <div className="flex justify-end gap-1.5">
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Edit"
        title="Edit"
        className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-sand-2 bg-cream text-navy"
      >
        {editPencil}
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setQuoteMenuOpen((v) => !v)}
          aria-label="Quotation"
          title="Quotation"
          aria-haspopup="menu"
          aria-expanded={quoteMenuOpen}
          className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-sand-2 bg-cream text-navy"
        >
          {quotationReceipt}
        </button>

        {quoteMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setQuoteMenuOpen(false)} />
            <div className="absolute top-full right-0 z-20 mt-1.5 w-[170px] rounded-[14px] border border-sand-2 bg-white p-1.5 shadow-elevated">
              <button
                type="button"
                onClick={() => { setQuoteMenuOpen(false); setModalUrl(quoteLauncherUrl("imedi-evolusi-quote.html", lead)); }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-navy hover:bg-cream"
              >
                Medical Card
              </button>
              <button
                type="button"
                onClick={() => { setQuoteMenuOpen(false); setModalUrl(quoteLauncherUrl("quickquote-hibah-life-takaful.html", lead)); }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-navy hover:bg-cream"
              >
                Hibah
              </button>
            </div>
          </>
        )}
      </div>

      {editing && <EditLeadModal lead={lead} onClose={() => setEditing(false)} />}
      <QuotationModal
        url={modalUrl}
        title={`Quotation — ${lead.full_name}`}
        onClose={() => {
          setModalUrl(null);
          router.refresh();
        }}
      />
    </div>
  );
}
