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
import { waLink } from "@/lib/whatsapp";
import { contributionReminder, jompayReminder } from "@/lib/contribution-reminder";
import { setContributionPaid } from "./actions";
import { PortalLinkCard } from "./portal-link-card";
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
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-[11.5px] font-semibold text-taupe">
            {summary.paid} of {summary.total} ticked
            {summary.overdue > 0 && <span className="ml-1.5 font-bold text-alert-red">{summary.overdue} overdue</span>}
          </div>
          {/* Opens WhatsApp with the message already written, so the agent
              reads it and can change anything before it goes. Only offered
              when there is a number to open and something left to chase. */}
          {submission.leadPhone && summary.nextDue && (
            <a
              href={waLink(
                submission.leadPhone,
                contributionReminder({
                  clientName: submission.leadName,
                  planName: submission.planName,
                  certificateNo: submission.certificateNo,
                  amount: submission.installmentContribution,
                  frequency: submission.paymentFrequency,
                  nextDue: summary.nextDue,
                  overdue: summary.overdue,
                  religion: submission.religion,
                  agentName: submission.agentName,
                }),
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-[9px] bg-green px-3 py-2 text-[11.5px] font-semibold text-white hover:brightness-95"
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Z" />
              </svg>
              Send WhatsApp Reminder
            </a>
          )}
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
        {byYear.map(([year, rows], yearIndex) => {
          const openYear = openYears.has(year);
          const yearPaid = rows.filter((r) => r.paid).length;
          // JomPay instructions activate the policy, so they only belong on
          // the certificate's very first year -- repeating registration
          // instructions in 2029 would just be confusing.
          const isFirstYear = yearIndex === 0;
          return (
            <div key={year} className="rounded-[11px] border border-sand-2 bg-white">
              <div className="flex w-full items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleYear(year)}
                  aria-expanded={openYear}
                  className="flex flex-1 items-center gap-2 py-0.5 text-left"
                >
                  <span className="text-[12.5px] font-bold text-navy">{year}</span>
                  <span className="text-[11px] font-semibold text-taupe">
                    {yearPaid}/{rows.length} paid
                  </span>
                </button>
                {isFirstYear && submission.leadPhone && submission.certificateNo && (
                  <a
                    href={waLink(
                      submission.leadPhone,
                      jompayReminder({
                        clientName: submission.leadName,
                        certificateNo: submission.certificateNo,
                        phone: submission.leadPhone,
                        amount: submission.installmentContribution ?? 0,
                      }),
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-none items-center gap-1.5 rounded-[8px] bg-green px-2.5 py-1.5 text-[10.5px] font-semibold text-white hover:brightness-95"
                  >
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.41-.56-.42h-.47c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.74 2.66 4.22 3.73.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
                    </svg>
                    Send WhatsApp Reminder (Payment)
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => toggleYear(year)}
                  aria-label={openYear ? `Collapse ${year}` : `Expand ${year}`}
                  className="flex-none p-1"
                >
                  <svg
                    width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth={2.4} strokeLinecap="round"
                    className={`text-taupe transition-transform ${openYear ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
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
    // A grid, not a single stack: the client portal card gets its own column
    // on a wide screen rather than sitting under the contribution checklist,
    // where the two read as one block. "grid" with no base grid-cols already
    // stacks a narrow screen one item per row. This panel already sits inside
    // the wide half of the Servicing page's own lg: split, so the nested
    // split waits for xl: -- splitting again at lg: would squeeze both
    // columns on anything short of a very wide monitor.
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
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

      {/* Its own column, with its own divider on the wide layout -- an agent
          revoking a link should never have to scroll past the schedule to
          reach it, and the two should never read as one block. */}
      <div className="border-t border-sand-3 pt-3.5 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
        <PortalLinkCard submission={submission} />
      </div>
    </div>
  );
}
