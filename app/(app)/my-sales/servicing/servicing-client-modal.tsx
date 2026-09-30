"use client";

import { useEffect } from "react";
import Link from "next/link";
import { caseCollected } from "@/lib/case-anc";
import { LeadNo } from "@/components/lead-no";
import { ServicingDetail } from "../servicing-detail";
import { fmtDate, fmtRM } from "../certificate-panel";
import type { CaseSubmission } from "../types";

/**
 * Everything for one client -- header, contribution figures, and the
 * checklist/waiting-periods/client-portal detail underneath -- in a modal.
 * Used to sit permanently in a right-hand column, which meant either an
 * empty "pick a client" panel wasting half the page before a first click, or
 * a narrow squeeze on anything under a wide desktop monitor. A modal gives
 * the detail its own room on any screen and leaves the client list as the
 * whole page the rest of the time.
 */
export function ServicingClientModal({
  submission,
  today,
  siblings,
  onSelectSibling,
  onClose,
}: {
  submission: CaseSubmission;
  today: string;
  siblings: CaseSubmission[];
  onSelectSibling: (caseId: string) => void;
  onClose: () => void;
}) {
  // Same escape-and-scroll-lock pattern as the calendar's DayModal.
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
      <div className="animate-rise flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[20px] bg-white sm:max-h-[85dvh] sm:max-w-[760px] sm:rounded-[18px]">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-sand-3 p-4 sm:p-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <LeadNo no={submission.leadNo} />
              <Link
                href={`/leads/${submission.leadId}`}
                onClick={onClose}
                className="truncate text-[15px] font-bold text-navy hover:underline"
              >
                {submission.leadName}
              </Link>
            </div>
            <div className="mt-0.5 text-[11.5px] font-medium text-muted">
              {submission.planName}
              {submission.certificateNo ? ` · Certificate ${submission.certificateNo}` : ""}
              {submission.commencementDate ? ` · Commenced ${fmtDate(submission.commencementDate)}` : ""}
            </div>
            {/* The two identifiers the client portal groups certificates by.
                Shown together because "why does this client see that
                certificate" is always answered by one of them. */}
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] font-medium">
              <span className={submission.idNo ? "font-mono text-taupe-2" : "font-semibold text-alert-red"}>
                {submission.idNo ? `NRIC ${submission.idNo}` : "No NRIC on file"}
              </span>
              <span className="text-sand-2">·</span>
              <span className={submission.leadEmail ? "text-taupe-2" : "font-semibold text-alert-red"}>
                {submission.leadEmail ?? "No email on file"}
              </span>
            </div>
          </div>
          <div className="flex flex-none items-start gap-3 sm:gap-4">
            <div className="text-right">
              <div className="text-[16px] font-extrabold text-navy">RM{fmtRM(submission.installmentContribution)}</div>
              <div className="text-[10.5px] font-semibold text-taupe">per contribution</div>
            </div>
            {/* What has actually come in against this certificate -- the
                ticked rows at face value, beside the per-payment figure
                they're multiples of. */}
            <div className="border-l border-sand-3 pl-3 text-right sm:pl-4">
              <div className="text-[16px] font-extrabold text-green">
                RM{fmtRM(
                  caseCollected({
                    installmentContribution: submission.installmentContribution,
                    paidCount: submission.schedule.filter((r) => r.paid).length,
                  }),
                )}
              </div>
              <div className="text-[10.5px] font-semibold text-taupe">collected</div>
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
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:p-5">
          {/* Same NRIC as another certificate on this book -- the client's
              own portal already shows these together, so an agent switching
              between the certificates of one client should be able to as
              well, without closing this and searching again. */}
          {siblings.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-warn-gold-bg bg-warn-gold-bg/60 px-3 py-2">
              <span className="text-[10.5px] font-bold text-warn-gold-text">Same client, other certificates:</span>
              {siblings.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSibling(s.id)}
                  className="press rounded-[7px] border border-[#f0dfb4] bg-white px-2 py-1 text-[10.5px] font-semibold text-navy hover:border-brand"
                >
                  {s.certificateNo ?? s.planName}
                </button>
              ))}
            </div>
          )}

          <ServicingDetail submission={submission} today={today} />
        </div>
      </div>
    </div>
  );
}
