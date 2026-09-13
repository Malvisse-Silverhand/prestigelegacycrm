"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { frequencyLabel } from "@/lib/contribution-schedule";
import { recordCertificate, setCaseStatus, deleteCase } from "./actions";
import { CaseForm, type CaseFormLead } from "./case-form";
import { waLink } from "@/lib/whatsapp";
import { useSpecimen } from "./use-specimen";
import {
  ageAtEntry,
  CASE_STATUS_LABEL,
  CASE_STATUS_TONE,
  type BenefitOption,
  type CaseSubmission,
} from "./types";

/** YYYY-MM-DD -> DD/MM/YYYY, the way the operator's own screens print it. */
export function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function fmtRM(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const input =
  "h-[38px] w-full rounded-[9px] border border-sand-2 bg-cream px-3 text-[12.5px] font-medium text-navy outline-none focus:border-gold";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-sand-3 py-[7px] last:border-b-0">
      <span className="flex-none text-[11px] font-semibold text-taupe">{label}</span>
      <span className="min-w-0 text-right text-[12px] font-semibold text-navy">{value}</span>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-sand bg-white p-3.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-taupe-2">{title}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/**
 * One certificate, rendered as the operator's own screens lay it out --
 * insured, status, financials, nominees, benefits -- plus whichever action
 * the case's current state actually allows.
 */
export function CertificatePanel({
  submission,
  lead,
  benefitOptions,
  canEdit = true,
}: {
  submission: CaseSubmission;
  lead: CaseFormLead;
  benefitOptions: BenefitOption[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const eg = useSpecimen();
  const [mode, setMode] = useState<"view" | "edit" | "certificate">("view");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Certificate step
  const [certNo, setCertNo] = useState(submission.certificateNo ?? "");
  const [commencement, setCommencement] = useState(submission.commencementDate ?? "");
  const [issueDate, setIssueDate] = useState(submission.certificateIssueDate ?? "");
  const [nextDue, setNextDue] = useState(submission.nextDueDate ?? "");
  const [lastPaid, setLastPaid] = useState(submission.lastPaidDate ?? "");
  const [issuingAgent, setIssuingAgent] = useState(submission.issuingAgentName ?? "");
  const [stampDuty, setStampDuty] = useState(submission.stampDuty != null ? String(submission.stampDuty) : "");
  const [discountType, setDiscountType] = useState(submission.discountType ?? "");
  const [underTrust, setUnderTrust] = useState(submission.certificateUnderTrust);

  const age = ageAtEntry(submission.dateOfBirth, submission.commencementDate);

  function handleRecord() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await recordCertificate({
          caseId: submission.id,
          certificateNo: certNo,
          commencementDate: commencement,
          certificateIssueDate: issueDate || null,
          nextDueDate: nextDue || null,
          lastPaidDate: lastPaid || null,
          issuingAgentName: issuingAgent || null,
          stampDuty: stampDuty.trim() ? Number(stampDuty) : null,
          discountType: discountType || null,
          certificateUnderTrust: underTrust,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setMode("view");
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  function runStatus(next: "rejected" | "withdrawn" | "submitted") {
    setError(null);
    startTransition(async () => {
      const result = await setCaseStatus(submission.id, next);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCase(submission.id);
      if (result.error) setError(result.error);
      else {
        setConfirmDelete(false);
        router.refresh();
      }
    });
  }

  if (mode === "edit") {
    return (
      <div className="rounded-[14px] border border-sand bg-white p-4">
        <div className="mb-3 text-[13.5px] font-bold text-navy">Edit case</div>
        <CaseForm
          lead={lead}
          existing={submission}
          benefitOptions={benefitOptions}
          onDone={() => setMode("view")}
          onCancel={() => setMode("view")}
        />
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-sand bg-cream p-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-bold text-navy">{submission.planName}</span>
            <span className={`rounded-[6px] px-2 py-[2px] text-[9.5px] font-bold uppercase tracking-[0.06em] ${CASE_STATUS_TONE[submission.status]}`}>
              {CASE_STATUS_LABEL[submission.status]}
            </span>
            {submission.includesMedicalCard && (
              <span className="rounded-[6px] bg-info-blue-bg px-2 py-[2px] text-[9.5px] font-bold text-info-blue-text">
                MEDICAL CARD
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11.5px] font-medium text-taupe">
            {submission.certificateNo ? `Certificate ${submission.certificateNo}` : "No certificate number yet"}
            {submission.planType ? ` · Plan type ${submission.planType}` : ""}
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-none gap-1.5">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="rounded-[8px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy hover:border-navy"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete case"
              className="rounded-[8px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-alert-red hover:border-alert-red"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="mt-2.5 rounded-[10px] border border-[#f0dfb4] bg-warn-gold-bg p-3">
          <div className="text-[12px] font-semibold text-warn-gold-text">
            Delete this case? Its nominees, benefits and the whole contribution schedule go with it.
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className="h-8 flex-1 rounded-[8px] border border-sand-2 bg-white text-[11.5px] font-semibold text-navy">
              Keep it
            </button>
            <button type="button" onClick={handleDelete} disabled={pending} className="h-8 flex-1 rounded-[8px] bg-alert-red text-[11.5px] font-semibold text-white disabled:opacity-60">
              {pending ? "Deleting…" : "Yes, delete"}
            </button>
          </div>
        </div>
      )}

      {/* ---- Record certificate: the step that turns a submission into a client ---- */}
      {mode === "certificate" ? (
        <div className="mt-3 rounded-[12px] border border-sand bg-white p-3.5">
          <div className="text-[12.5px] font-bold text-navy">Record the certificate</div>
          <div className="mt-0.5 text-[11.5px] font-medium text-muted">
            Saving this marks the case inforce, builds the contribution schedule from the commencement date,
            and moves the lead to Closed Won/Policy Inforced.
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Certificate no</span>
              <input value={certNo} onChange={(e) => setCertNo(e.target.value)} placeholder={eg.certificateNo} className={`mt-[5px] ${input}`} />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Risk commencement date</span>
              <input type="date" value={commencement} onChange={(e) => setCommencement(e.target.value)} className={`mt-[5px] ${input}`} />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Certificate issue date</span>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={`mt-[5px] ${input}`} />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Next due date</span>
              <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} className={`mt-[5px] ${input}`} />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Last paid date</span>
              <input type="date" value={lastPaid} onChange={(e) => setLastPaid(e.target.value)} className={`mt-[5px] ${input}`} />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Issuing agent</span>
              <input value={issuingAgent} onChange={(e) => setIssuingAgent(e.target.value)} className={`mt-[5px] ${input}`} />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Stamp duty (RM)</span>
              <input type="number" step="0.01" value={stampDuty} onChange={(e) => setStampDuty(e.target.value)} className={`mt-[5px] ${input}`} />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Discount type</span>
              <input value={discountType} onChange={(e) => setDiscountType(e.target.value)} placeholder="No special discount" className={`mt-[5px] ${input}`} />
            </label>
          </div>
          <label className="mt-2.5 flex items-center gap-2.5">
            <button
              type="button"
              role="switch"
              aria-checked={underTrust}
              aria-label="Certificate under trust"
              onClick={() => setUnderTrust((v) => !v)}
              className={`flex h-[21px] w-[38px] flex-none items-center rounded-full px-[3px] transition-colors ${underTrust ? "justify-end bg-green" : "justify-start bg-sand-2"}`}
            >
              <span className="h-[15px] w-[15px] rounded-full bg-white" />
            </button>
            <span className="text-[12.5px] font-semibold text-navy">Certificate under trust</span>
          </label>

          {error && <div className="mt-2.5 text-[12px] font-medium text-alert-red">{error}</div>}

          <div className="mt-3 flex gap-2.5">
            <button type="button" onClick={() => setMode("view")} className="h-[40px] flex-1 rounded-[10px] border border-sand-2 bg-white text-[12.5px] font-semibold text-navy">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRecord}
              disabled={pending || !certNo.trim() || !commencement}
              className="h-[40px] flex-1 rounded-[10px] bg-green text-[12.5px] font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Saving…" : "Mark inforce"}
            </button>
          </div>
        </div>
      ) : (
        canEdit &&
        submission.status === "submitted" && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("certificate")}
              className="rounded-[9px] bg-green px-3.5 py-2 text-[12px] font-semibold text-white"
            >
              Record certificate
            </button>
            <button type="button" onClick={() => runStatus("rejected")} disabled={pending} className="rounded-[9px] border border-sand-2 bg-white px-3 py-2 text-[12px] font-semibold text-navy">
              Rejected
            </button>
            <button type="button" onClick={() => runStatus("withdrawn")} disabled={pending} className="rounded-[9px] border border-sand-2 bg-white px-3 py-2 text-[12px] font-semibold text-navy">
              Withdrawn
            </button>
          </div>
        )
      )}

      {canEdit && (submission.status === "rejected" || submission.status === "withdrawn") && mode === "view" && (
        <div className="mt-3">
          <button type="button" onClick={() => runStatus("submitted")} disabled={pending} className="rounded-[9px] border border-sand-2 bg-white px-3 py-2 text-[12px] font-semibold text-navy">
            Reopen as awaiting underwriting
          </button>
        </div>
      )}

      {error && mode === "view" && <div className="mt-2 text-[12px] font-medium text-alert-red">{error}</div>}

      {/* ---- The certificate itself ---- */}
      <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
        <Block title="Insured">
          <Row label="Proposer" value={submission.proposerName ?? "—"} />
          <Row label="Person covered" value={submission.personCoveredName ?? "—"} />
          <Row label="ID no" value={submission.idNo ?? "—"} />
          <Row label="Date of birth" value={fmtDate(submission.dateOfBirth)} />
          <Row label="Gender" value={submission.gender ? submission.gender[0].toUpperCase() + submission.gender.slice(1) : "—"} />
          <Row label="Religion" value={submission.religion ?? "—"} />
          <Row label="Age at entry" value={age ?? "—"} />
          <Row label="Smoker" value={submission.isSmoker === null ? "—" : submission.isSmoker ? "Yes" : "No"} />
          <Row label="Occupation" value={submission.occupation ?? "—"} />
        </Block>

        <Block title="Financial information">
          <Row label="Currency" value={submission.currency} />
          <Row label="Payment frequency" value={frequencyLabel(submission.paymentFrequency)} />
          <Row label="Total installment contribution" value={fmtRM(submission.installmentContribution)} />
          <Row label="Sum covered" value={fmtRM(submission.sumCovered)} />
          <Row label="Stamp duty" value={submission.stampDuty === null ? "—" : fmtRM(submission.stampDuty)} />
          <Row label="Discount type" value={submission.discountType ?? "—"} />
          <Row label="Contribution method" value={submission.paymentMethod ?? "—"} />
          <Row label="Next due date" value={fmtDate(submission.nextDueDate)} />
          <Row label="Last paid date" value={fmtDate(submission.lastPaidDate)} />
        </Block>

        <Block title="Status dates">
          <Row label="Certificate issue date" value={fmtDate(submission.certificateIssueDate)} />
          <Row label="Risk commencement date" value={fmtDate(submission.commencementDate)} />
          <Row label="Lapse date" value={fmtDate(submission.lapseDate)} />
          <Row label="Termination date" value={fmtDate(submission.terminationDate)} />
          <Row label="Issuing agent" value={submission.issuingAgentName ?? "—"} />
          <Row label="Under trust" value={submission.certificateUnderTrust ? "Yes" : "No"} />
        </Block>

        <Block title={`Nominees (${submission.nominees.length})`}>
          {submission.nominees.length === 0 ? (
            <p className="py-1.5 text-[11.5px] font-medium text-taupe">None recorded.</p>
          ) : (
            submission.nominees.map((n, i) => (
              <div
                key={i}
                className="flex items-baseline justify-between gap-3 border-b border-sand-3 py-[7px] last:border-b-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold text-taupe">
                    {n.name}
                    {n.relationship ? ` · ${n.relationship}` : ""}
                  </span>
                  {n.phone && (
                    <a
                      href={waLink(n.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-[2px] inline-flex items-center gap-1 text-[10.5px] font-semibold text-green hover:underline"
                    >
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Z" />
                      </svg>
                      {n.phone}
                    </a>
                  )}
                </span>
                <span className="flex-none text-right text-[12px] font-semibold text-navy">
                  {n.percentage === null ? "—" : `${n.percentage}%`}
                </span>
              </div>
            ))
          )}
        </Block>
      </div>

      {submission.benefits.length > 0 && (
        <div className="mt-2.5 rounded-[12px] border border-sand bg-white p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-taupe-2">Benefit details</div>
          <div className="mt-1.5 -mx-3.5 overflow-x-auto px-3.5">
            <table className="w-full min-w-[520px] border-collapse text-[11.5px]">
              <thead>
                <tr className="border-b border-sand-3 text-left text-[9.5px] font-bold uppercase tracking-[0.06em] text-taupe-2">
                  <th className="py-1.5 pr-2 font-bold">Benefit</th>
                  <th className="py-1.5 pr-2 text-right font-bold">Sum covered</th>
                  <th className="py-1.5 pr-2 text-right font-bold">Contribution</th>
                  <th className="py-1.5 text-right font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {submission.benefits.map((b, i) => (
                  <tr key={i} className="border-b border-sand-3 last:border-b-0">
                    <td className="py-1.5 pr-2 font-semibold text-navy">{b.benefit}</td>
                    <td className="py-1.5 pr-2 text-right text-navy">{fmtRM(b.sumCovered)}</td>
                    <td className="py-1.5 pr-2 text-right text-navy">{fmtRM(b.installmentContribution)}</td>
                    <td className="py-1.5 text-right text-muted">{b.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {submission.notes && (
        <div className="mt-2.5 rounded-[12px] border border-sand bg-white p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-taupe-2">Notes</div>
          <p className="mt-1 text-[12px] leading-relaxed font-medium text-ink">{submission.notes}</p>
        </div>
      )}
    </div>
  );
}
