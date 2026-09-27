"use client";

import { useEffect } from "react";
import { CASE_STATUS_LABEL, CASE_STATUS_TONE, type BenefitOption, type CaseSubmission } from "../types";
import { CertificatePanel } from "../certificate-panel";
import type { CaseFormLead } from "../case-form";

/**
 * A case's full detail -- the same CertificatePanel that used to expand
 * inline under its row -- in a modal. Flush on mobile (a bottom sheet),
 * centred on desktop, so clicking a case reads the same way on either
 * viewport instead of splitting into an inline-expand-on-desktop,
 * modal-on-mobile pair.
 */
export function CaseDetailModal({
  submission,
  lead,
  benefitOptions,
  onClose,
}: {
  submission: CaseSubmission;
  lead: CaseFormLead;
  benefitOptions: BenefitOption[];
  onClose: () => void;
}) {
  // Same escape-and-scroll-lock pattern as the servicing modals.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={submission.leadName}
      className="fixed inset-0 z-40 flex items-end justify-center bg-navy/55 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-rise flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-[20px] bg-white sm:max-h-[85dvh] sm:max-w-[720px] sm:rounded-[18px]">
        <div className="flex flex-none items-center justify-between gap-2 border-b border-sand-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[13.5px] font-bold text-navy">{submission.leadName}</span>
              <span className={`rounded-[6px] px-2 py-[2px] text-[9.5px] font-bold uppercase tracking-[0.06em] ${CASE_STATUS_TONE[submission.status]}`}>
                {CASE_STATUS_LABEL[submission.status]}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] border border-sand-2 bg-cream text-navy"
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <CertificatePanel submission={submission} lead={lead} benefitOptions={benefitOptions} />
        </div>
      </div>
    </div>
  );
}
