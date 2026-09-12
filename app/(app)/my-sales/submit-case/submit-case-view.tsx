"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { stageLabel } from "@/lib/pipeline-stages";
import { LeadNo } from "@/components/lead-no";
import { CaseForm } from "../case-form";
import { CertificatePanel, fmtRM } from "../certificate-panel";
import { CASE_STATUS_LABEL, CASE_STATUS_TONE, type CaseStatus, type CaseSubmission, type SubmittableLead } from "../types";

const STATUS_FILTERS: { value: CaseStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Awaiting underwriting" },
  { value: "inforce", label: "Inforce" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export function SubmitCaseView({
  cases,
  leads,
}: {
  cases: CaseSubmission[];
  leads: SubmittableLead[];
}) {
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "all">("all");
  const [caseQuery, setCaseQuery] = useState("");
  const [leadQuery, setLeadQuery] = useState("");
  const [onlyReady, setOnlyReady] = useState(true);
  const [filingFor, setFilingFor] = useState<SubmittableLead | null>(null);
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);

  const visibleCases = useMemo(() => {
    const q = caseQuery.trim().toLowerCase();
    return cases.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.leadName.toLowerCase().includes(q) ||
        c.planName.toLowerCase().includes(q) ||
        (c.certificateNo ?? "").toLowerCase().includes(q)
      );
    });
  }, [cases, statusFilter, caseQuery]);

  const visibleLeads = useMemo(() => {
    const q = leadQuery.trim().toLowerCase();
    return leads.filter((l) => {
      if (onlyReady && !l.canSubmit) return false;
      if (!q) return true;
      return (
        l.fullName.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        String(l.leadNo) === q.replace(/^#/, "")
      );
    });
  }, [leads, leadQuery, onlyReady]);

  const awaiting = cases.filter((c) => c.status === "submitted").length;
  const inforce = cases.filter((c) => c.status === "inforce").length;
  const readyCount = leads.filter((l) => l.canSubmit).length;

  return (
    <div>
      <div className="border-b border-sand bg-white px-5 py-4 lg:px-[30px] lg:py-5">
        <div className="text-[18px] font-extrabold tracking-[-0.02em] text-navy lg:text-[22px]">Submit Case</div>
        <div className="mt-[3px] text-[12.5px] font-medium text-muted lg:text-[13px]">
          {awaiting} awaiting underwriting · {inforce} inforce · {readyCount} lead
          {readyCount === 1 ? "" : "s"} ready to file
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 py-5 lg:px-[30px]">
        {/* ---- Leads to file against ---- */}
        <section className="rounded-[16px] border border-sand bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-[14px] font-bold text-navy">File a case</div>
              <div className="mt-0.5 text-[11.5px] font-medium text-muted">
                A case can be filed once the lead reaches the Submission stage.
              </div>
            </div>
            <label className="flex items-center gap-2 text-[11.5px] font-semibold text-navy">
              <input
                type="checkbox"
                checked={onlyReady}
                onChange={(e) => setOnlyReady(e.target.checked)}
                className="h-[15px] w-[15px] accent-[#0f2540]"
              />
              Only leads ready to file
            </label>
          </div>

          <input
            value={leadQuery}
            onChange={(e) => setLeadQuery(e.target.value)}
            placeholder="Search a lead by name, phone or number…"
            aria-label="Search leads"
            className="mt-3 h-[38px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[12.5px] font-medium text-navy outline-none focus:border-gold placeholder:text-taupe"
          />

          <div className="mt-3 max-h-[340px] overflow-y-auto pr-1">
            {visibleLeads.length === 0 ? (
              <p className="py-6 text-center text-[12.5px] font-medium text-muted">
                {onlyReady
                  ? "No leads are at the Submission stage yet. Move one there on the Sales Pipeline first."
                  : "No leads match that search."}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {visibleLeads.map((l) => (
                  <div
                    key={l.id}
                    className="flex flex-wrap items-center gap-2.5 rounded-[11px] border border-sand-2 bg-cream px-3 py-2.5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <LeadNo no={l.leadNo} />
                      <div className="min-w-0">
                        <Link href={`/leads/${l.id}`} className="block truncate text-[12.5px] font-bold text-navy hover:underline">
                          {l.fullName}
                        </Link>
                        <div className="truncate text-[10.5px] font-medium text-taupe">
                          {stageLabel(l.stage)}
                          {l.agentName ? ` · ${l.agentName}` : ""}
                          {l.caseCount > 0 ? ` · ${l.caseCount} case${l.caseCount === 1 ? "" : "s"} filed` : ""}
                        </div>
                      </div>
                    </div>
                    {l.canSubmit ? (
                      <button
                        type="button"
                        onClick={() => setFilingFor(l)}
                        className="flex-none rounded-[9px] bg-navy px-3 py-2 text-[11.5px] font-semibold text-white"
                      >
                        Submit case
                      </button>
                    ) : (
                      <span
                        title="This lead has to reach the Submission stage first"
                        className="flex-none rounded-[9px] border border-sand-2 bg-white px-3 py-2 text-[11.5px] font-semibold text-taupe-2"
                      >
                        Not at Submission
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ---- Cases already filed ---- */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[14px] font-bold text-navy">Cases filed ({cases.length})</div>
            <input
              value={caseQuery}
              onChange={(e) => setCaseQuery(e.target.value)}
              placeholder="Search a case…"
              aria-label="Search cases"
              className="h-[34px] w-full max-w-[260px] rounded-[9px] border border-sand-2 bg-white px-3 text-[12px] font-medium text-navy outline-none focus:border-gold placeholder:text-taupe"
            />
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${
                  statusFilter === f.value ? "bg-navy text-white" : "border border-sand-2 bg-white text-navy"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-2.5">
            {visibleCases.length === 0 ? (
              <p className="rounded-[12px] border border-dashed border-sand-2 bg-white py-8 text-center text-[12.5px] font-medium text-muted">
                No cases here yet.
              </p>
            ) : (
              visibleCases.map((c) => {
                const open = openCaseId === c.id;
                const lead = leads.find((l) => l.id === c.leadId);
                return (
                  <div key={c.id} className="rounded-[14px] border border-sand bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenCaseId(open ? null : c.id)}
                      aria-expanded={open}
                      className="flex w-full flex-wrap items-center gap-2.5 px-4 py-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-[13px] font-bold text-navy">{c.leadName}</span>
                          <span className={`rounded-[6px] px-2 py-[2px] text-[9.5px] font-bold uppercase tracking-[0.06em] ${CASE_STATUS_TONE[c.status]}`}>
                            {CASE_STATUS_LABEL[c.status]}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-[11px] font-medium text-taupe">
                          {c.planName}
                          {c.certificateNo ? ` · ${c.certificateNo}` : ""}
                          {c.installmentContribution != null ? ` · RM${fmtRM(c.installmentContribution)}` : ""}
                        </div>
                      </div>
                      <svg
                        width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={2.4} strokeLinecap="round"
                        className={`flex-none text-taupe transition-transform ${open ? "rotate-180" : ""}`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    {open && (
                      <div className="border-t border-sand-3 p-3">
                        <CertificatePanel
                          submission={c}
                          lead={{
                            id: c.leadId,
                            fullName: c.leadName,
                            dateOfBirth: lead?.dateOfBirth ?? c.dateOfBirth,
                            gender: lead?.gender ?? c.gender,
                            isSmoker: lead?.isSmoker ?? c.isSmoker,
                            occupation: lead?.occupation ?? c.occupation,
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* ---- File a new case ---- */}
      {filingFor && (
        <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-navy/55 p-4">
          <div className="my-6 w-full max-w-[720px] rounded-2xl bg-white p-5 shadow-elevated">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[15px] font-bold text-navy">Submit case · {filingFor.fullName}</div>
                <div className="mt-0.5 text-[11.5px] font-medium text-muted">
                  What you are sending to the operator. The certificate number and commencement date come later,
                  when underwriting returns.
                </div>
              </div>
              <button type="button" onClick={() => setFilingFor(null)} className="flex-none text-[12px] font-semibold text-muted">
                Cancel
              </button>
            </div>
            <div className="mt-4">
              <CaseForm
                lead={{
                  id: filingFor.id,
                  fullName: filingFor.fullName,
                  dateOfBirth: filingFor.dateOfBirth,
                  gender: filingFor.gender,
                  isSmoker: filingFor.isSmoker,
                  occupation: filingFor.occupation,
                  interest: filingFor.interest,
                }}
                onDone={() => setFilingFor(null)}
                onCancel={() => setFilingFor(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
