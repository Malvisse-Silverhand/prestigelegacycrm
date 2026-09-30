"use client";

import { useMemo, useState } from "react";
import { summariseSchedule } from "@/lib/contribution-schedule";
import { caseAnc, caseCollected } from "@/lib/case-anc";
import { PLAN_CATEGORY_LABEL, PLAN_CATEGORY_SHORT } from "@/lib/plan-catalogue";
import { EmptyState } from "@/components/empty-state";
import { ServicingCalendar } from "./servicing-calendar";
import { ServicingClientModal } from "./servicing-client-modal";
import type { CaseSubmission } from "../types";
import type { BirthdayRow } from "@/lib/birthdays";

export function ServicingView({
  cases,
  birthdays,
  today,
}: {
  cases: CaseSubmission[];
  birthdays: BirthdayRow[];
  today: string;
}) {
  // No default selection -- the detail now opens as a modal, so "selected"
  // means "the modal is open for this client", not "shown in the panel".
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // A birthday's "View" action has no case to open when the person has no
  // certificate on this book yet (still Closed Won, not yet filed) -- Link
  // to their Lead Detail page instead in day-modal.tsx.
  function onSelectLead(leadId: string) {
    const match = cases.find((c) => c.leadId === leadId);
    if (match) setSelectedId(match.id);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.leadName.toLowerCase().includes(q) ||
        c.planName.toLowerCase().includes(q) ||
        (c.certificateNo ?? "").toLowerCase().includes(q) ||
        (c.idNo ?? "").toLowerCase().includes(q) ||
        (c.leadEmail ?? "").toLowerCase().includes(q),
    );
  }, [cases, query]);

  const selected = cases.find((c) => c.id === selectedId) ?? null;

  // Same NRIC, more than one certificate: the client portal already combines
  // these into one login, so the row list should make that pairing visible
  // too -- an agent skimming similar names needs the NRIC to tell them apart,
  // not just the plan.
  const byIdNo = useMemo(() => {
    const map = new Map<string, CaseSubmission[]>();
    for (const c of cases) {
      if (!c.idNo) continue;
      const list = map.get(c.idNo) ?? [];
      list.push(c);
      map.set(c.idNo, list);
    }
    return map;
  }, [cases]);

  const siblingsOf = (c: CaseSubmission) => (c.idNo ? (byIdNo.get(c.idNo) ?? []).filter((s) => s.id !== c.id) : []);

  // How much is behind across the whole book -- the one number worth putting
  // at the top of a servicing screen.
  const totalOverdue = useMemo(
    () => cases.reduce((n, c) => n + summariseSchedule(c.schedule, today).overdue, 0),
    [cases, today],
  );

  // The same two figures the Sales Pipeline reports, over this book: what the
  // certificates are worth over a year, and what has actually been paid in.
  const { inforcedAnc, collected } = useMemo(() => {
    let inforcedAnc = 0, collected = 0;
    for (const c of cases) {
      inforcedAnc += caseAnc({
        paymentFrequency: c.paymentFrequency,
        installmentContribution: c.installmentContribution,
      });
      collected += caseCollected({
        installmentContribution: c.installmentContribution,
        paidCount: c.schedule.filter((r) => r.paid).length,
      });
    }
    return { inforcedAnc, collected };
  }, [cases]);

  if (cases.length === 0) {
    return (
      <div>
        <div className="sticky top-0 z-20 lg:static border-b border-sand bg-white/85 backdrop-blur-md px-5 py-4 lg:bg-white lg:backdrop-blur-none lg:px-[30px] lg:py-5">
          <div className="text-[18px] font-extrabold tracking-[-0.02em] text-navy lg:text-[22px]">Servicing</div>
          <div className="mt-[3px] text-[12.5px] font-medium text-muted lg:text-[13px]">
            Clients whose policy is inforce
          </div>
        </div>
        <div className="px-5 py-5 sm:py-8 lg:px-[30px]">
          <EmptyState
            icon={
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="text-green">
                <path d="M12 3 4 6v6c0 4.4 3.2 8.4 8 9 4.8-.6 8-4.6 8-9V6z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            }
            title="No clients to service yet"
            description="A client appears here once their case is recorded as inforce on Submit Case, which also moves them to Closed Won/Policy Inforced."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-20 lg:static flex flex-wrap items-start gap-3 border-b border-sand bg-white/85 backdrop-blur-md px-5 py-4 lg:bg-white lg:backdrop-blur-none lg:px-[30px] lg:py-5">
        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-extrabold tracking-[-0.02em] text-navy lg:text-[22px]">Servicing</div>
          <div className="mt-[3px] text-[12.5px] font-medium text-muted lg:text-[13px]">
            {cases.length} inforce certificate{cases.length === 1 ? "" : "s"}
            {totalOverdue > 0 && (
              <span className="ml-1.5 font-bold text-alert-red">· {totalOverdue} contribution behind</span>
            )}
          </div>
        </div>
        <div className="flex flex-none flex-wrap gap-2.5">
          <div className="rounded-[13px] bg-gold px-4 py-2.5">
            <div className="text-[10px] font-semibold text-navy/70">ANC Inforced</div>
            <div className="mt-0.5 text-[18px] font-extrabold tracking-[-0.02em] text-navy">
              RM {Math.round(inforcedAnc).toLocaleString("en-MY")}
            </div>
          </div>
          <div className="rounded-[13px] border border-sand-2 bg-cream px-4 py-2.5">
            <div className="text-[10px] font-semibold text-taupe-2">ANC Collected</div>
            <div className="mt-0.5 text-[18px] font-extrabold tracking-[-0.02em] text-green">
              RM {Math.round(collected).toLocaleString("en-MY")}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-5 py-5 lg:px-[30px]">
        <ServicingCalendar
          cases={cases}
          birthdays={birthdays}
          today={today}
          onSelectCase={setSelectedId}
          onSelectLead={onSelectLead}
        />

        {/* ---- Clients ---- */}
        {/* Click a card to open its detail as a modal (below) -- this used to
            share the row with a permanently-open detail column, which meant
            a narrow 300px list even on a wide monitor and an empty "pick a
            client" panel taking up half the page before the first click. */}
        <div className="rounded-[16px] border border-sand bg-white p-3.5">
          <div className="text-[13px] font-bold text-navy">Clients</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            aria-label="Search clients"
            className="mt-2 h-[34px] w-full rounded-[9px] border border-sand-2 bg-cream px-3 text-[12px] font-medium text-navy outline-none focus:border-gold placeholder:text-taupe"
          />
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {visible.length === 0 && (
              <p className="col-span-full py-4 text-center text-[12px] font-medium text-muted">Nothing matches that.</p>
            )}
            {visible.map((c) => {
                const summary = summariseSchedule(c.schedule, today);
                const active = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`rounded-[11px] border px-3 py-2.5 text-left ${
                      active ? "border-brand bg-brand" : "border-sand-2 bg-cream hover:border-brand"
                    }`}
                  >
                    <div className={`truncate text-[12.5px] font-bold ${active ? "text-white" : "text-navy"}`}>
                      {c.leadName}
                    </div>
                    <div className={`truncate text-[10.5px] font-medium ${active ? "text-white/60" : "text-taupe"}`}>
                      {c.planName}
                      {c.certificateNo ? ` · ${c.certificateNo}` : ""}
                    </div>
                    {(c.idNo || c.leadEmail) && (
                      <div className={`truncate text-[9.5px] font-medium ${active ? "text-white/45" : "text-taupe-2"}`}>
                        <span className="font-mono">{c.idNo ?? "no NRIC"}</span>
                        {c.leadEmail ? ` · ${c.leadEmail}` : " · no email"}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`rounded-[5px] px-[6px] py-[1px] text-[9.5px] font-bold ${
                          summary.overdue > 0
                            ? "bg-alert-red-bg text-alert-red"
                            : active
                              ? "bg-white/15 text-white"
                              : "bg-success-bg text-green"
                        }`}
                      >
                        {summary.overdue > 0 ? `${summary.overdue} overdue` : `${summary.paid}/${summary.total} paid`}
                      </span>
                      {c.planCategories.map((key) => (
                        <span
                          key={key}
                          title={PLAN_CATEGORY_LABEL[key]}
                          className={`rounded-[5px] px-[6px] py-[1px] text-[9.5px] font-bold ${
                            active ? "bg-white/15 text-white" : "bg-info-blue-bg text-info-blue-text"
                          }`}
                        >
                          {PLAN_CATEGORY_SHORT[key]}
                        </span>
                      ))}
                      {/* Same NRIC as another case on this book -- the client
                          portal already combines them, so this row is not
                          this person's only certificate. */}
                      {siblingsOf(c).length > 0 && (
                        <span
                          className={`rounded-[5px] px-[6px] py-[1px] text-[9.5px] font-bold ${
                            active ? "bg-white/15 text-white" : "bg-warn-gold-bg text-warn-gold-text"
                          }`}
                          title={`Same NRIC as: ${siblingsOf(c)
                            .map((s) => s.certificateNo ?? s.planName)
                            .join(", ")}`}
                        >
                          +{siblingsOf(c).length} cert{siblingsOf(c).length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      {selected && (
        <ServicingClientModal
          submission={selected}
          today={today}
          siblings={siblingsOf(selected)}
          onSelectSibling={setSelectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

