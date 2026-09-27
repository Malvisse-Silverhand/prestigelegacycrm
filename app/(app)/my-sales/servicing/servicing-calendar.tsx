"use client";

import { useMemo, useState } from "react";
import { rowStatus } from "@/lib/contribution-schedule";
import { occurrencesInRange, type BirthdayRow } from "@/lib/birthdays";
import { fmtRM } from "../certificate-panel";
import { DayModal } from "./day-modal";
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
  birthdays,
  today,
  onSelectCase,
  onSelectLead,
}: {
  cases: CaseSubmission[];
  birthdays: BirthdayRow[];
  today: string;
  onSelectCase: (caseId: string) => void;
  onSelectLead: (leadId: string) => void;
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

  // Every won client's birthday landing somewhere in the visible month --
  // recurs every year, so it can't come from a fixed "next 30 days" list the
  // way the dashboard's card does.
  const firstKey = `${year}-${pad(month + 1)}-01`;
  const lastKey = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;
  const birthdaysByDay = useMemo(
    () => occurrencesInRange(birthdays, firstKey, lastKey, today),
    [birthdays, firstKey, lastKey, today],
  );

  // Which birthday leads already have a certificate on this book -- decides
  // whether the day modal's "View" opens the case directly or falls back to
  // the lead's own detail page.
  const caseLeadIds = useMemo(() => new Set(cases.map((c) => c.leadId)), [cases]);

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

  return (
    <div className="rounded-[16px] border border-sand bg-white p-3 sm:p-4">
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
          const dayBirthdays = birthdaysByDay.get(key) ?? [];
          const isToday = key === today;
          const anyOverdue = entries.some((e) => e.overdue);
          const allPaid = entries.length > 0 && entries.every((e) => e.paid);
          const sel = openDay === key;

          return (
            <button
              key={key}
              type="button"
              disabled={entries.length === 0 && dayBirthdays.length === 0}
              onClick={() => setOpenDay(key)}
              aria-label={`${day} ${MONTHS[month]}${entries.length ? `, ${entries.length} contribution due` : ""}${
                dayBirthdays.length ? `, ${dayBirthdays.length} birthday${dayBirthdays.length === 1 ? "" : "s"}` : ""
              }`}
              className={`relative min-h-[54px] rounded-[9px] border px-1 py-1.5 text-left transition-colors disabled:cursor-default ${
                sel
                  ? "border-navy bg-navy"
                  : entries.length === 0
                    ? "border-sand-3 bg-white"
                    : allPaid
                      ? "border-transparent bg-success-bg"
                      : anyOverdue
                        ? "border-transparent bg-alert-red-bg"
                        : "border-transparent bg-warn-gold-bg"
              } ${isToday && !sel ? "ring-1 ring-gold" : ""}`}
            >
              <div
                className={`text-[11px] font-bold ${
                  sel ? "text-white" : isToday ? "text-warn-gold-text" : "text-navy"
                }`}
              >
                {day}
              </div>
              {entries.length > 0 && (
                <div className={`mt-0.5 text-[9.5px] font-semibold ${sel ? "text-white/70" : "text-taupe-2"}`}>
                  {entries.length} due
                </div>
              )}
              {dayBirthdays.length > 0 && (
                <svg
                  width={13}
                  height={13}
                  viewBox="0 0 24 24"
                  aria-hidden
                  className={`absolute bottom-1 right-1 ${sel ? "text-gold" : "text-warn-gold-text"}`}
                >
                  <path d="M12 3c.9 1 .9 2 0 3-.9-1-.9-2 0-3z" fill="#fac748" stroke="#c9552f" strokeWidth={1} />
                  <path d="M12 6.5V10" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  <path d="M5 21h14v-7a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3z" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round" />
                  <path d="M5 16c1.4 1.2 2.8 1.2 4.2 0s2.8-1.2 4.2 0 2.8 1.2 4.2 0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {openDay && (
        <DayModal
          title={`${openDay.slice(8, 10)} ${MONTHS[Number(openDay.slice(5, 7)) - 1]} ${openDay.slice(0, 4)}`}
          dues={duesByDay.get(openDay) ?? []}
          birthdays={birthdaysByDay.get(openDay) ?? []}
          caseLeadIds={caseLeadIds}
          onSelectCase={(caseId) => {
            onSelectCase(caseId);
            setOpenDay(null);
          }}
          onSelectLead={(leadId) => {
            onSelectLead(leadId);
            setOpenDay(null);
          }}
          onClose={() => setOpenDay(null)}
        />
      )}
    </div>
  );
}
