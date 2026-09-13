"use client";

import { useState } from "react";
import Link from "next/link";
import { CaseForm, type CaseFormLead } from "./case-form";
import { CertificatePanel } from "./certificate-panel";
import { ServicingDetail } from "./servicing-detail";
import type { CaseSubmission, BenefitOption } from "./types";

/**
 * Lead Detail's second tab: every case filed against this lead, and -- once
 * one is inforce -- the servicing view for it.
 *
 * The tab itself is locked until the lead reaches Submission, so this only
 * ever renders for a lead that has actually got that far.
 */
export function LeadCaseTab({
  lead,
  cases,
  benefitOptions,
  today,
}: {
  lead: CaseFormLead;
  cases: CaseSubmission[];
  benefitOptions: BenefitOption[];
  today: string;
}) {
  const [filing, setFiling] = useState(false);
  const [servicingFor, setServicingFor] = useState<string | null>(
    cases.find((c) => c.status === "inforce")?.id ?? null,
  );

  if (filing) {
    return (
      <div className="rounded-[16px] border border-sand bg-white p-[18px]">
        <div className="text-[14.5px] font-bold text-navy">File a case</div>
        <div className="mt-0.5 mb-4 text-[11.5px] font-medium text-muted">
          What you are sending to the operator. The certificate number and commencement date come later,
          when underwriting returns.
        </div>
        <CaseForm
          lead={lead}
          benefitOptions={benefitOptions}
          onDone={() => setFiling(false)}
          onCancel={() => setFiling(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[14.5px] font-bold text-navy">
            Cases {cases.length > 0 && <span className="text-taupe">({cases.length})</span>}
          </div>
          <div className="mt-0.5 text-[11.5px] font-medium text-muted">
            Submitted cases, certificates and servicing for this lead.
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/my-sales/submit-case"
            className="rounded-[9px] border border-sand-2 bg-white px-3 py-2 text-[12px] font-semibold text-navy hover:border-navy"
          >
            Submit Case
          </Link>
          <button
            type="button"
            onClick={() => setFiling(true)}
            className="rounded-[9px] bg-gold px-3.5 py-2 text-[12px] font-bold text-navy hover:brightness-95"
          >
            + File a case
          </button>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-sand-2 bg-white p-6 text-center">
          <div className="text-[13px] font-bold text-navy">No case filed yet</div>
          <div className="mt-1 text-[12px] font-medium text-muted">
            File what you are sending to the operator, then come back and record the certificate once
            underwriting returns.
          </div>
        </div>
      ) : (
        cases.map((c) => (
          <div key={c.id} className="flex flex-col gap-2.5">
            <CertificatePanel submission={c} lead={lead} benefitOptions={benefitOptions} />
            {c.status === "inforce" && (
              <div className="rounded-[14px] border border-sand bg-white p-3.5">
                <button
                  type="button"
                  onClick={() => setServicingFor(servicingFor === c.id ? null : c.id)}
                  aria-expanded={servicingFor === c.id}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span className="flex-1 text-[13px] font-bold text-navy">
                    Servicing · waiting periods and contributions
                  </span>
                  <svg
                    width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth={2.4} strokeLinecap="round"
                    className={`text-taupe transition-transform ${servicingFor === c.id ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {servicingFor === c.id && (
                  <div className="mt-3.5 border-t border-sand-3 pt-3.5">
                    <ServicingDetail submission={c} today={today} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/** What the tab shows before the lead has got far enough to have a case. */
export function LockedCaseTab() {
  return (
    <div className="rounded-[16px] border border-dashed border-sand-2 bg-white p-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[12px] bg-cream text-taupe">
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
          <rect x="4" y="10" width="16" height="11" rx="2.5" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <div className="mt-2.5 text-[13.5px] font-bold text-navy">Locked until this lead reaches Submission</div>
      <div className="mx-auto mt-1 max-w-[380px] text-[12px] font-medium text-muted">
        Move the lead to the Submission stage on the Sales Pipeline, and this tab opens up for filing the
        case, recording the certificate and servicing the client afterwards.
      </div>
      <Link
        href="/pipeline"
        className="mt-3.5 inline-flex rounded-[9px] border border-sand-2 bg-cream px-3.5 py-2 text-[12px] font-semibold text-navy hover:border-navy"
      >
        Open Sales Pipeline
      </Link>
    </div>
  );
}
