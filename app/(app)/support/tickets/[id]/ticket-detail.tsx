"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  raiserReopen,
  raiserResolve,
  replyToTicket,
  updateTicketAssignee,
  updateTicketPriority,
  updateTicketStatus,
} from "../actions";
import {
  BODY_MAX,
  PRIORITY_LABEL,
  STATUS_LABEL,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  relativeTime,
  type StaffOption,
  type TicketDetail,
} from "../constants";
import { CategoryChip, PriorityChip, StatusChip } from "../ticket-chips";

const FIELD =
  "w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold disabled:opacity-60";

function Avatar({ initials, dark }: { initials: string; dark?: boolean }) {
  return (
    <span
      className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12px] font-bold ${
        dark ? "bg-brand text-white" : "bg-gold text-navy"
      }`}
    >
      {initials}
    </span>
  );
}

// Only ever render a link for something that looks like a web address or an
// in-app path -- the field is free text and must not become a javascript: href.
function safeHref(raw: string): string | null {
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function TicketDetailView({
  detail,
  viewerId,
  isAdmin,
  staff,
}: {
  detail: TicketDetail;
  viewerId: string;
  isAdmin: boolean;
  staff: StaffOption[];
}) {
  const router = useRouter();
  const { ticket, messages } = detail;
  const [pending, startTransition] = useTransition();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isRaiser = ticket.createdBy === viewerId;
  const closed = ticket.status === "closed";
  const resolved = ticket.status === "resolved";
  const href = ticket.pageUrl ? safeHref(ticket.pageUrl) : null;

  // One path for every action: run it, show its error, refresh on success.
  function run(action: () => Promise<{ error: string | null }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) {
        setError(res.error);
        return;
      }
      after?.();
      router.refresh();
    });
  }

  return (
    <div>
      <div className="sticky top-0 z-20 lg:static border-b border-sand bg-white/85 backdrop-blur-md px-5 py-4 lg:bg-white lg:backdrop-blur-none lg:px-[30px] lg:py-5">
        <Link href="/support/tickets" className="text-[12px] font-semibold text-taupe hover:text-navy">
          &larr; All tickets
        </Link>
        <div className="mt-1 flex items-baseline gap-2.5">
          <span className="flex-none text-[15px] font-bold text-taupe">#{ticket.ticketNo}</span>
          <h1 className="min-w-0 text-xl font-extrabold tracking-[-0.025em] text-navy lg:text-2xl">{ticket.subject}</h1>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusChip status={ticket.status} />
          <PriorityChip priority={ticket.priority} />
          <CategoryChip category={ticket.category} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[18px] px-5 py-[22px] pb-[30px] lg:grid-cols-[minmax(0,1fr)_280px] lg:px-[30px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          {/* The original request */}
          <section className="rounded-2xl border border-sand bg-white p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <Avatar initials={ticket.raiserInitials} dark />
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-navy">
                  {ticket.raiserName}
                  {ticket.raiserRoleLabel && (
                    <span className="ml-1.5 text-[11px] font-semibold text-taupe">{ticket.raiserRoleLabel}</span>
                  )}
                </div>
                <div className="text-[11.5px] font-medium text-muted">Raised {relativeTime(ticket.createdAt)}</div>
              </div>
            </div>
            <p className="mt-3.5 whitespace-pre-wrap break-words text-[13.5px] font-medium leading-relaxed text-navy">
              {ticket.description}
            </p>
            {ticket.pageUrl && (
              <div className="mt-3.5 border-t border-sand-3 pt-3 text-[12px] font-medium text-muted">
                About this page:{" "}
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-semibold text-navy underline"
                  >
                    {ticket.pageUrl}
                  </a>
                ) : (
                  <span className="break-all font-semibold text-navy">{ticket.pageUrl}</span>
                )}
              </div>
            )}
          </section>

          {/* The reply thread */}
          <section className="flex flex-col gap-3">
            <div className="text-[12px] font-bold uppercase tracking-wide text-taupe">
              {messages.length === 0 ? "No replies yet" : `${messages.length} repl${messages.length === 1 ? "y" : "ies"}`}
            </div>
            {messages.map((m) => {
              const mine = m.authorId === viewerId;
              return (
                <div
                  key={m.id}
                  className={`rounded-2xl border p-4 ${mine ? "border-sand bg-cream" : "border-sand bg-white"}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar initials={m.authorInitials} dark={m.authorId === ticket.createdBy} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-navy">
                        {m.authorName}
                        {m.authorRoleLabel && (
                          <span className="ml-1.5 text-[11px] font-semibold text-taupe">{m.authorRoleLabel}</span>
                        )}
                      </div>
                      <div className="text-[11.5px] font-medium text-muted">{relativeTime(m.createdAt)}</div>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-[13.5px] font-medium leading-relaxed text-navy">
                    {m.body}
                  </p>
                </div>
              );
            })}
          </section>

          {/* Reply box */}
          <section className="rounded-2xl border border-sand bg-white p-4 lg:p-5">
            {closed ? (
              <p className="text-[12.5px] font-medium text-muted">
                This ticket is closed, so it can&apos;t take new replies. Raise a new ticket if you still need help.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() => replyToTicket(ticket.id, reply), () => setReply(""));
                }}
                className="flex flex-col gap-2.5"
              >
                <label htmlFor="ticket-reply" className="text-[12px] font-bold text-navy">
                  {resolved && isRaiser ? "Still not right? Reply to reopen it" : "Reply"}
                </label>
                <textarea
                  id="ticket-reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  maxLength={BODY_MAX}
                  rows={4}
                  placeholder="Write your reply…"
                  className={`${FIELD} resize-y`}
                />
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="submit"
                    disabled={pending || reply.trim().length === 0}
                    className="rounded-[10px] border border-brand bg-brand px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                  >
                    {pending ? "Sending…" : "Send reply"}
                  </button>
                  {isRaiser && !isAdmin && !resolved && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => raiserResolve(ticket.id))}
                      className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy disabled:opacity-60"
                    >
                      Resolved &mdash; this fixed it
                    </button>
                  )}
                  {isRaiser && !isAdmin && resolved && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => raiserReopen(ticket.id))}
                      className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy disabled:opacity-60"
                    >
                      Reopen ticket
                    </button>
                  )}
                </div>
              </form>
            )}
            {error && (
              <div role="alert" className="mt-3 rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-alert-red">
                {error}
              </div>
            )}
          </section>
        </div>

        {/* Side panel */}
        <aside className="flex flex-col gap-[18px] lg:sticky lg:top-5 lg:self-start">
          <section className="rounded-2xl border border-sand bg-white p-4">
            <div className="text-[12px] font-bold uppercase tracking-wide text-taupe">Details</div>
            <dl className="mt-3 flex flex-col gap-2.5 text-[12.5px]">
              <div className="flex justify-between gap-3">
                <dt className="font-medium text-muted">Raised by</dt>
                <dd className="text-right font-semibold text-navy">{ticket.raiserName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-medium text-muted">Raised</dt>
                <dd className="text-right font-semibold text-navy">{relativeTime(ticket.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-medium text-muted">Last updated</dt>
                <dd className="text-right font-semibold text-navy">{relativeTime(ticket.updatedAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-medium text-muted">Assigned to</dt>
                <dd className="text-right font-semibold text-navy">{ticket.assigneeName ?? "Unassigned"}</dd>
              </div>
              {ticket.resolvedAt && (
                <div className="flex justify-between gap-3">
                  <dt className="font-medium text-muted">{closed ? "Closed" : "Resolved"}</dt>
                  <dd className="text-right font-semibold text-navy">{relativeTime(ticket.resolvedAt)}</dd>
                </div>
              )}
            </dl>
          </section>

          {isAdmin && (
            <section className="rounded-2xl border border-sand bg-white p-4">
              <div className="text-[12px] font-bold uppercase tracking-wide text-taupe">Manage</div>
              <div className="mt-3 flex flex-col gap-3.5">
                <div>
                  <label htmlFor="ticket-status" className="mb-1.5 block text-[12px] font-bold text-navy">
                    Status
                  </label>
                  <select
                    id="ticket-status"
                    value={ticket.status}
                    disabled={pending}
                    onChange={(e) => run(() => updateTicketStatus(ticket.id, e.target.value))}
                    className={FIELD}
                  >
                    {TICKET_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ticket-priority" className="mb-1.5 block text-[12px] font-bold text-navy">
                    Priority
                  </label>
                  <select
                    id="ticket-priority"
                    value={ticket.priority}
                    disabled={pending}
                    onChange={(e) => run(() => updateTicketPriority(ticket.id, e.target.value))}
                    className={FIELD}
                  >
                    {TICKET_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ticket-assignee" className="mb-1.5 block text-[12px] font-bold text-navy">
                    Assigned to
                  </label>
                  <select
                    id="ticket-assignee"
                    value={ticket.assignedTo ?? ""}
                    disabled={pending}
                    onChange={(e) => run(() => updateTicketAssignee(ticket.id, e.target.value))}
                    className={FIELD}
                  >
                    <option value="">Unassigned</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
