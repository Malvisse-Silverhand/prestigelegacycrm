"use client";

import { useMemo, useState } from "react";
import { rowStatus } from "@/lib/contribution-schedule";
import { fmtRM } from "../certificate-panel";
import type { CaseSubmission } from "../types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

export type CalendarDue = {
  caseId: string;
  clientName: string;
  amount: number | null;
  paid: boolean;
  overdue: boolean;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Every contribution due, by day. This is the Servicing page's own calendar:
 * it answers "whose money is meant to land this month", which no other
 * calendar in the CRM does -- the dashboard's shows leads and appointments.
 */
export function ServicingCalendar({
  cases,
  today,
  onSelectCase,
}: {
  cases: CaseSubmission[];
  today: string;
  onSelectCase: (caseId: string) => void;
}) {
  // Anchored on the server's today, then moved by the arrows. Never reads a
  // clock during render, so the first paint can't disagree with hydration.
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const duesByDay = useMemo(() => {
    const map = new Map<string, CalendarDue[]>();
    for (const c of cases) {
      for (const row of c.schedule) {
        const status = rowStatus(row, today);
        const entry: CalendarDue = {
          caseId: c.id,
          clientName: c.leadName,
          amount: c.installmentContribution,
          paid: row.paid,
          overdue: status === "overdue",
        };
        const list = map.get(row.dueDate);
        if (list) list.push(entry);
        else map.set(row.dueDate, [entry]);
      }
    }
    return map;
  }, [cases, today]);

  // Monday-first, matching the dashboard's activity calendar.
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const leading = (firstOfMonth.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  function step(by: number) {
    const next = new Date(Date.UTC(year, month + by, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
    setOpenDay(null);
  }

  const monthTotal = useMemo(() => {
    let due = 0;
    let paid = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${pad(month + 1)}-${pad(d)}`;
      for (const entry of duesByDay.get(key) ?? []) {
        due += entry.amount ?? 0;
        if (entry.paid) paid += entry.amount ?? 0;
      }
    }
    return { due, paid };
  }, [duesByDay, year, month, daysInMonth]);

  // Everything unpaid and already due, whatever month is on screen. The
  // calendar moves; what a client owes today does not.
  const dueNow = useMemo(() => {
    let amount = 0;
    let count = 0;
    let earliest: string | null = null;
    for (const [dueDate, entries] of duesByDay) {
      if (dueDate > today) continue;
      for (const entry of entries) {
        if (entry.paid) continue;
        amount += entry.amount ?? 0;
        count++;
        if (!earliest || dueDate < earliest) earliest = dueDate;
      }
    }
    return { amount, count, earliest };
  }, [duesByDay, today]);

  // Jumping the calendar to the oldest unpaid day is the whole point of the
  // bell: it puts the money that is late on screen in one click.
  function goToEarliestDue() {
    if (!dueNow.earliest) return;
    setYear(Number(dueNow.earliest.slice(0, 4)));
    setMonth(Number(dueNow.earliest.slice(5, 7)) - 1);
    setOpenDay(dueNow.earliest);
  }

  const openEntries = openDay ? (duesByDay.get(openDay) ?? []) : [];

  return (
    <div className="rounded-[16px] border border-sand bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[14px] font-bold text-navy">Contribution calendar</div>
          <div className="mt-0.5 text-[11.5px] font-medium text-muted">
            Every client contribution due, across all the certificates you look after.
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Silent when nothing is late -- a bell that always rings teaches
              an agent to ignore it. */}
          {dueNow.count > 0 && (
            <button
              type="button"
              onClick={goToEarliestDue}
              title={`${dueNow.count} contribution${dueNow.count === 1 ? "" : "s"} due, RM${fmtRM(dueNow.amount)} outstanding`}
              className="press mr-1 flex min-h-8 items-center gap-1.5 rounded-[9px] border border-[#f0cdc9] bg-alert-red-bg px-2.5 text-alert-red"
            >
              <span className="relative flex-none">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8.5a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
                  <path d="M10.5 19.5a1.8 1.8 0 0 0 3 0" />
                </svg>
                <span className="absolute -right-1 -top-1 flex h-[13px] min-w-[13px] items-center justify-center rounded-full bg-alert-red px-[3px] text-[8.5px] font-bold text-white">
                  {dueNow.count}
                </span>
              </span>
              <span className="text-[11.5px] font-bold">RM{fmtRM(dueNow.amount)} due</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-sand-2 bg-cream text-navy"
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
          <span className="min-w-[132px] text-center text-[12.5px] font-bold text-navy">
            {MONTHS[month]} {year}
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-sand-2 bg-cream text-navy"
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2.5 text-[11.5px] font-semibold">
        <span className="rounded-[8px] bg-cream px-2.5 py-1.5 text-navy">
          Due this month <strong className="font-extrabold">RM{fmtRM(monthTotal.due)}</strong>
        </span>
        <span className="rounded-[8px] bg-success-bg px-2.5 py-1.5 text-green">
          Collected <strong className="font-extrabold">RM{fmtRM(monthTotal.paid)}</strong>
        </span>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-center text-[9.5px] font-bold tracking-[0.06em] text-taupe-2">
            {d}
          </div>
        ))}
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`lead-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const key = `${year}-${pad(month + 1)}-${pad(day)}`;
          const entries = duesByDay.get(key) ?? [];
          const isToday = key === today;
          const anyOverdue = entries.some((e) => e.overdue);
          const allPaid = entries.length > 0 && entries.every((e) => e.paid);

          return (
            <button
              key={key}
              type="button"
              disabled={entries.length === 0}
              onClick={() => setOpenDay(openDay === key ? null : key)}
              aria-label={`${day} ${MONTHS[month]}${entries.length ? `, ${entries.length} contribution due` : ""}`}
              className={`min-h-[54px] rounded-[9px] border px-1 py-1.5 text-left transition-colors disabled:cursor-default ${
                openDay === key
                  ? "border-navy bg-navy"
                  : entries.length === 0
                    ? "border-sand-3 bg-white"
                    : allPaid
                      ? "border-transparent bg-success-bg"
                      : anyOverdue
                        ? "border-transparent bg-alert-red-bg"
                        : "border-transparent bg-warn-gold-bg"
              } ${isToday && openDay !== key ? "ring-1 ring-gold" : ""}`}
            >
              <div
                className={`text-[11px] font-bold ${
                  openDay === key ? "text-white" : isToday ? "text-warn-gold-text" : "text-navy"
                }`}
              >
                {day}
              </div>
              {entries.length > 0 && (
                <div className={`mt-0.5 text-[9.5px] font-semibold ${openDay === key ? "text-white/70" : "text-taupe-2"}`}>
                  {entries.length} due
                </div>
              )}
            </button>
          );
        })}
      </div>

      {openDay && (
        <div className="mt-3 rounded-[11px] border border-sand-2 bg-cream p-3">
          <div className="text-[11.5px] font-bold text-navy">
            {openDay.slice(8, 10)} {MONTHS[month]} {year} · {openEntries.length} contribution
            {openEntries.length === 1 ? "" : "s"}
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {openEntries.map((e, i) => (
              <button
                key={`${e.caseId}-${i}`}
                type="button"
                onClick={() => onSelectCase(e.caseId)}
                className="flex items-center gap-2 rounded-[9px] bg-white px-2.5 py-2 text-left hover:ring-1 hover:ring-navy"
              >
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-navy">{e.clientName}</span>
                <span className="flex-none text-[11.5px] font-bold text-navy">RM{fmtRM(e.amount)}</span>
                <span
                  className={`flex-none rounded-[5px] px-[6px] py-[1px] text-[9.5px] font-bold ${
                    e.paid
                      ? "bg-success-bg text-green"
                      : e.overdue
                        ? "bg-alert-red-bg text-alert-red"
                        : "bg-warn-gold-bg text-warn-gold-text"
                  }`}
                >
                  {e.paid ? "Paid" : e.overdue ? "Overdue" : "Due"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
