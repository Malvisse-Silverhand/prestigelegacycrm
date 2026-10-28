"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  EMPTY_NOMINEE,
  MAX_NOMINEES,
  NOMINEE_RELATIONSHIPS,
  type LeadNominee,
  type LeadSignatureView,
  type NomineeInput,
} from "@/lib/lead-form-fields";
import { malaysiaDateTime } from "@/lib/malaysia-date";
import { ChevronDownIcon } from "@/components/icons";
import { deleteLeadNominee, upsertLeadNominee } from "./form-link-actions";

function NomineeIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
    </svg>
  );
}

const INPUT =
  "mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold";
const LABEL = "text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase";

type Editing = { position: number; nominee: NomineeInput; id: string | null } | null;

function toInput(n: LeadNominee): NomineeInput {
  return {
    name: n.name,
    id_no: n.id_no ?? "",
    relationship: n.relationship ?? "",
    phone: n.phone ?? "",
    share_percent: n.share_percent == null ? "" : String(n.share_percent),
    date_of_birth: n.date_of_birth ?? "",
  };
}

export function LeadNominees({
  leadId,
  nominees,
  canEdit,
}: {
  leadId: string;
  nominees: LeadNominee[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const total = nominees.reduce((sum, n) => sum + (n.share_percent ?? 0), 0);
  const totalOff = nominees.length > 0 && Math.abs(total - 100) > 0.001;
  const full = nominees.length >= MAX_NOMINEES;

  function freePosition() {
    const used = new Set(nominees.map((n) => n.position));
    for (let p = 1; p <= MAX_NOMINEES; p++) if (!used.has(p)) return p;
    return null;
  }

  function startAdd() {
    const position = freePosition();
    if (position == null) return;
    setFormError(null);
    // First nominee defaults to the whole share, as on the public form.
    setEditing({
      position,
      id: null,
      nominee: { ...EMPTY_NOMINEE, share_percent: nominees.length === 0 ? "100" : "" },
    });
  }

  function save(formData: FormData) {
    if (!editing) return;
    const nominee: NomineeInput = {
      name: String(formData.get("name") ?? ""),
      id_no: String(formData.get("id_no") ?? ""),
      relationship: String(formData.get("relationship") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      share_percent: String(formData.get("share_percent") ?? ""),
      date_of_birth: String(formData.get("date_of_birth") ?? ""),
    };
    setFormError(null);
    start(async () => {
      try {
        const result = await upsertLeadNominee(leadId, editing.position, nominee);
        if (result.error) {
          setFormError(result.error);
          return;
        }
        setEditing(null);
        router.refresh();
      } catch {
        setFormError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  function remove(id: string) {
    setError(null);
    setConfirmingId(null);
    start(async () => {
      try {
        const result = await deleteLeadNominee(leadId, id);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="mt-[22px] rounded-[14px] border border-sand bg-white p-3.5 sm:p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <NomineeIcon className="text-green" />
          <div className="text-[13px] font-bold text-navy">
            Nominees{" "}
            <span className="font-semibold text-taupe">
              ({nominees.length}/{MAX_NOMINEES})
            </span>
          </div>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={startAdd}
            disabled={full}
            title={full ? `A lead can have up to ${MAX_NOMINEES} nominees` : undefined}
            className="press rounded-[9px] border border-sand-2 bg-cream px-3 py-1.5 text-[11.5px] font-semibold text-navy hover:border-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add nominee
          </button>
        )}
      </div>

      {totalOff && (
        <div className="mt-2.5 rounded-[9px] border border-[#f0dfb4] bg-warn-gold-bg px-3 py-2 text-[11.5px] font-semibold text-warn-gold-text">
          Shares add up to {Math.round(total * 100) / 100}%, not 100%.
        </div>
      )}
      {error && (
        <div className="mt-2.5 rounded-[9px] bg-alert-red-bg px-3 py-2 text-[11.5px] font-medium text-alert-red">{error}</div>
      )}

      {nominees.length === 0 ? (
        <p className="mt-2.5 text-[11.5px] leading-relaxed font-medium text-muted">
          No nominees yet. Add them here, or they arrive with the prospect&rsquo;s Stage 2 form.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {nominees.map((n) => (
            <div key={n.id} className="flex items-start gap-2.5 rounded-[11px] border border-sand-2 bg-cream px-3 py-2.5">
              <span className="flex-none rounded-[6px] bg-success-bg px-[7px] py-[2px] text-[9.5px] font-bold text-green">
                {n.share_percent == null ? "—" : `${n.share_percent}%`}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-bold text-navy">{n.name}</div>
                <div className="text-[11px] font-medium text-taupe">
                  {[n.relationship, n.id_no, n.phone].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              {canEdit && (
                <div className="flex flex-none items-center gap-1.5">
                  {confirmingId === n.id ? (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(n.id)}
                        className="press rounded-[8px] bg-alert-red px-2 py-1 text-[11px] font-bold text-white disabled:opacity-60"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="press rounded-[8px] border border-sand-2 bg-white px-2 py-1 text-[11px] font-semibold text-navy"
                      >
                        Keep
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setFormError(null);
                          setEditing({ position: n.position, id: n.id, nominee: toInput(n) });
                        }}
                        className="press rounded-[8px] border border-sand-2 bg-white px-2 py-1 text-[11px] font-semibold text-navy"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(n.id)}
                        className="press rounded-[8px] border border-[#f0cdc9] bg-alert-red-bg px-2 py-1 text-[11px] font-semibold text-alert-red"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-lg font-bold text-navy">{editing.id ? "Edit nominee" : "Add nominee"}</div>
            <form action={save} className="mt-4 flex flex-col gap-3">
              <label className="block">
                <span className={LABEL}>Full name</span>
                <input name="name" required maxLength={120} defaultValue={editing.nominee.name} className={INPUT} />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={LABEL}>NRIC / ID number</span>
                  <input name="id_no" required maxLength={20} defaultValue={editing.nominee.id_no} className={INPUT} />
                </label>
                <label className="block">
                  <span className={LABEL}>Phone</span>
                  <input name="phone" type="tel" required defaultValue={editing.nominee.phone} className={INPUT} />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={LABEL}>Relationship</span>
                  <div className="relative">
                    <select
                      name="relationship"
                      required
                      defaultValue={editing.nominee.relationship}
                      className={`${INPUT} appearance-none pr-9`}
                    >
                      <option value="" disabled>
                        Choose…
                      </option>
                      {editing.nominee.relationship &&
                        !(NOMINEE_RELATIONSHIPS as readonly string[]).includes(editing.nominee.relationship) && (
                          <option value={editing.nominee.relationship}>{editing.nominee.relationship}</option>
                        )}
                      {NOMINEE_RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon width={14} height={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy" />
                  </div>
                </label>
                <label className="block">
                  <span className={LABEL}>Share (%)</span>
                  <input
                    name="share_percent"
                    type="number"
                    required
                    min={0}
                    max={100}
                    step="any"
                    defaultValue={editing.nominee.share_percent}
                    className={INPUT}
                  />
                </label>
              </div>
              <label className="block sm:max-w-[50%]">
                <span className={LABEL}>Date of birth (optional)</span>
                <input name="date_of_birth" type="date" defaultValue={editing.nominee.date_of_birth ?? ""} className={INPUT} />
              </label>

              {formError && (
                <div className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">{formError}</div>
              )}
              <div className="mt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-[10px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save nominee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function safeFilePart(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "lead";
}

/** The prospect's captured signature, with copy-as-image and PNG download. */
export function LeadSignature({ signature, leadName }: { signature: LeadSignatureView; leadName: string }) {
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const signedDay = new Date(signature.signedAt).toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const filename = `signature-${safeFilePart(leadName)}-${signedDay}.png`;

  async function copyImage() {
    setMessage(null);
    try {
      if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
        setMessage({ tone: "err", text: "Your browser can't copy images. Use Download PNG instead." });
        return;
      }
      const blob = await (await fetch(signature.imageDataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setMessage({ tone: "ok", text: "Signature copied to the clipboard." });
    } catch {
      setMessage({ tone: "err", text: "Couldn't copy the image. Use Download PNG instead." });
    }
  }

  return (
    <div className="mt-[22px] rounded-[14px] border border-sand bg-white p-3.5 sm:p-[18px]">
      <div className="text-[13px] font-bold text-navy">Signature</div>
      <div className="mt-3 rounded-[11px] border border-sand-2 bg-white p-2">
        {/* A data URL, so next/image has nothing to optimise. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signature.imageDataUrl}
          alt={`Signature of ${signature.signerName ?? leadName}`}
          className="mx-auto max-h-[140px] w-auto max-w-full"
        />
      </div>
      <div className="mt-2 text-[11.5px] font-medium text-taupe" suppressHydrationWarning>
        Signed {malaysiaDateTime(signature.signedAt)}
        {signature.signerName ? ` · ${signature.signerName}` : ""}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyImage}
          className="press inline-flex min-h-9 items-center rounded-[10px] border border-sand-2 bg-cream px-3 text-[12px] font-semibold text-navy"
        >
          Copy image
        </button>
        <a
          href={signature.imageDataUrl}
          download={filename}
          className="press inline-flex min-h-9 items-center rounded-[10px] border border-sand-2 bg-cream px-3 text-[12px] font-semibold text-navy"
        >
          Download PNG
        </a>
      </div>
      {message && (
        <p className={`mt-2 text-[11.5px] font-semibold ${message.tone === "ok" ? "text-green" : "text-alert-red"}`}>{message.text}</p>
      )}
    </div>
  );
}
