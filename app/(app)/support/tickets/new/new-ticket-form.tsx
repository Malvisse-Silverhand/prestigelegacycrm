"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createTicket } from "../actions";
import {
  CATEGORY_LABEL,
  DESCRIPTION_MAX,
  PAGE_URL_MAX,
  PRIORITY_LABEL,
  SUBJECT_MAX,
  SUBJECT_MIN,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
} from "../constants";

const FIELD =
  "w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold";
const LABEL = "mb-1.5 block text-[12px] font-bold text-navy";

export function NewTicketForm({ initialPageUrl }: { initialPageUrl: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>("question");
  const [priority, setPriority] = useState<string>("normal");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState(initialPageUrl.slice(0, PAGE_URL_MAX));
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTicket({ subject, category, priority, description, pageUrl });
      if (res.error || !res.id) {
        setError(res.error ?? "Couldn't raise the ticket. Please try again.");
        return;
      }
      router.push(`/support/tickets/${res.id}`);
    });
  }

  return (
    <div>
      <div className="sticky top-0 z-20 lg:static border-b border-sand bg-white/85 backdrop-blur-md px-5 py-4 lg:bg-white lg:backdrop-blur-none lg:px-[30px] lg:py-5">
        <Link href="/support/tickets" className="text-[12px] font-semibold text-taupe hover:text-navy">
          &larr; All tickets
        </Link>
        <div className="mt-1 text-2xl font-extrabold tracking-[-0.025em] text-navy">New ticket</div>
        <div className="mt-0.5 text-[13px] font-medium text-muted">
          Tell us what&apos;s wrong or what you need. We&apos;ll reply here and notify you.
        </div>
      </div>

      <form onSubmit={submit} className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-[22px] pb-[30px] lg:mx-0 lg:px-[30px]">
        <div>
          <label htmlFor="ticket-subject" className={LABEL}>
            Subject
          </label>
          <input
            id="ticket-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={SUBJECT_MAX}
            placeholder="A short summary, e.g. Can't upload a quotation PDF"
            className={FIELD}
            required
            minLength={SUBJECT_MIN}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ticket-category" className={LABEL}>
              Category
            </label>
            <select id="ticket-category" value={category} onChange={(e) => setCategory(e.target.value)} className={FIELD}>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ticket-priority" className={LABEL}>
              Priority
            </label>
            <select id="ticket-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className={FIELD}>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="ticket-description" className={LABEL}>
            What happened?
          </label>
          <textarea
            id="ticket-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={DESCRIPTION_MAX}
            rows={7}
            placeholder="What were you trying to do, what did you expect, and what happened instead?"
            className={`${FIELD} resize-y`}
            required
          />
          <div className="mt-1 text-right text-[11px] font-medium text-taupe">
            {description.length}/{DESCRIPTION_MAX}
          </div>
        </div>

        <div>
          <label htmlFor="ticket-page" className={LABEL}>
            Page this is about <span className="font-medium text-taupe">(optional)</span>
          </label>
          <input
            id="ticket-page"
            value={pageUrl}
            onChange={(e) => setPageUrl(e.target.value)}
            maxLength={PAGE_URL_MAX}
            placeholder="Paste the page's link, or leave blank"
            className={FIELD}
          />
        </div>

        {error && (
          <div role="alert" className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-alert-red">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            type="submit"
            disabled={pending}
            className="rounded-[10px] border border-brand bg-brand px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Raising…" : "Raise ticket"}
          </button>
          <Link
            href="/support/tickets"
            className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
