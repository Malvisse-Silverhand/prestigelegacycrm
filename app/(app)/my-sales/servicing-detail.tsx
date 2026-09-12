"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  waitingPeriodsFor,
  COVER_NOTES,
  GREAT_JOURNEY_GUIDE_URL,
  CLIENT_PORTAL_URL,
} from "@/lib/waiting-periods";
import { frequencyLabel, rowStatus, summariseSchedule, type ScheduleStatus } from "@/lib/contribution-schedule";
import { setContributionPaid } from "./actions";
import { fmtDate, fmtRM } from "./certificate-panel";
import type { CaseSubmission } from "./types";

const STATUS_STYLE: Record<ScheduleStatus, { chip: string; label: string }> = {
  paid: { chip: "bg-success-bg text-green", label: "Paid" },
  due: { chip: "bg-warn-gold-bg text-warn-gold-text", label: "Due today" },
  overdue: { chip: "bg-alert-red-bg text-alert-red", label: "Overdue" },
  upcoming: { chip: "bg-sand-2 text-taupe-2", label: "Upcoming" },
};

function WaitingPeriods({ commencementDate, today }: { commencementDate: string; today: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const periods = waitingPeriodsFor(commencementDate, today);

  return (
    <div>
      <div className="text-[13px] font-bold text-navy">Waiting periods</div>
      <div className="mt-0.5 text-[11.5px] font-medium text-muted">
        Counted from the risk commencement date, {fmtDate(commencementDate)}.
      </div>

      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        {periods.map((p) => (
          <div
            key={p.key}
            className={`rounded-[12px] border p-3 ${
              p.active ? "border-[#cfe8da] bg-success-bg" : "border-sand-2 bg-cream"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12.5px] font-bold text-navy">{p.label}</span>
              <span className={`rounded-[6px] px-2 py-[2px] text-[9.5px] font-bold ${p.active ? "bg-green text-white" : "bg-sand-2 text-taupe-2"}`}>
                {p.active ? "COVERED" : `IN ${p.daysRemaining}D`}
              </span>
            </div>
            <div className="mt-1 text-[11.5px] font-medium text-muted">{p.summary}</div>
            <div className="mt-1.5 text-[11px] font-semibold text-navy">
              {p.active ? "Covered since" : "Covered from"} {fmtDate(p.startsOn)}
            </div>
            <button
              type="button"
              onClick={() => setOpen(open === p.key ? null : p.key)}
              aria-expanded={open === p.key}
              className="mt-1.5 text-[11px] font-bold text-green hover:underline"
            >
              {open === p.key ? "Hide" : `What's included (${p.conditions.length})`}
            </button>
            {open === p.key && (
              <ul className="mt-1.5 flex flex-col gap-[3px]">
                {p.conditions.map((c) => (
                  <li key={c} className="flex gap-1.5 text-[11px] font-medium text-ink">
                    <span className="text-taupe-2">·</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2.5 rounded-[12px] border border-sand-2 bg-white p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-taupe-2">
          Applies whatever the waiting period
        </div>
        <ul className="mt-1.5 flex flex-col gap-1">
          {COVER_NOTES.map((n) => (
            <li key={n} className="flex gap-1.5 text-[11.5px] font-medium text-ink">
              <span className="text-taupe-2">·</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <a
            href={GREAT_JOURNEY_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[9px] border border-sand-2 bg-cream px-3 py-1.5 text-[11.5px] font-semibold text-navy hover:border-navy"
          >
            The Great Journey guide ↗
          </a>
          <a
            href={CLIENT_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[9px] border border-sand-2 bg-cream px-3 py-1.5 text-[11.5px] font-semibold text-navy hover:border-navy"
          >
            Panel clinic &amp; hospital locator ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function ContributionChecklist({ submission, today }: { submission: CaseSubmission; today: string }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const schedule = submission.schedule;
  const summary = useMemo(() => summariseSchedule(schedule, today), [schedule, today]);

  // Grouped by the calendar year the due date falls in: six years of monthly
  // rows is 72 lines, and nobody scrolls that looking for "this year".
  const byYear = useMemo(() => {
    const map = new Map<string, typeof schedule>();
    for (const row of schedule) {
      const year = row.dueDate.slice(0, 4);
      const list = map.get(year);
      if (list) list.push(row);
      else map.set(year, [row]);
    }
    return [...map.entries()];
  }, [schedule]);

  const currentYear = today.slice(0, 4);
  const [openYears, setOpenYears] = useState<Set<string>>(new Set([currentYear]));

  function toggleYear(year: string) {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  function toggle(rowId: string, paid: boolean, dueDate: string) {
    setError(null);
    setPendingId(rowId);
    startTransition(async () => {
      // Ticked on the day it was due, not today: an agent catching up on a
      // week of payments should not stamp them all with this morning.
      const result = await setContributionPaid(rowId, paid, paid ? dueDate : null);
      setPendingId(null);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  if (submission.schedule.length === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-sand-2 bg-cream p-4 text-center">
        <div className="text-[12.5px] font-semibold text-navy">No contribution schedule yet</div>
        <div className="mt-0.5 text-[11.5px] font-medium text-muted">
          It is built from the commencement date when the certificate is recorded.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-[13px] font-bold text-navy">Contribution checklist</div>
          <div className="mt-0.5 text-[11.5px] font-medium text-muted">
            {frequencyLabel(submission.paymentFrequency)} · RM{fmtRM(submission.installmentContribution)} a time ·
            six years from commencement
          </div>
        </div>
        <div className="text-[11.5px] font-semibold text-taupe">
          {summary.paid} of {summary.total} ticked
          {summary.overdue > 0 && <span className="ml-1.5 font-bold text-alert-red">{summary.overdue} overdue</span>}
        </div>
      </div>

      <div className="mt-2 h-[8px] w-full overflow-hidden rounded-full bg-sand-2">
        <div
          className={`h-full rounded-full ${summary.overdue > 0 ? "bg-warn-gold-text" : "bg-green"}`}
          style={{ width: `${Math.max(summary.paidPct, summary.paid > 0 ? 2 : 0)}%` }}
        />
      </div>
      {summary.nextDue && (
        <div className="mt-1.5 text-[11.5px] font-medium text-muted">
          Next unpaid contribution: <strong className="font-bold text-navy">{fmtDate(summary.nextDue)}</strong>
        </div>
      )}

      {error && <div className="mt-2 text-[12px] font-medium text-alert-red">{error}</div>}

      <div className="mt-3 flex flex-col gap-2">
        {byYear.map(([year, rows]) => {
          const openYear = openYears.has(year);
          const yearPaid = rows.filter((r) => r.paid).length;
          return (
            <div key={year} className="rounded-[11px] border border-sand-2 bg-white">
              <button
                type="button"
                onClick={() => toggleYear(year)}
                aria-expanded={openYear}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
              >
                <span className="text-[12.5px] font-bold text-navy">{year}</span>
                <span className="text-[11px] font-semibold text-taupe">
                  {yearPaid}/{rows.length} paid
                </span>
                <span className="flex-1" />
                <svg
                  width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={2.4} strokeLinecap="round"
                  className={`text-taupe transition-transform ${openYear ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {openYear && (
                <div className="border-t border-sand-3 px-2 pb-2">
                  {rows.map((row) => {
                    const status = rowStatus(row, today);
                    const style = STATUS_STYLE[status];
                    return (
                      <div key={row.id} className="flex items-center gap-2.5 border-b border-sand-3 py-2 last:border-b-0">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={row.paid}
                          aria-label={`Contribution due ${fmtDate(row.dueDate)}`}
                          disabled={pendingId === row.id}
                          onClick={() => toggle(row.id, !row.paid, row.dueDate)}
                          className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] border-2 transition-colors disabled:opacity-50 ${
                            row.paid ? "border-green bg-green text-white" : "border-sand-2 bg-white"
                          }`}
                        >
                          {row.paid && (
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="m5 13 4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span className="w-7 flex-none font-mono text-[10px] font-bold text-taupe-2">
                          #{String(row.seq).padStart(2, "0")}
                        </span>
                        <span className={`flex-1 text-[12px] font-semibold ${row.paid ? "text-taupe line-through" : "text-navy"}`}>
                          {fmtDate(row.dueDate)}
                        </span>
                        <span className={`flex-none rounded-[5px] px-[6px] py-[1px] text-[9.5px] font-bold ${style.chip}`}>
                          {style.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Everything an agent needs while looking after one inforce certificate.
 * `today` comes from the server so the waiting-period maths and every row
 * status agree between the server render and the browser.
 */
export function ServicingDetail({ submission, today }: { submission: CaseSubmission; today: string }) {
  return (
    <div className="flex flex-col gap-4">
      {submission.includesMedicalCard && submission.commencementDate ? (
        <WaitingPeriods commencementDate={submission.commencementDate} today={today} />
      ) : (
        <div className="rounded-[12px] border border-dashed border-sand-2 bg-cream p-3.5">
          <div className="text-[12.5px] font-semibold text-navy">No medical card cover on this certificate</div>
          <div className="mt-0.5 text-[11.5px] font-medium text-muted">
            Waiting periods and the Great Journey guide only apply to medical card plans. Turn on
            &ldquo;includes medical card cover&rdquo; on the case if that is wrong.
          </div>
        </div>
      )}

      <div className="border-t border-sand-3 pt-3.5">
        <ContributionChecklist submission={submission} today={today} />
      </div>
    </div>
  );
}
