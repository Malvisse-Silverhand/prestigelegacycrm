"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PORTAL_STATUSES, PORTAL_STATUS_COPY, statusFromCase } from "@/lib/portal-copy";
import { waLink } from "@/lib/whatsapp";
import { malaysiaDateTime } from "@/lib/malaysia-date";
import { issuePortalLink, revokePortalLink, setPortalStatus } from "./actions";
import type { CaseSubmission } from "./types";

// What the agent picks from. "Follow the case" is first and is the default,
// because the override is the exception: it exists for the states the case
// record has no word for -- a grace period, a reinstatement in progress.
const STATUS_CHOICES: { value: string; label: string }[] = [
  { value: "", label: "Follow the case status" },
  ...PORTAL_STATUSES.map((s) => ({ value: s, label: PORTAL_STATUS_COPY[s].en })),
];

const TONE_CHIP: Record<string, string> = {
  green: "bg-success-bg text-green",
  gold: "bg-warn-gold-bg text-warn-gold-text",
  red: "bg-alert-red-bg text-alert-red",
  grey: "bg-sand-2 text-taupe-2",
};

/**
 * The client portal, from the agent's side: issue a link, see whether the
 * client ever opened it, relabel what they see, close it.
 *
 * Who may do any of this is not decided here. Every action runs through the
 * agent's own session, and RLS on client_portal_links inherits lead
 * visibility -- so the owning agent and every AUM / UM / GM / SuperAdmin above
 * them can revoke, and nobody else can see the row at all.
 */
export function PortalLinkCard({ submission }: { submission: CaseSubmission }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = submission.portalLink;

  // Built in the browser on purpose: the CRM runs on more than one host
  // (localhost, a Vercel preview, the real domain) and the link has to be
  // valid on whichever one the agent is actually looking at.
  const url = link ? `${typeof window === "undefined" ? "" : window.location.origin}/sijil/${link.token}` : "";

  const effective = link?.displayStatus ?? statusFromCase(submission.status);
  const tone = PORTAL_STATUS_COPY[effective as keyof typeof PORTAL_STATUS_COPY];

  function run(fn: () => Promise<{ error: string | null }>) {
    setError(null);
    start(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the link and copy it by hand.");
    }
  }

  const waMessage = [
    `Assalamualaikum & salam sejahtera ${submission.leadName}.`,
    "",
    "Ini pautan portal peribadi untuk sijil takaful anda. Di dalamnya ada nombor sijil, status perlindungan, senarai manfaat, tempoh menunggu dan penama anda.",
    "",
    url,
    "",
    "Pautan ini untuk anda sahaja. Simpan untuk rujukan pada bila-bila masa.",
    "",
    "Terima kasih,",
  ].join("\n");

  return (
    <div className="rounded-[12px] border border-sand-2 bg-cream p-3.5">
      <div className="flex items-baseline justify-between gap-2.5">
        <div className="text-[13px] font-bold text-navy">Client portal</div>
        {link && (
          <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold tracking-[0.05em] ${TONE_CHIP[tone.tone]}`}>
            {tone.en}
          </span>
        )}
      </div>

      {!link ? (
        <>
          <p className="mt-1 text-[11.5px] font-medium leading-relaxed text-muted">
            A view-only page for {submission.leadName}: certificate number, status, benefits, waiting periods and
            nominees. No IC number, no phone numbers, no agency figures. The link is the only credential, so treat it
            like one — and revoke it here the moment it should stop working.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => issuePortalLink(submission.id))}
            className="press mt-3 inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-navy px-4 text-[12.5px] font-bold text-white disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create portal link"}
          </button>
        </>
      ) : (
        <>
          <div className="mt-2.5 flex items-center gap-2 rounded-[10px] border border-sand-2 bg-white px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink">{url}</span>
            <button
              type="button"
              onClick={copy}
              className="press flex-none rounded-[8px] bg-sand-3 px-2.5 py-1.5 text-[11px] font-bold text-navy"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {submission.leadPhone && (
              <a
                href={waLink(submission.leadPhone, waMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-9 items-center gap-1.5 rounded-[10px] bg-green px-3 text-[11.5px] font-bold text-white"
              >
                Send on WhatsApp
              </a>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex min-h-9 items-center rounded-[10px] border border-sand-2 bg-white px-3 text-[11.5px] font-bold text-navy"
            >
              Preview
            </a>
          </div>

          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Status the client sees</span>
              <select
                aria-label="Status the client sees"
                disabled={pending}
                value={link.displayStatus ?? ""}
                onChange={(e) => run(() => setPortalStatus(link.id, e.target.value === "" ? null : e.target.value))}
                className="mt-1 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2 text-[12px] font-semibold text-navy"
              >
                {STATUS_CHOICES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-[10px] border border-sand-2 bg-white px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Opened</div>
              <div className="mt-1 text-[12px] font-semibold text-navy">
                {link.openCount === 0 ? (
                  <span className="text-muted">Not yet</span>
                ) : (
                  <>
                    {link.openCount} {link.openCount === 1 ? "time" : "times"}
                    {link.lastOpenedAt && (
                      <span className="font-medium text-muted"> · last {malaysiaDateTime(link.lastOpenedAt)}</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sand-2 pt-3">
            {!confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="press inline-flex min-h-9 items-center rounded-[10px] border border-[#f0cdc9] bg-alert-red-bg px-3 text-[11.5px] font-bold text-alert-red"
              >
                Revoke link
              </button>
            ) : (
              <>
                <span className="text-[11.5px] font-semibold text-alert-red">
                  Revoke? The client&rsquo;s page stops working straight away.
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setConfirming(false);
                    run(() => revokePortalLink(link.id));
                  }}
                  className="press inline-flex min-h-9 items-center rounded-[10px] bg-alert-red px-3 text-[11.5px] font-bold text-white disabled:opacity-60"
                >
                  Yes, revoke
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="press inline-flex min-h-9 items-center rounded-[10px] border border-sand-2 bg-white px-3 text-[11.5px] font-bold text-navy"
                >
                  Keep it
                </button>
              </>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => issuePortalLink(submission.id))}
              className="press inline-flex min-h-9 items-center rounded-[10px] border border-sand-2 bg-white px-3 text-[11.5px] font-bold text-navy disabled:opacity-60"
            >
              Issue a new link
            </button>
          </div>

          <p className="mt-2 text-[10.5px] font-medium leading-relaxed text-taupe">
            Revocable by the owning agent and by any AUM, UM, GM or SuperAdmin above them. Issuing a new link revokes
            this one.
          </p>
        </>
      )}

      {error && <div className="mt-2 text-[11.5px] font-semibold text-alert-red">{error}</div>}
    </div>
  );
}
