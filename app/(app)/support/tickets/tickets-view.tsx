"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  relativeTime,
  type TicketPriority,
  type TicketRow,
  type TicketStatus,
} from "./constants";
import { CategoryChip, PriorityChip, StatusChip } from "./ticket-chips";

type StatusFilter = TicketStatus | "all";

export function TicketsView({ tickets, isAdmin }: { tickets: TicketRow[]; isAdmin: boolean }) {
  const [status, setStatus] = useState<StatusFilter>(isAdmin ? "open" : "all");
  const [priority, setPriority] = useState<TicketPriority | "all">("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tickets.length };
    for (const s of TICKET_STATUSES) c[s] = 0;
    for (const t of tickets) c[t.status] += 1;
    return c;
  }, [tickets]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    return tickets.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (priority !== "all" && t.priority !== priority) return false;
      if (q && !t.subject.toLowerCase().includes(q) && String(t.ticketNo) !== q) return false;
      return true;
    });
  }, [tickets, status, priority, query]);

  const tabs: { key: StatusFilter; label: string }[] = [
    ...TICKET_STATUSES.map((s) => ({ key: s as StatusFilter, label: STATUS_LABEL[s] })),
    { key: "all", label: "All" },
  ];

  return (
    <div>
      <div className="sticky top-0 z-20 lg:static flex items-center gap-3.5 border-b border-sand bg-white/85 backdrop-blur-md px-5 py-4 lg:bg-white lg:backdrop-blur-none lg:px-[30px] lg:py-5">
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-extrabold tracking-[-0.025em] text-navy">Support tickets</div>
          <div className="mt-0.5 text-[13px] font-medium text-muted">
            {isAdmin
              ? `${counts.open} open · ${tickets.length} in total across the team`
              : tickets.length === 0
                ? "Raise a ticket and we'll reply here"
                : `${tickets.length} ticket${tickets.length === 1 ? "" : "s"} raised by you`}
          </div>
        </div>
        <Link
          href="/support/tickets/new"
          className="flex-none rounded-[10px] border border-brand bg-brand px-4 py-2.5 text-[13px] font-semibold text-white"
        >
          New ticket
        </Link>
      </div>

      <div className="flex flex-col gap-3.5 px-5 py-[22px] pb-[30px] lg:px-[30px]">
        <div className="-mx-5 overflow-x-auto px-5 lg:mx-0 lg:px-0">
          <div className="flex w-max rounded-[10px] border border-sand-2 bg-cream p-[3px]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatus(tab.key)}
                className={
                  status === tab.key
                    ? "whitespace-nowrap rounded-[8px] bg-brand px-3.5 py-[7px] text-xs font-semibold text-white"
                    : "whitespace-nowrap px-3.5 py-[7px] text-xs font-semibold text-muted"
                }
              >
                {tab.label} <span className="opacity-70">{counts[tab.key]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by subject or #number…"
            aria-label="Search tickets"
            className="w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold sm:max-w-sm"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority | "all")}
            aria-label="Filter by priority"
            className="rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
          >
            <option value="all">All priorities</option>
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-sand bg-white px-5 py-10 text-center">
            <div className="text-[14px] font-bold text-navy">
              {tickets.length === 0 ? "No tickets yet" : "No tickets match these filters"}
            </div>
            <p className="mt-1 text-[12.5px] font-medium text-muted">
              {tickets.length === 0
                ? isAdmin
                  ? "When an agent raises a ticket it will show up here."
                  : "Something not working, or need a hand? Raise a ticket and we'll look into it."
                : "Try another status tab, or clear the search."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-sand bg-white">
            {visible.map((t) => (
              <Link
                key={t.id}
                href={`/support/tickets/${t.id}`}
                className="flex flex-col gap-2 border-b border-sand-3 px-4 py-3.5 last:border-b-0 hover:bg-cream sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
                  <span className="flex-none text-[12px] font-bold text-taupe">#{t.ticketNo}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold text-navy">{t.subject}</span>
                    <span className="mt-0.5 block truncate text-[11.5px] font-medium text-muted">
                      {isAdmin ? `${t.raiserName} · ` : ""}
                      {t.replyCount} repl{t.replyCount === 1 ? "y" : "ies"} · updated {relativeTime(t.updatedAt)}
                      {isAdmin && t.assigneeName ? ` · assigned to ${t.assigneeName}` : ""}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:flex-none sm:justify-end">
                  <CategoryChip category={t.category} />
                  <PriorityChip priority={t.priority} />
                  <StatusChip status={t.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
