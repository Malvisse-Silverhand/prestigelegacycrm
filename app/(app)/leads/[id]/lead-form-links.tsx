"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FORM_LINK_TTL_DAYS,
  FORM_STAGES,
  FORM_STATUS_LABEL,
  type FormLinkEffectiveStatus,
  type FormLinkSummary,
  type FormStage,
} from "@/lib/lead-form-fields";
import { waLink } from "@/lib/whatsapp";
import { malaysiaDateTime } from "@/lib/malaysia-date";
import { createFormLink, reopenFormLink, revokeFormLink } from "./form-link-actions";

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.43" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.33-1.33" />
    </svg>
  );
}

const STATUS_CHIP: Record<FormLinkEffectiveStatus, string> = {
  sent: "bg-info-blue-bg text-info-blue-text",
  opened: "bg-warn-gold-bg text-warn-gold-text",
  in_progress: "bg-warn-gold-bg text-warn-gold-text",
  completed: "bg-success-bg text-green",
  expired: "bg-sand-2 text-taupe-2",
  revoked: "bg-alert-red-bg text-alert-red",
};

function waMessage(name: string, stage: FormStage, url: string) {
  return [
    `Assalamualaikum & salam sejahtera ${name}.`,
    "",
    stage === 1
      ? "Boleh tolong lengkapkan maklumat tambahan anda melalui borang ringkas ini (mengambil masa beberapa minit sahaja):"
      : "Boleh tolong lengkapkan borang permohonan dan tandatangan anda melalui link ini:",
    "",
    url,
    "",
    `Untuk keselamatan, anda akan diminta mengesahkan nama dan nombor telefon anda. Link ini sah selama ${FORM_LINK_TTL_DAYS} hari.`,
    "",
    "Terima kasih.",
  ].join("\n");
}

const LEAD_FORMS_CARD_ID = "lead-forms";
const STAGES: FormStage[] = [1, 2];

/**
 * "Collect details", beside Edit in the Lead details header: asks which stage,
 * creates the link, then scrolls to the Lead forms card where it is listed
 * with its Copy / WhatsApp actions.
 */
export function CollectDetailsButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [busyStage, setBusyStage] = useState<FormStage | null>(null);
  const [error, setError] = useState<string | null>(null);

  function create(stage: FormStage) {
    setError(null);
    setBusyStage(stage);
    start(async () => {
      try {
        const result = await createFormLink(leadId, stage);
        if (result.error) {
          setError(result.error);
          return;
        }
        setOpen(false);
        router.refresh();
        window.setTimeout(
          () => document.getElementById(LEAD_FORMS_CARD_ID)?.scrollIntoView({ behavior: "smooth", block: "start" }),
          300,
        );
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      } finally {
        setBusyStage(null);
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          setError(null);
          setOpen((o) => !o);
        }}
        className="flex items-center gap-1.5 rounded-[9px] border border-sand-2 bg-cream px-3.5 py-2 text-[12px] font-bold text-navy shadow-sm hover:border-brand"
      >
        <LinkIcon />
        Collect details
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" aria-hidden onClick={() => !pending && setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-[min(300px,calc(100vw-48px))] rounded-[12px] border border-sand bg-white p-2 shadow-lg"
          >
            <div className="px-1.5 pt-1 pb-2 text-[11.5px] font-bold text-navy">Which details do you need?</div>
            <div className="flex flex-col gap-1.5">
              {STAGES.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  role="menuitem"
                  disabled={pending}
                  onClick={() => create(stage)}
                  className="press rounded-[10px] border border-sand-2 bg-cream px-3 py-2.5 text-left hover:border-brand disabled:opacity-60"
                >
                  <div className="text-[12.5px] font-bold text-navy">
                    {busyStage === stage ? "Generating…" : `Stage ${stage} · ${FORM_STAGES[stage].label}`}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-taupe-2">{FORM_STAGES[stage].description}</div>
                </button>
              ))}
            </div>
            {error && (
              <div className="mt-2 rounded-[9px] bg-alert-red-bg px-3 py-2 text-[11.5px] font-medium text-alert-red">{error}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The agent's side of the lead form links: generate a Stage 1 / Stage 2 link,
 * see whether the prospect opened or finished it, resend, extend or revoke.
 * Who may do any of this is decided by RLS on the lead, not here.
 */
export function LeadFormLinks({
  leadName,
  leadPhone,
  links,
  canEdit,
}: {
  leadId: string;
  leadName: string;
  leadPhone: string;
  links: FormLinkSummary[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  function run(key: string, fn: () => Promise<{ error: string | null }>) {
    setError(null);
    setBusyKey(key);
    start(async () => {
      try {
        const result = await fn();
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      } finally {
        setBusyKey(null);
      }
    });
  }

  async function copy(link: FormLinkSummary) {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      window.setTimeout(() => setCopiedId((c) => (c === link.id ? null : c)), 2000);
    } catch {
      setError("Couldn't copy. Open the link and copy it from the address bar.");
    }
  }

  return (
    <div id={LEAD_FORMS_CARD_ID} className="mt-[22px] scroll-mt-4 rounded-[14px] border border-sand bg-white p-3.5 sm:p-[18px]">
      <div className="flex items-center gap-2">
        <LinkIcon className="text-green" />
        <div className="text-[13px] font-bold text-navy">Lead forms</div>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed font-medium text-muted">
        Send {leadName} a private link to fill in their own details. They confirm their name and phone number first, and
        what they submit lands on this lead. Generating a new link for a stage revokes the previous one.
      </p>

      {error && (
        <div className="mt-2.5 rounded-[9px] bg-alert-red-bg px-3 py-2 text-[11.5px] font-medium text-alert-red">{error}</div>
      )}

      {links.length === 0 ? (
        <p className="mt-3 text-[11.5px] font-medium text-taupe">No form links yet. Use “Collect details” at the top of Lead details.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {links.map((link) => {
            const live = link.status === "sent" || link.status === "opened" || link.status === "in_progress";
            const confirming = confirmingId === link.id;
            return (
              <div key={link.id} className="rounded-[11px] border border-sand-2 bg-cream px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[12.5px] font-bold text-navy">
                    Stage {link.stage} · {FORM_STAGES[link.stage].label}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold tracking-[0.05em] ${STATUS_CHIP[link.status]}`}>
                    {FORM_STATUS_LABEL[link.status]}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-medium text-taupe" suppressHydrationWarning>
                  {link.status === "completed" && link.submittedAt
                    ? `Submitted ${malaysiaDateTime(link.submittedAt)}`
                    : link.status === "revoked" && link.revokedAt
                      ? `Revoked ${malaysiaDateTime(link.revokedAt)}`
                      : `${link.status === "expired" ? "Expired" : "Expires"} ${malaysiaDateTime(link.expiresAt)}`}
                  {" · "}
                  {link.openCount === 0
                    ? "not opened"
                    : `opened ${link.openCount}×${link.lastOpenedAt ? `, last ${malaysiaDateTime(link.lastOpenedAt)}` : ""}`}
                  {link.createdByName ? ` · by ${link.createdByName}` : ""}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {live && (
                    <>
                      <button
                        type="button"
                        onClick={() => copy(link)}
                        className="press inline-flex min-h-8 items-center rounded-[9px] border border-sand-2 bg-white px-2.5 text-[11.5px] font-semibold text-navy"
                      >
                        {copiedId === link.id ? "Copied" : "Copy link"}
                      </button>
                      {leadPhone && (
                        <a
                          href={waLink(leadPhone, waMessage(leadName, link.stage, link.url))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="press inline-flex min-h-8 items-center rounded-[9px] border border-sand-2 bg-white px-2.5 text-[11.5px] font-semibold text-green"
                        >
                          Send via WhatsApp
                        </a>
                      )}
                    </>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(`reopen-${link.id}`, async () => (await reopenFormLink(link.id)))}
                      title={`Extends the link ${FORM_LINK_TTL_DAYS} days from now`}
                      className="press inline-flex min-h-8 items-center rounded-[9px] border border-sand-2 bg-white px-2.5 text-[11.5px] font-semibold text-navy disabled:opacity-60"
                    >
                      {busyKey === `reopen-${link.id}` ? "Reopening…" : "Reopen"}
                    </button>
                  )}
                  {canEdit && live && !confirming && (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(link.id)}
                      className="press inline-flex min-h-8 items-center rounded-[9px] border border-[#f0cdc9] bg-alert-red-bg px-2.5 text-[11.5px] font-semibold text-alert-red"
                    >
                      Revoke
                    </button>
                  )}
                </div>

                {confirming && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11.5px] font-semibold text-alert-red">
                      Revoke? The prospect&rsquo;s page stops working straight away.
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setConfirmingId(null);
                        run(`revoke-${link.id}`, () => revokeFormLink(link.id));
                      }}
                      className="press inline-flex min-h-8 items-center rounded-[9px] bg-alert-red px-2.5 text-[11.5px] font-bold text-white disabled:opacity-60"
                    >
                      Yes, revoke
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="press inline-flex min-h-8 items-center rounded-[9px] border border-sand-2 bg-white px-2.5 text-[11.5px] font-semibold text-navy"
                    >
                      Keep it
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
