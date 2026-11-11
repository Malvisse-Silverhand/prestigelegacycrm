"use client";

import { useEffect, useState } from "react";
import { DOCUMENT_INFO, DOCUMENT_KINDS, FORM_STAGES, type FormLinkSummary, type FormSnapshot } from "@/lib/lead-form-fields";
import { malaysiaDateTime } from "@/lib/malaysia-date";
import { getFormSnapshot } from "./form-link-actions";

/**
 * Read-only view of what the prospect has entered through one form link --
 * including answers they saved but never submitted -- so an agent can follow up
 * without waiting for Submit.
 */
export function ViewFormButton({ link }: { link: FormLinkSummary }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press inline-flex min-h-8 items-center rounded-[9px] border border-sand-2 bg-white px-2.5 text-[11.5px] font-semibold text-navy"
      >
        View
      </button>
      {open && <FormViewModal link={link} onClose={() => setOpen(false)} />}
    </>
  );
}

function FormViewModal({ link, onClose }: { link: FormLinkSummary; onClose: () => void }) {
  const [snapshot, setSnapshot] = useState<FormSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFormSnapshot(link.id)
      .then((result) => {
        if (cancelled) return;
        if (result.error || !result.snapshot) setError(result.error ?? "Couldn't load this form.");
        else setSnapshot(result.snapshot);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't connect. Check your internet connection and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [link.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stage = FORM_STAGES[link.stage];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/55 p-2 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={`${stage.label} form answers`} className="flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[18px] bg-cream shadow-elevated">
        <div className="flex items-start justify-between gap-3 border-b border-sand bg-white p-4">
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-navy">
              Stage {link.stage} · {stage.label}
            </div>
            {snapshot && (
              <div className="mt-1 text-[11.5px] font-medium text-taupe" suppressHydrationWarning>
                {snapshot.isDraft
                  ? `Saved draft, not submitted yet${snapshot.savedAt ? ` · last saved ${malaysiaDateTime(snapshot.savedAt)}` : ""}`
                  : snapshot.submittedAt
                    ? `Submitted ${malaysiaDateTime(snapshot.submittedAt)}`
                    : "Nothing saved by the prospect yet — showing what is on the lead."}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex-none text-taupe hover:text-navy">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {error && <div className="rounded-[9px] bg-alert-red-bg px-3 py-2 text-[12px] font-medium text-alert-red">{error}</div>}
          {!error && !snapshot && <p className="text-[12.5px] font-medium text-taupe">Loading…</p>}
          {snapshot && <SnapshotBody snapshot={snapshot} />}
        </div>
      </div>
    </div>
  );
}

function SnapshotBody({ snapshot }: { snapshot: FormSnapshot }) {
  return (
    <div className="flex flex-col gap-4">
      {snapshot.sections.map((section) => (
        <section key={section.title} className="rounded-[14px] border border-sand bg-white p-3.5">
          <h3 className="text-[12.5px] font-bold text-navy">{section.title}</h3>
          <dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
            {section.rows.map((row) => (
              <div key={row.label} className="min-w-0">
                <dt className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-taupe-2">{row.label}</dt>
                <dd className={`mt-0.5 text-[13px] font-semibold break-words whitespace-pre-line ${row.filled ? "text-navy" : "text-taupe"}`}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {snapshot.stage === 2 && (
        <>
          <section className="rounded-[14px] border border-sand bg-white p-3.5">
            <h3 className="text-[12.5px] font-bold text-navy">Nominees</h3>
            {snapshot.nominees.length === 0 ? (
              <p className="mt-2 text-[12px] font-medium text-taupe">None entered yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2.5">
                {snapshot.nominees.map((n, i) => (
                  <li key={i} className="rounded-[10px] border border-sand-2 bg-cream px-3 py-2 text-[12.5px] font-semibold text-navy">
                    {n.name || "—"}
                    {n.relationship ? ` (${n.relationship})` : ""} · {n.share_percent || "—"}%
                    <div className="mt-0.5 text-[11.5px] font-medium text-taupe">
                      {[n.id_no, n.phone, n.date_of_birth].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[14px] border border-sand bg-white p-3.5">
            <h3 className="text-[12.5px] font-bold text-navy">Documents</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {DOCUMENT_KINDS.map((kind) => {
                const doc = snapshot.documents.find((d) => d.kind === kind);
                return (
                  <div key={kind} className="min-w-0">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-taupe-2">{DOCUMENT_INFO[kind].short}</div>
                    {doc ? (
                      <>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block">
                          {/* A signed Storage URL, so next/image has nothing to optimise. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={doc.url} alt={DOCUMENT_INFO[kind].short} className="h-28 w-full rounded-[10px] border border-sand-2 bg-white object-contain" />
                        </a>
                        <div className="mt-1 text-[11px] font-medium text-taupe" suppressHydrationWarning>
                          Uploaded {malaysiaDateTime(doc.uploadedAt)}
                        </div>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[11.5px] font-semibold text-green underline underline-offset-2">
                          Open full size
                        </a>
                      </>
                    ) : (
                      <div className="mt-1.5 flex h-28 items-center justify-center rounded-[10px] border border-dashed border-sand-2 text-[11.5px] font-medium text-taupe">
                        Not uploaded
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[14px] border border-sand bg-white p-3.5">
            <h3 className="text-[12.5px] font-bold text-navy">Signature</h3>
            {snapshot.signature ? (
              <div className="mt-3 rounded-[11px] border border-sand-2 bg-white p-2">
                {/* A data URL, so next/image has nothing to optimise. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={snapshot.signature.imageDataUrl} alt="Signature" className="mx-auto max-h-[120px] w-auto max-w-full" />
              </div>
            ) : (
              <p className="mt-2 text-[12px] font-medium text-taupe">Not signed yet. The signature is captured when the form is submitted.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
