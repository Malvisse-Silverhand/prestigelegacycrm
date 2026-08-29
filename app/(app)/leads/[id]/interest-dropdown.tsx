"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { quoteLauncherUrl } from "@/lib/quote-launcher";
import { INTEREST_OPTIONS as OPTIONS } from "@/lib/product-interest";
import { QuotationModal } from "@/components/quotation-modal";
import { updateInterest } from "./actions";
import type { LeadDetail } from "./data";

const checkIcon = (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#fac748" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);

const quoteIcon = (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
    <path d="M14 2v5h5" />
    <path d="M9 13h6M9 17h4" />
  </svg>
);

export function InterestDropdown({ lead }: { lead: LeadDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  const currentOption = OPTIONS.find((o) => o.label === lead.interest);

  function handleSelect(option: (typeof OPTIONS)[number]) {
    setOpen(false);
    setComingSoon(false);
    setError(null);

    startTransition(async () => {
      try {
        const result = await updateInterest(lead.id, option.label);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
        return;
      }
    });

    if (option.tool) {
      setModalUrl(quoteLauncherUrl(option.tool, lead));
    } else {
      setComingSoon(true);
    }
  }

  return (
    <div>
      <div className="text-[10.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">Product interest</div>
      <div className="mt-1.5 flex items-start gap-1.5">
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            disabled={pending}
            className="flex w-full items-center gap-2 rounded-[10px] border-[1.5px] border-sand-2 bg-cream px-[11px] py-[9px] text-left disabled:opacity-70"
          >
            <span className="flex-1 text-[13px] font-semibold text-navy">{lead.interest ?? "Choose…"}</span>
            <ChevronIcon open={open} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute top-full left-0 z-20 mt-[5px] flex w-full flex-col gap-0.5 rounded-[11px] border-[1.5px] border-sand-2 bg-cream p-[5px] shadow-elevated">
                {OPTIONS.map((option) => {
                  const selected = lead.interest === option.label;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={
                        selected
                          ? "flex items-center gap-2 rounded-lg bg-navy px-[9px] py-2 text-left text-[12.5px] font-semibold text-white"
                          : "flex items-center gap-2 rounded-lg py-2 pr-[9px] pl-[30px] text-left text-[12.5px] font-medium text-ink"
                      }
                    >
                      {selected && checkIcon}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {currentOption?.tool && (
          <button
            type="button"
            title="Open Quotation"
            aria-label="Open Quotation"
            onClick={() => setModalUrl(quoteLauncherUrl(currentOption.tool!, lead))}
            className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] border-[1.5px] border-sand-2 bg-cream text-navy hover:border-gold"
          >
            {quoteIcon}
          </button>
        )}
      </div>

      <div className="mt-1.5 text-[11px] font-medium text-taupe">Drives which QuickQuote engine opens in Quotation.</div>

      {comingSoon && (
        <div className="mt-2 rounded-[9px] bg-warn-gold-bg px-3 py-2 text-[11.5px] font-medium text-warn-gold-text">
          Coming soon — contact your SuperAdmin.
        </div>
      )}
      {error && <div className="mt-2 text-[11.5px] font-medium text-alert-red">{error}</div>}

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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#a29883"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={open ? "rotate-180 transition-transform" : "transition-transform"}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
