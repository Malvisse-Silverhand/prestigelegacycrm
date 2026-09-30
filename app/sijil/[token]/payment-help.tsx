"use client";

import { useEffect, useState } from "react";
import type { PortalPayload } from "@/lib/client-portal";
import { CARELINE_TEL, type PortalLang } from "@/lib/portal-copy";
import {
  JOMPAY_BILLER_CODE,
  JOMPAY_GUIDE_URL,
  CARELINE,
  IGIT_LOGIN_URL,
  JOMPAY_GUIDE,
  EASIPAY_GUIDE,
  PAYMENT_HELP_UI,
} from "@/lib/portal-payment-guide";

// A fixed name, not translated -- the same label the portal's own "WhatsApp
// Agent" button uses everywhere else.
const AGENT_WHATSAPP_LABEL = "WhatsApp Agent";

// Duplicated rather than imported from `portal-view.tsx`, to avoid a
// circular import between the two client components.
function fmtRM(value: number | null): string | null {
  if (value === null) return null;
  return `RM${value.toLocaleString("en-MY", { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/**
 * The green "Cara Bayar Caruman" / "How to Pay" button that opens the
 * JomPAY / Easi-Pay guide. It never renders for a certificate with nothing
 * outstanding -- there is nothing to pay, so there is nothing to explain.
 */
export function PaymentHelpButton({
  payload,
  lang,
  tone,
}: {
  payload: PortalPayload;
  lang: PortalLang;
  tone: "onDark" | "onLight";
}) {
  const [open, setOpen] = useState(false);
  if (payload.amountsDue.length === 0) return null;
  const ui = PAYMENT_HELP_UI[lang];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`press flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-green px-3 py-2.5 text-[12.5px] font-bold text-white ${
          tone === "onDark" ? "ring-1 ring-white/20" : ""
        }`}
      >
        <IconWallet className="h-4 w-4 flex-none" />
        {ui.button}
      </button>
      {open && <PaymentHelpModal payload={payload} lang={lang} onClose={() => setOpen(false)} />}
    </>
  );
}

type Accordion = "jompay" | "easipay";

function PaymentHelpModal({
  payload,
  lang,
  onClose,
}: {
  payload: PortalPayload;
  lang: PortalLang;
  onClose: () => void;
}) {
  const ui = PAYMENT_HELP_UI[lang];
  const [openAcc, setOpenAcc] = useState<Accordion | null>("jompay");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function copy(value: string, key: string) {
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 1500);
      })
      .catch(() => {
        // Clipboard access can fail (older browsers, blocked permission).
        // Nothing to show for it beyond leaving the value on screen to copy
        // by hand.
      });
  }

  const totalDueLabel = fmtRM(payload.totalDue);
  const waHref = payload.agent.waNumber
    ? `https://wa.me/${payload.agent.waNumber}?text=${encodeURIComponent(
        `Salam, saya perlukan bantuan untuk bayar caruman sijil ${payload.certificateNo ?? ""}.`,
      )}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[20px] bg-white p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_24px_50px_-20px_rgba(15,37,64,.6)] sm:max-w-[440px] sm:rounded-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[15px] font-bold leading-snug tracking-[-0.01em] text-navy">{ui.modalTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sand-3 text-taupe"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        {ui.note && <p className="mt-1 text-[10.5px] font-medium text-taupe">{ui.note}</p>}

        <div className="mt-3 flex flex-col gap-2.5">
          {/* Accordion A: JomPAY, open by default. */}
          <div className="overflow-hidden rounded-[16px] border border-sand bg-white shadow-card">
            <button
              type="button"
              onClick={() => setOpenAcc(openAcc === "jompay" ? null : "jompay")}
              aria-expanded={openAcc === "jompay"}
              aria-controls="payment-help-jompay"
              className="press flex min-h-11 w-full items-center justify-between gap-2 p-3.5 text-left"
            >
              <span className="text-[13px] font-bold tracking-[-0.01em] text-navy">{ui.accordionJompay}</span>
              <IconChevron
                className={`h-3.5 w-3.5 flex-none text-taupe transition-transform ${openAcc === "jompay" ? "rotate-180" : ""}`}
              />
            </button>

            {openAcc === "jompay" && (
              <div id="payment-help-jompay" className="border-t border-sand-3 px-3.5 pb-3.5 pt-3">
                <p className="text-[11.5px] font-medium leading-relaxed text-ink">{JOMPAY_GUIDE.intro}</p>

                <div className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">
                  {JOMPAY_GUIDE.stepsTitle}
                </div>
                <ol className="mt-1.5 flex flex-col gap-2">
                  {JOMPAY_GUIDE.steps.map((step, i) => (
                    <li key={step} className="flex items-start gap-2.5">
                      <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-info-blue-bg-2 text-[10.5px] font-extrabold text-info-blue-text">
                        {i + 1}
                      </span>
                      <span className="mt-0.5 text-[11.5px] font-medium leading-relaxed text-ink">{step}</span>
                    </li>
                  ))}
                </ol>

                <div className="mt-3 rounded-[12px] border border-sand-2 bg-cream p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">
                    {JOMPAY_GUIDE.exampleTitle}
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    <ExampleRow
                      label="Biller code"
                      value={JOMPAY_BILLER_CODE}
                      onCopy={() => copy(JOMPAY_BILLER_CODE, "biller")}
                      copied={copiedKey === "biller"}
                      copyLabel={ui.copy}
                      copiedLabel={ui.copied}
                    />
                    <ExampleRow
                      label="Ref 1"
                      value={payload.certificateNo ?? "No. sijil anda"}
                      onCopy={payload.certificateNo ? () => copy(payload.certificateNo as string, "ref1") : undefined}
                      copied={copiedKey === "ref1"}
                      copyLabel={ui.copy}
                      copiedLabel={ui.copied}
                    />
                    {/* The certificate owner's own phone, read back to them
                        from Leads Manager -- the client is already behind
                        their own login here. Falls back to the placeholder
                        when there is no phone on file. */}
                    <ExampleRow
                      label="Ref 2"
                      value={payload.clientPhone ?? ui.ref2Placeholder}
                      onCopy={payload.clientPhone ? () => copy(payload.clientPhone as string, "ref2") : undefined}
                      copied={copiedKey === "ref2"}
                      copyLabel={ui.copy}
                      copiedLabel={ui.copied}
                      placeholder={!payload.clientPhone}
                    />
                    <ExampleRow
                      label="Amount"
                      value={totalDueLabel ?? "—"}
                      onCopy={totalDueLabel ? () => copy(totalDueLabel, "amount") : undefined}
                      copied={copiedKey === "amount"}
                      copyLabel={ui.copy}
                      copiedLabel={ui.copied}
                    />
                  </div>
                </div>

                <a
                  href={JOMPAY_GUIDE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press mt-3 flex min-h-11 items-center gap-2.5 rounded-[12px] border border-sand-2 bg-cream px-3 py-2.5"
                >
                  <IconExternal className="h-3.5 w-3.5 flex-none text-taupe" />
                  <span className="min-w-0 flex-1 text-[11.5px] font-semibold text-navy">{JOMPAY_GUIDE.infoLabel}</span>
                </a>
              </div>
            )}
          </div>

          {/* Accordion B: Easi-Pay. */}
          <div className="overflow-hidden rounded-[16px] border border-sand bg-white shadow-card">
            <button
              type="button"
              onClick={() => setOpenAcc(openAcc === "easipay" ? null : "easipay")}
              aria-expanded={openAcc === "easipay"}
              aria-controls="payment-help-easipay"
              className="press flex min-h-11 w-full items-center justify-between gap-2 p-3.5 text-left"
            >
              <span className="text-[13px] font-bold tracking-[-0.01em] text-navy">{ui.accordionEasipay}</span>
              <IconChevron
                className={`h-3.5 w-3.5 flex-none text-taupe transition-transform ${openAcc === "easipay" ? "rotate-180" : ""}`}
              />
            </button>

            {openAcc === "easipay" && (
              <div id="payment-help-easipay" className="border-t border-sand-3 px-3.5 pb-3.5 pt-3">
                <p className="text-[11.5px] font-medium leading-relaxed text-ink">{EASIPAY_GUIDE.intro}</p>

                <div className="mt-3 flex flex-col gap-2">
                  {EASIPAY_GUIDE.features.map((f) => (
                    <div key={f.title} className="rounded-[12px] bg-cream p-3">
                      <div className="flex items-center gap-2">
                        <IconStar className="h-3.5 w-3.5 flex-none text-gold" />
                        <span className="text-[12px] font-bold text-navy">{f.title}</span>
                      </div>
                      <p className="mt-1 text-[11px] font-medium leading-relaxed text-ink">{f.body}</p>
                    </div>
                  ))}
                </div>

                <ol className="mt-3.5 flex flex-col border-l-2 border-sand-2 pl-4">
                  {EASIPAY_GUIDE.steps.map((step, i) => (
                    <li key={step.title} className="relative pb-3.5">
                      <span className="absolute -left-[27px] top-0 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand text-[10.5px] font-extrabold text-white">
                        {i + 1}
                      </span>
                      <span className="block text-[12.5px] font-bold leading-snug text-navy">{step.title}</span>
                      <span className="mt-0.5 block text-[11.5px] font-medium leading-relaxed text-ink">{step.body}</span>
                    </li>
                  ))}
                  <li className="relative">
                    <span className="absolute -left-[27px] top-0 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-green text-white">
                      <IconCheck className="h-3 w-3" />
                    </span>
                    <span className="block text-[12.5px] font-bold leading-snug text-green">{EASIPAY_GUIDE.doneTitle}</span>
                    <span className="mt-0.5 block text-[11.5px] font-medium leading-relaxed text-ink">{EASIPAY_GUIDE.doneBody}</span>
                  </li>
                </ol>

                <a
                  href={IGIT_LOGIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press mt-3.5 flex min-h-11 items-center gap-2.5 rounded-[12px] border border-sand-2 bg-cream px-3 py-2.5"
                >
                  <IconExternal className="h-3.5 w-3.5 flex-none text-taupe" />
                  <span className="min-w-0 flex-1 text-[11.5px] font-semibold text-navy">Buka iGetInTouch</span>
                </a>

                <div className="mt-3 rounded-[12px] border border-[#f0dfb4] bg-warn-gold-bg p-3 text-[11px] font-medium leading-relaxed text-warn-gold-text">
                  {EASIPAY_GUIDE.note} Bantuan: Careline{" "}
                  <a href={CARELINE_TEL} className="underline underline-offset-2">
                    {CARELINE}
                  </a>
                  .
                </div>
              </div>
            )}
          </div>
        </div>

        {waHref && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-[12px] border border-sand-2 bg-cream p-3">
            <span className="min-w-0 flex-1 text-[11.5px] font-semibold text-navy">{ui.needHelp}</span>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={AGENT_WHATSAPP_LABEL}
              title={AGENT_WHATSAPP_LABEL}
              className="press flex min-h-11 flex-none items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-green px-2.5 py-2 text-[10.5px] font-bold leading-tight text-white"
            >
              <IconWhatsApp className="h-[15px] w-[15px] flex-none" />
              {AGENT_WHATSAPP_LABEL}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function ExampleRow({
  label,
  value,
  onCopy,
  copied,
  copyLabel,
  copiedLabel,
  placeholder,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
  copyLabel?: string;
  copiedLabel?: string;
  placeholder?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex-none text-[11px] font-semibold text-taupe-2">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={`truncate font-mono text-[12px] font-bold ${placeholder ? "italic text-taupe" : "text-navy"}`}
        >
          {value}
        </span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="press flex-none rounded-[8px] bg-sand-3 px-2 py-1 text-[10px] font-bold text-navy"
          >
            {copied ? copiedLabel : copyLabel}
          </button>
        )}
      </span>
    </div>
  );
}

/* Icons: inline, currentColor, matching the portal's own style. */
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IconWallet({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h11a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 17 19H6a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M14.5 12.5h4M16.5 12.5v.01" />
    </svg>
  );
}
function IconClose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function IconChevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.4}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IconExternal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}
function IconStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="m12 3 2.6 5.6 6.1.7-4.6 4.1 1.3 6.1L12 16.8 6.6 19.5l1.3-6.1-4.6-4.1 6.1-.7Z" />
    </svg>
  );
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.6}>
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}
function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Z" />
    </svg>
  );
}
