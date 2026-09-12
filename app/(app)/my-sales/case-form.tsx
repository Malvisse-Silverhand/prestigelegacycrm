"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_FREQUENCIES, type PaymentFrequency } from "@/lib/contribution-schedule";
import { saveCase } from "./actions";
import type { CaseSubmission, CaseNominee, CaseBenefit } from "./types";

export type CaseFormLead = {
  id: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  isSmoker?: boolean | null;
  occupation?: string | null;
  interest?: string | null;
};

const input =
  "h-[38px] w-full rounded-[9px] border border-sand-2 bg-cream px-3 text-[12.5px] font-medium text-navy outline-none focus:border-gold";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">{label}</span>
      <div className="mt-[5px]">{children}</div>
      {hint && <p className="mt-1 text-[10.5px] font-medium text-taupe">{hint}</p>}
    </label>
  );
}

function numOrNull(v: string) {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const EMPTY_NOMINEE: CaseNominee = { name: "", relationship: "", percentage: null };
const EMPTY_BENEFIT: CaseBenefit = {
  benefit: "",
  term: null,
  sumCovered: null,
  installmentContribution: null,
  coverStartDate: null,
  coverEndDate: null,
  contributionEndDate: null,
  status: "Inforce",
};

/**
 * What the agent files while the lead sits at Submission. Deliberately does
 * not ask for a certificate number or commencement date -- those don't exist
 * until underwriting comes back, and a form that asks for them here would
 * either be filled with guesses or left half-finished.
 */
export function CaseForm({
  lead,
  existing,
  onDone,
  onCancel,
}: {
  lead: CaseFormLead;
  existing?: CaseSubmission | null;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [planName, setPlanName] = useState(existing?.planName ?? lead.interest ?? "");
  const [planType, setPlanType] = useState(existing?.planType ?? "");
  const [includesMedicalCard, setIncludesMedicalCard] = useState(existing?.includesMedicalCard ?? false);
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>(
    existing?.paymentFrequency ?? "monthly",
  );
  const [paymentMethod, setPaymentMethod] = useState(existing?.paymentMethod ?? "");
  const [installment, setInstallment] = useState(
    existing?.installmentContribution != null ? String(existing.installmentContribution) : "",
  );
  const [sumCovered, setSumCovered] = useState(
    existing?.sumCovered != null ? String(existing.sumCovered) : "",
  );

  // Prefilled from the lead: the same person, already typed once.
  const [proposerName, setProposerName] = useState(existing?.proposerName ?? lead.fullName);
  const [personCovered, setPersonCovered] = useState(existing?.personCoveredName ?? lead.fullName);
  const [idNo, setIdNo] = useState(existing?.idNo ?? "");
  const [gender, setGender] = useState(existing?.gender ?? lead.gender ?? "");
  const [dob, setDob] = useState(existing?.dateOfBirth ?? lead.dateOfBirth ?? "");
  const [religion, setReligion] = useState(existing?.religion ?? "");
  const [smoker, setSmoker] = useState<string>(
    existing?.isSmoker != null ? String(existing.isSmoker) : lead.isSmoker != null ? String(lead.isSmoker) : "",
  );
  const [occupation, setOccupation] = useState(existing?.occupation ?? lead.occupation ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const [nominees, setNominees] = useState<CaseNominee[]>(
    existing?.nominees?.length ? existing.nominees : [{ ...EMPTY_NOMINEE }],
  );
  const [benefits, setBenefits] = useState<CaseBenefit[]>(
    existing?.benefits?.length ? existing.benefits : [{ ...EMPTY_BENEFIT }],
  );

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nomineeTotal = nominees.reduce((sum, n) => sum + (n.percentage ?? 0), 0);

  function updateNominee(i: number, patch: Partial<CaseNominee>) {
    setNominees((prev) => prev.map((n, idx) => (idx === i ? { ...n, ...patch } : n)));
  }
  function updateBenefit(i: number, patch: Partial<CaseBenefit>) {
    setBenefits((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveCase({
          caseId: existing?.id,
          leadId: lead.id,
          planName,
          planType,
          includesMedicalCard,
          paymentFrequency,
          paymentMethod,
          installmentContribution: numOrNull(installment),
          sumCovered: numOrNull(sumCovered),
          proposerName,
          personCoveredName: personCovered,
          idNo,
          gender: gender || null,
          dateOfBirth: dob || null,
          religion,
          isSmoker: smoker === "" ? null : smoker === "true",
          occupation,
          notes,
          nominees,
          benefits,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
        onDone?.();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Plan ---- */}
      <section>
        <div className="text-[13px] font-bold text-navy">Plan</div>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          <Field label="Plan name">
            <input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="i-GREAT NOVA" className={input} />
          </Field>
          <Field label="Plan type">
            <input value={planType} onChange={(e) => setPlanType(e.target.value)} placeholder="0758" className={input} />
          </Field>
          <Field label="Payment frequency">
            <select
              value={paymentFrequency}
              onChange={(e) => setPaymentFrequency(e.target.value as PaymentFrequency)}
              className={input}
            >
              {PAYMENT_FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment method">
            <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Credit Card" className={input} />
          </Field>
          <Field label="Installment contribution (RM)">
            <input type="number" step="0.01" value={installment} onChange={(e) => setInstallment(e.target.value)} placeholder="77.95" className={input} />
          </Field>
          <Field label="Sum covered (RM)">
            <input type="number" step="0.01" value={sumCovered} onChange={(e) => setSumCovered(e.target.value)} placeholder="250000" className={input} />
          </Field>
        </div>
        <label className="mt-2.5 flex items-start gap-2.5 rounded-[10px] border border-sand-2 bg-cream px-3 py-2.5">
          <button
            type="button"
            role="switch"
            aria-checked={includesMedicalCard}
            aria-label="This certificate includes medical card cover"
            onClick={() => setIncludesMedicalCard((v) => !v)}
            className={`mt-[1px] flex h-[21px] w-[38px] flex-none items-center rounded-full px-[3px] transition-colors ${
              includesMedicalCard ? "justify-end bg-green" : "justify-start bg-sand-2"
            }`}
          >
            <span className="h-[15px] w-[15px] rounded-full bg-white" />
          </button>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-semibold text-navy">
              This certificate includes medical card cover
            </span>
            <span className="block text-[11px] font-medium text-taupe">
              Turns on the waiting periods and the Great Journey guide for this client in Servicing.
            </span>
          </span>
        </label>
      </section>

      {/* ---- Insured ---- */}
      <section className="border-t border-sand-3 pt-3.5">
        <div className="text-[13px] font-bold text-navy">Insured</div>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          <Field label="Proposer">
            <input value={proposerName} onChange={(e) => setProposerName(e.target.value)} className={input} />
          </Field>
          <Field label="Person covered">
            <input value={personCovered} onChange={(e) => setPersonCovered(e.target.value)} className={input} />
          </Field>
          <Field label="ID no">
            <input value={idNo} onChange={(e) => setIdNo(e.target.value)} placeholder="001017-10-1153" className={input} />
          </Field>
          <Field label="Date of birth">
            <input type="date" value={dob ?? ""} onChange={(e) => setDob(e.target.value)} className={input} />
          </Field>
          <Field label="Gender">
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={input}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
          <Field label="Religion">
            <input value={religion} onChange={(e) => setReligion(e.target.value)} placeholder="Muslim" className={input} />
          </Field>
          <Field label="Smoker">
            <select value={smoker} onChange={(e) => setSmoker(e.target.value)} className={input}>
              <option value="">Unknown</option>
              <option value="false">Non-smoker</option>
              <option value="true">Smoker</option>
            </select>
          </Field>
          <Field label="Occupation">
            <input value={occupation} onChange={(e) => setOccupation(e.target.value)} className={input} />
          </Field>
        </div>
      </section>

      {/* ---- Nominees ---- */}
      <section className="border-t border-sand-3 pt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[13px] font-bold text-navy">Nominees</div>
          <span
            className={`text-[11px] font-semibold ${
              nomineeTotal > 100 ? "text-alert-red" : nomineeTotal === 100 ? "text-green" : "text-taupe"
            }`}
          >
            {nomineeTotal}% allocated
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {nominees.map((n, i) => (
            <div key={i} className="grid grid-cols-[1fr_110px_74px_32px] items-center gap-2">
              <input
                value={n.name}
                onChange={(e) => updateNominee(i, { name: e.target.value })}
                placeholder="Nominee name"
                aria-label={`Nominee ${i + 1} name`}
                className={input}
              />
              <input
                value={n.relationship ?? ""}
                onChange={(e) => updateNominee(i, { relationship: e.target.value })}
                placeholder="Relationship"
                aria-label={`Nominee ${i + 1} relationship`}
                className={input}
              />
              <input
                type="number"
                step="0.01"
                value={n.percentage ?? ""}
                onChange={(e) => updateNominee(i, { percentage: numOrNull(e.target.value) })}
                placeholder="%"
                aria-label={`Nominee ${i + 1} percentage`}
                className={`${input} text-right`}
              />
              <button
                type="button"
                onClick={() => setNominees((prev) => (prev.length === 1 ? [{ ...EMPTY_NOMINEE }] : prev.filter((_, idx) => idx !== i)))}
                aria-label={`Remove nominee ${i + 1}`}
                className="flex h-[38px] w-8 items-center justify-center rounded-[9px] text-alert-red opacity-70 hover:opacity-100"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setNominees((prev) => [...prev, { ...EMPTY_NOMINEE }])}
          className="mt-2 rounded-[9px] border border-sand-2 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-navy hover:border-navy"
        >
          + Add nominee
        </button>
      </section>

      {/* ---- Benefits ---- */}
      <section className="border-t border-sand-3 pt-3.5">
        <div className="text-[13px] font-bold text-navy">Benefits</div>
        <div className="mt-2 flex flex-col gap-2.5">
          {benefits.map((b, i) => (
            <div key={i} className="rounded-[11px] border border-sand-2 bg-cream p-2.5">
              <div className="flex items-center gap-2">
                <input
                  value={b.benefit}
                  onChange={(e) => updateBenefit(i, { benefit: e.target.value })}
                  placeholder="i-GREAT NOVA"
                  aria-label={`Benefit ${i + 1} name`}
                  className={`${input} bg-white`}
                />
                <button
                  type="button"
                  onClick={() => setBenefits((prev) => (prev.length === 1 ? [{ ...EMPTY_BENEFIT }] : prev.filter((_, idx) => idx !== i)))}
                  aria-label={`Remove benefit ${i + 1}`}
                  className="flex h-[38px] w-8 flex-none items-center justify-center rounded-[9px] text-alert-red opacity-70 hover:opacity-100"
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                  </svg>
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input type="number" value={b.term ?? ""} onChange={(e) => updateBenefit(i, { term: numOrNull(e.target.value) })} placeholder="Term (yrs)" aria-label={`Benefit ${i + 1} term`} className={`${input} bg-white`} />
                <input type="number" step="0.01" value={b.sumCovered ?? ""} onChange={(e) => updateBenefit(i, { sumCovered: numOrNull(e.target.value) })} placeholder="Sum covered" aria-label={`Benefit ${i + 1} sum covered`} className={`${input} bg-white`} />
                <input type="number" step="0.01" value={b.installmentContribution ?? ""} onChange={(e) => updateBenefit(i, { installmentContribution: numOrNull(e.target.value) })} placeholder="Contribution" aria-label={`Benefit ${i + 1} contribution`} className={`${input} bg-white`} />
                <input value={b.status ?? ""} onChange={(e) => updateBenefit(i, { status: e.target.value })} placeholder="Status" aria-label={`Benefit ${i + 1} status`} className={`${input} bg-white`} />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setBenefits((prev) => [...prev, { ...EMPTY_BENEFIT }])}
          className="mt-2 rounded-[9px] border border-sand-2 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-navy hover:border-navy"
        >
          + Add benefit
        </button>
      </section>

      <Field label="Notes">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything the operator flagged, or worth remembering at underwriting."
          className="w-full resize-y rounded-[9px] border border-sand-2 bg-cream px-3 py-2.5 text-[12.5px] font-medium text-navy outline-none focus:border-gold placeholder:text-taupe"
        />
      </Field>

      {error && (
        <div className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
          {error}
        </div>
      )}

      <div className="flex gap-2.5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-[42px] flex-1 rounded-[11px] border border-sand-2 bg-white text-[13px] font-semibold text-navy"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !planName.trim()}
          className="h-[42px] flex-1 rounded-[11px] bg-navy text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : existing ? "Save changes" : "File this case"}
        </button>
      </div>
    </div>
  );
}
