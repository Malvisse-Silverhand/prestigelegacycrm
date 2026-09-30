"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Birthday } from "@/lib/birthdays";
import { birthdayWish } from "@/lib/birthdays";
import { waLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/icons";
import { fmtRM } from "../certificate-panel";
import type { CalendarDue } from "./servicing-calendar";

/**
 * Everything for one calendar day -- contributions due and birthdays -- in a
 * bottom sheet (centred on larger screens). Replaces the inline list that used
 * to render under the grid: with birthdays added, a day can carry two kinds
 * of thing worth showing, and a sheet gives both room without pushing the
 * calendar itself around.
 */
export function DayModal({
  title,
  dues,
  birthdays,
  caseLeadIds,
  onSelectCase,
  onSelectLead,
  onClose,
}: {
  title: string;
  dues: CalendarDue[];
  birthdays: Birthday[];
  /** Leads with a certificate on this book -- the "View" action opens the
   *  case directly for these; everyone else has no case yet, so it links to
   *  their Lead Detail page instead. */
  caseLeadIds: Set<string>;
  onSelectCase: (caseId: string) => void;
  onSelectLead: (leadId: string) => void;
  onClose: () => void;
}) {
  // Same escape-and-scroll-lock pattern as the mobile nav drawer.
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
      aria-label={title}
      className="fixed inset-0 z-40 flex items-end justify-center bg-navy/55 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-rise max-h-[85dvh] w-full overflow-y-auto rounded-t-[20px] bg-white p-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:max-w-[440px] sm:rounded-[18px]">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[14px] font-bold text-navy">{title}</div>
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

        {dues.length > 0 && (
          <div className="mt-3">
            <div className="text-[11.5px] font-bold text-navy">
              Contributions ({dues.length})
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {dues.map((e, i) => (
                <button
                  key={`${e.caseId}-${i}`}
                  type="button"
                  onClick={() => onSelectCase(e.caseId)}
                  className="flex items-center gap-2 rounded-[9px] bg-cream px-2.5 py-2 text-left hover:ring-1 hover:ring-brand"
                >
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-navy">{e.clientName}</span>
                  <span className="flex-none text-[11.5px] font-bold text-navy">RM{fmtRM(e.amount)}</span>
                  <span
                    className={`flex-none rounded-[5px] px-[6px] py-[1px] text-[9.5px] font-bold ${
                      e.paid
                        ? "bg-success-bg text-green"
                        : e.overdue
                          ? "bg-alert-red-bg text-alert-red"
                          : "bg-warn-gold-bg text-warn-gold-text"
                    }`}
                  >
                    {e.paid ? "Paid" : e.overdue ? "Overdue" : "Due"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {birthdays.length > 0 && (
          <div className={dues.length > 0 ? "mt-4" : "mt-3"}>
            <div className="text-[11.5px] font-bold text-navy">
              Birthdays ({birthdays.length})
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {birthdays.map((b) => (
                <div key={b.id} className="flex items-center gap-2.5 rounded-[9px] bg-cream px-2.5 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold text-navy">{b.fullName}</div>
                    <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-taupe">
                      {b.turningAge !== null && <span>turns {b.turningAge}</span>}
                      <span className="rounded-[4px] bg-success-bg px-1 py-[1px] text-[8.5px] font-bold tracking-[0.05em] text-green">
                        CLIENT
                      </span>
                    </div>
                  </div>
                  {b.phone && (
                    <a
                      href={waLink(b.phone, birthdayWish(b))}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Wish ${b.fullName} on WhatsApp`}
                      title="Send birthday wish"
                      className="press flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-green text-white"
                    >
                      <WhatsAppIcon width={14} height={14} fill="#fff" />
                    </a>
                  )}
                  {caseLeadIds.has(b.id) ? (
                    <button
                      type="button"
                      onClick={() => onSelectLead(b.id)}
                      className="press flex-none rounded-[9px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-bold text-navy"
                    >
                      View
                    </button>
                  ) : (
                    <Link
                      href={`/leads/${b.id}`}
                      onClick={onClose}
                      className="press flex-none rounded-[9px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-bold text-navy"
                    >
                      View
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
