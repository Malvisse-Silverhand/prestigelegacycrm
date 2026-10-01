"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { FormRow } from "./constants";
import { deleteForm, setFormOpen } from "./actions";
import { SMALL_BTN, StatusChip } from "./feedback-chips";

function shareLink(slug: string) {
  return `${window.location.origin}/support/feedback/f/${slug}`;
}

export function FeedbackView({
  forms,
  isAdmin,
  canSeeSubmissions,
}: {
  forms: FormRow[];
  isAdmin: boolean;
  canSeeSubmissions: boolean;
}) {
  const [deleting, setDeleting] = useState<FormRow | null>(null);
  const [notice, setNotice] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const openForms = useMemo(() => forms.filter((f) => f.isOpen), [forms]);

  function run(fn: () => Promise<{ error: string | null }>, after?: () => void) {
    setNotice(null);
    startTransition(async () => {
      try {
        const res = await fn();
        if (res.error) setNotice({ tone: "error", text: res.error });
        else after?.();
      } catch {
        setNotice({ tone: "error", text: "Couldn't connect. Check your internet connection and try again." });
      }
    });
  }

  async function copyLink(f: FormRow) {
    try {
      await navigator.clipboard.writeText(shareLink(f.slug));
      setNotice({ tone: "ok", text: `Link copied for "${f.title}".` });
    } catch {
      setNotice({ tone: "error", text: "Couldn't copy the link. Copy it from the address bar of the fill page instead." });
    }
  }

  function shareWhatsApp(f: FormRow) {
    const text = `${f.title}\n${shareLink(f.slug)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <div className="sticky top-0 z-20 lg:static flex items-center gap-3.5 border-b border-sand bg-white/85 backdrop-blur-md px-5 py-4 lg:bg-white lg:backdrop-blur-none lg:px-[30px] lg:py-5">
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-extrabold tracking-[-0.025em] text-navy">Feedback</div>
          <div className="mt-0.5 text-[13px] font-medium text-muted">
            Tell us what to improve. {openForms.length} open {openForms.length === 1 ? "form" : "forms"}.
          </div>
        </div>
        {isAdmin && (
          <Link
            href="/support/feedback/new"
            className="flex-none rounded-[10px] border border-brand bg-brand px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            New form
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3.5 px-5 py-[22px] pb-[30px] lg:px-[30px]">
        {notice && (
          <div
            role="status"
            className={
              notice.tone === "error"
                ? "rounded-[10px] border border-alert-red/30 bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-alert-red"
                : "rounded-[10px] bg-success-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-green"
            }
          >
            {notice.text}
          </div>
        )}

        {!isAdmin && (
          <>
            {openForms.length === 0 && (
              <div className="rounded-2xl border border-dashed border-sand-2 bg-cream px-4 py-8 text-center text-[12.5px] font-medium text-muted">
                No feedback forms are open right now.
              </div>
            )}
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              {openForms.map((f) => (
                <article key={f.id} className="rounded-2xl border border-sand bg-white p-4">
                  <div className="text-[14px] font-bold leading-snug text-navy">{f.title}</div>
                  {f.description && (
                    <p className="mt-1.5 whitespace-pre-line text-[12.5px] font-medium leading-relaxed text-muted">
                      {f.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/support/feedback/f/${f.slug}`}
                      className="rounded-[10px] border border-brand bg-brand px-4 py-2 text-[12.5px] font-semibold text-white"
                    >
                      Fill in
                    </Link>
                    {canSeeSubmissions && (
                      <Link href={`/support/feedback/${f.id}/submissions`} className={SMALL_BTN}>
                        View submissions · {f.submissionCount ?? 0}
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {isAdmin && (
          <>
            {forms.length === 0 && (
              <div className="rounded-2xl border border-dashed border-sand-2 bg-cream px-4 py-8 text-center text-[12.5px] font-medium text-muted">
                No forms yet. Create one to start collecting feedback.
              </div>
            )}
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              {forms.map((f) => (
                <article key={f.id} className="rounded-2xl border border-sand bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-[14px] font-bold leading-snug text-navy">{f.title}</div>
                    <StatusChip open={f.isOpen} />
                  </div>
                  {f.description && (
                    <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[12.5px] font-medium leading-relaxed text-muted">
                      {f.description}
                    </p>
                  )}
                  <div className="mt-2 break-all text-[11.5px] font-semibold text-taupe">
                    /support/feedback/f/{f.slug} · {f.fields.length} {f.fields.length === 1 ? "question" : "questions"}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-sand pt-3">
                    {f.isOpen && (
                      <Link
                        href={`/support/feedback/f/${f.slug}`}
                        className="rounded-[8px] border border-brand bg-brand px-2.5 py-1.5 text-[11.5px] font-semibold text-white"
                      >
                        Fill in
                      </Link>
                    )}
                    <Link href={`/support/feedback/${f.id}/submissions`} className={SMALL_BTN}>
                      View submissions · {f.submissionCount ?? 0}
                    </Link>
                    <button type="button" onClick={() => copyLink(f)} className={SMALL_BTN}>
                      Copy link
                    </button>
                    <button type="button" onClick={() => shareWhatsApp(f)} className={SMALL_BTN}>
                      Share on WhatsApp
                    </button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => setFormOpen(f.id, !f.isOpen))}
                      className={SMALL_BTN}
                    >
                      {f.isOpen ? "Close form" : "Reopen form"}
                    </button>
                    <Link href={`/support/feedback/${f.id}/edit`} className={SMALL_BTN}>
                      Edit
                    </Link>
                    <button type="button" onClick={() => setDeleting(f)} className={`${SMALL_BTN} text-alert-red`}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {deleting && isAdmin && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/55 p-4" onClick={() => setDeleting(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[380px] rounded-2xl bg-white p-6 shadow-elevated"
          >
            <div className="text-[16px] font-bold text-navy">Delete this form?</div>
            <p className="mt-2 text-[13px] font-medium text-muted">
              &ldquo;{deleting.title}&rdquo; will be removed
              {deleting.submissionCount
                ? `, together with its ${deleting.submissionCount} ${deleting.submissionCount === 1 ? "submission" : "submissions"}`
                : ", together with any submissions it has"}
              . This can&apos;t be undone. To just stop taking answers, close the form instead.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button type="button" onClick={() => setDeleting(null)} className={SMALL_BTN}>
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteForm(deleting.id), () => setDeleting(null))}
                className="rounded-[8px] border border-alert-red bg-alert-red px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
