"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_FREQUENCIES, type PaymentFrequency } from "@/lib/contribution-schedule";
import { waLink } from "@/lib/whatsapp";
import {
  PLAN_GROUPS,
  PLAN_OTHER,
  PLAN_CATEGORIES,
  PLAN_CATEGORY_LABEL,
  cleanCategories,
  defaultCategoriesFor,
  isKnownPlan,
  BENEFIT_STATUSES,
  type PlanCategoryKey,
} from "@/lib/plan-catalogue";
import { saveCase } from "./actions";
import { useSpecimen } from "./use-specimen";
import {
  BENEFIT_OTHER,
  type BenefitOption,
  type CaseSubmission,
  type CaseNominee,
  type CaseBenefit,
} from "./types";

export type CaseFormLead = {
  id: string;
  fullName: string;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  isSmoker?: boolean | null;
  occupation?: string | null;
  interest?: string | null;
};

// Split so the nominee row can set its own widths: `w-full` and `w-[110px]`
// are the same specificity, so appending one to the other leaves which wins up
// to stylesheet order.
const inputBase =
  "h-[38px] rounded-[9px] border border-sand-2 bg-cream px-3 text-[12.5px] font-medium text-navy outline-none focus:border-gold";
const input = `${inputBase} w-full`;

function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">{label}</span>
      <div className="mt-[5px]">{children}</div>
      {hint && <p className="mt-1 text-[10.5px] font-medium text-taupe">{hint}</p>}
    </label>
  );
}

/**
 * A labelled cell for the rows that repeat -- nominees and benefits.
 *
 * These fields used to carry only a placeholder, which disappears the moment
 * anything is typed: an agent coming back to a half-filled row had nothing
 * telling them which box was the allocation and which was the phone. The
 * label stays.
 */
function Cell({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-[3px] block text-[9.5px] font-bold uppercase tracking-[0.07em] text-taupe-2">
        {label}
      </span>
      {children}
    </label>
  );
}

function numOrNull(v: string) {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// The religions actually seen on this book, so an agent picks rather than
// retypes -- and so the same faith is never spelled two different ways
// across two certificates. "Other" opens a free-text box for anyone outside
// the list, the same pattern the benefit dropdown below already uses.
const RELIGION_OPTIONS = ["Islam", "Buddhist", "Christian", "Hindu", "Sikh"] as const;
const RELIGION_OTHER = "Other";

const EMPTY_NOMINEE: CaseNominee = { name: "", relationship: "", phone: "", percentage: null };
const EMPTY_BENEFIT: CaseBenefit = {
  benefit: "",
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
  benefitOptions,
  casesByIdNo,
  onDone,
  onCancel,
}: {
  lead: CaseFormLead;
  existing?: CaseSubmission | null;
  /** The catalogue maintained in Settings. Empty leaves only "Others". */
  benefitOptions: BenefitOption[];
  /** NRIC -> every already-filed case sharing it. Optional: only the "file a
   *  new case" screen has this list on hand; editing an existing case skips
   *  the hint rather than requiring every call site to supply it. */
  casesByIdNo?: Map<string, { name: string; certificateNo: string | null; planName: string }[]>;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const eg = useSpecimen();
  const [planName, setPlanName] = useState(existing?.planName ?? lead.interest ?? "");
  // No longer collected on this form -- kept as a pass-through rather than a
  // state so a case that already has one doesn't lose it on the next save,
  // even though there is no box here to change it.
  const planType = existing?.planType ?? null;
  const [planCategories, setPlanCategories] = useState<PlanCategoryKey[]>(existing?.planCategories ?? []);

  // Which entry in the dropdown is selected, as opposed to the name that gets
  // saved. An existing case whose plan is not on the list lands on "Others"
  // with its original name intact in the box beneath.
  const [planChoice, setPlanChoice] = useState(() => {
    const current = existing?.planName ?? lead.interest ?? "";
    if (!current) return "";
    return isKnownPlan(current) ? current.trim() : PLAN_OTHER;
  });

  function choosePlan(choice: string) {
    setPlanChoice(choice);
    if (choice === PLAN_OTHER) {
      // Keep whatever was already typed; "Others" only opens the box.
      return;
    }
    setPlanName(choice);
    // The product suggests what this case is. Only ever adds -- a tag the
    // agent ticked by hand is never taken away by changing the plan.
    const suggested = defaultCategoriesFor(choice);
    if (suggested.length > 0) {
      setPlanCategories((current) => cleanCategories([...current, ...suggested]));
    }
  }

  function toggleCategory(key: PlanCategoryKey) {
    setPlanCategories((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : cleanCategories([...current, key]),
    );
  }
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
  // The client portal logs in against this, so it is collected on the case
  // and written back to the lead on save rather than left to whoever
  // happened to fill in the lead form.
  const [clientEmail, setClientEmail] = useState(lead.email ?? "");
  const idNoMatches = useMemo(() => casesByIdNo?.get(idNo.trim()) ?? [], [casesByIdNo, idNo]);
  const [gender, setGender] = useState(existing?.gender ?? lead.gender ?? "");
  const [dob, setDob] = useState(existing?.dateOfBirth ?? lead.dateOfBirth ?? "");
  // Which option the religion dropdown is on. Derived from the stored value:
  // a saved religion that isn't on the list must have been typed in as
  // "Other", and has to come back that way rather than looking unset. A
  // brand-new case has no value to derive from, and the great majority of
  // this book is Muslim, so it starts there rather than on a blank field
  // every case would otherwise need touching.
  const [religionPick, setReligionPick] = useState<string>(() => {
    const r = existing?.religion;
    if (!r) return "Islam";
    return (RELIGION_OPTIONS as readonly string[]).includes(r) ? r : RELIGION_OTHER;
  });
  const [religion, setReligion] = useState(existing?.religion ?? "Islam");

  function pickReligion(choice: string) {
    setReligionPick(choice);
    // A preset fills the value outright; "Other" clears it so the free-text
    // box starts empty rather than carrying the previous pick's name.
    setReligion(choice === RELIGION_OTHER ? "" : choice);
  }

  const [smoker, setSmoker] = useState<string>(
    existing?.isSmoker != null
      ? String(existing.isSmoker)
      : lead.isSmoker != null
        ? String(lead.isSmoker)
        // Most leads reaching this form aren't smokers, so that is the
        // default rather than an unset "Unknown" every case would need to
        // deliberately confirm.
        : "false",
  );
  const [occupation, setOccupation] = useState(existing?.occupation ?? lead.occupation ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const [nominees, setNominees] = useState<CaseNominee[]>(
    existing?.nominees?.length ? existing.nominees : [{ ...EMPTY_NOMINEE }],
  );
  const [benefits, setBenefits] = useState<CaseBenefit[]>(
    existing?.benefits?.length ? existing.benefits : [{ ...EMPTY_BENEFIT }],
  );
  // Which option each row's dropdown is on. Derived from the stored name when
  // editing: a saved benefit that isn't on the list must have been "Others",
  // and has to come back that way rather than looking unset.
  const [benefitPicks, setBenefitPicks] = useState<string[]>(() => {
    const names = benefitOptions.map((o) => o.name);
    return (existing?.benefits?.length ? existing.benefits : [{ ...EMPTY_BENEFIT }]).map((b) =>
      !b.benefit ? "" : names.includes(b.benefit) ? b.benefit : BENEFIT_OTHER,
    );
  });

  function pickBenefit(i: number, choice: string) {
    setBenefitPicks((prev) => prev.map((p, idx) => (idx === i ? choice : p)));
    if (choice === BENEFIT_OTHER || choice === "") {
      // "Others" clears the name so the free-text box starts empty rather than
      // carrying the previous pick's.
      updateBenefit(i, { benefit: "" });
      return;
    }
    // A catalogue benefit fills its name and, where Settings set one, its
    // standard sum covered -- but never over a figure already typed, since the
    // certificate in hand beats the catalogue default.
    const option = benefitOptions.find((o) => o.name === choice);
    updateBenefit(i, {
      benefit: choice,
      ...(option?.defaultSumCovered != null && benefits[i]?.sumCovered == null
        ? { sumCovered: option.defaultSumCovered }
        : {}),
    });
  }

  function removeBenefit(i: number) {
    const last = benefits.length === 1;
    setBenefits((prev) => (last ? [{ ...EMPTY_BENEFIT }] : prev.filter((_, idx) => idx !== i)));
    setBenefitPicks((prev) => (last ? [""] : prev.filter((_, idx) => idx !== i)));
  }

  function addBenefit() {
    setBenefits((prev) => [...prev, { ...EMPTY_BENEFIT }]);
    setBenefitPicks((prev) => [...prev, ""]);
  }

  function descriptionFor(pick: string | undefined) {
    if (!pick || pick === BENEFIT_OTHER) return null;
    return benefitOptions.find((o) => o.name === pick)?.description ?? null;
  }

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
          planCategories,
          paymentFrequency,
          paymentMethod,
          installmentContribution: numOrNull(installment),
          sumCovered: numOrNull(sumCovered),
          proposerName,
          personCoveredName: personCovered,
          idNo,
          clientEmail,
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
            <select value={planChoice} onChange={(e) => choosePlan(e.target.value)} aria-label="Plan name" className={input}>
              <option value="">—</option>
              {PLAN_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.plans.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </optgroup>
              ))}
              <option value={PLAN_OTHER}>{PLAN_OTHER}</option>
            </select>
            {/* Cases filed before this dropdown existed carry free text, and
                the operator adds products faster than this ships -- so
                "Others" keeps a box to type into rather than forcing a
                rename onto whoever opens an old case. */}
            {planChoice === PLAN_OTHER && (
              <input
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder={eg.planName}
                aria-label="Plan name (specify)"
                className={`mt-2 ${input}`}
              />
            )}
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
            <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder={eg.paymentMethod} className={input} />
          </Field>
          <Field label="Installment contribution (RM)">
            <input type="number" step="0.01" value={installment} onChange={(e) => setInstallment(e.target.value)} placeholder={eg.installment} className={input} />
          </Field>
          <Field label="Sum covered (RM)">
            <input type="number" step="0.01" value={sumCovered} onChange={(e) => setSumCovered(e.target.value)} placeholder={eg.sumCovered} className={input} />
          </Field>
        </div>
        {/* Several, not one: a hibah plan with a medical rider is both, and
            the old single toggle could only ever say one of them. Picking a
            plan pre-selects its usual tags; these are what actually get
            read downstream. */}
        <div className="mt-2.5 rounded-[10px] border border-sand-2 bg-cream px-3 py-2.5">
          <div className="text-[12.5px] font-semibold text-navy">What this certificate covers</div>
          <div className="mt-0.5 text-[11px] font-medium text-taupe">
            Pick every kind that applies. Medical Card turns on the waiting periods and the Great Journey guide for
            this client in Servicing and in their portal.
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PLAN_CATEGORIES.map((key) => {
              const on = planCategories.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCategory(key)}
                  className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${
                    on ? "bg-navy text-white" : "border border-sand-2 bg-white text-navy hover:border-navy"
                  }`}
                >
                  {PLAN_CATEGORY_LABEL[key]}
                </button>
              );
            })}
          </div>
        </div>
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
          <Field label="ID no (required)" hint="The client portal identifies a client by their NRIC.">
            <input
              value={idNo}
              onChange={(e) => setIdNo(e.target.value)}
              placeholder={eg.idNo}
              required
              aria-required="true"
              className={`${input} ${idNo.trim() ? "" : "border-alert-red"}`}
            />
            {/* Same NRIC already on file, under a different case: worth
                surfacing while the agent is still typing, not after the fact
                -- this is the same grouping the client portal itself uses. */}
            {idNoMatches.length > 0 && (
              <p className="mt-1 text-[10.5px] font-medium text-warn-gold-text">
                Already on file: {idNoMatches.map((m) => m.certificateNo ?? m.planName).join(", ")} ({idNoMatches[0].name})
              </p>
            )}
          </Field>
          <Field
            label="Client email (required)"
            hint="Saved back to the lead. The client portal logs in against it."
            className="sm:col-span-2"
          >
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="nama@email.com"
              required
              aria-required="true"
              className={`${input} ${clientEmail.trim() ? "" : "border-alert-red"}`}
            />
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
            {/* An explicit label of its own -- once "Religion (specify)"
                below can appear, that field's name also contains the word
                "Religion", and the two need to stay tellable apart. */}
            <select
              value={religionPick}
              onChange={(e) => pickReligion(e.target.value)}
              aria-label="Religion"
              className={input}
            >
              {RELIGION_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
              <option value={RELIGION_OTHER}>{RELIGION_OTHER}</option>
            </select>
          </Field>
          {religionPick === RELIGION_OTHER && (
            <Field label="Religion (specify)" className="sm:col-span-2">
              <input
                value={religion}
                onChange={(e) => setReligion(e.target.value)}
                placeholder="e.g. Taoism"
                aria-label="Religion (specify)"
                className={input}
              />
            </Field>
          )}
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
          {/* One card per nominee, each box labelled. Wraps rather than a fixed
              grid: six controls in a row fit the modal on a desktop and would
              run off the side of a phone. */}
          {nominees.map((n, i) => (
            <div key={i} className="rounded-[11px] border border-sand-2 bg-cream p-2.5">
              <div className="flex flex-wrap items-end gap-2">
              <Cell label="Nominee name" className="min-w-[150px] flex-1">
              <input
                value={n.name}
                onChange={(e) => updateNominee(i, { name: e.target.value })}
                placeholder={eg.nomineeName}
                aria-label={`Nominee ${i + 1} name`}
                className={`${inputBase} w-full bg-white`}
              />
              </Cell>
              <Cell label="Relationship" className="w-[104px]">
              <input
                value={n.relationship ?? ""}
                onChange={(e) => updateNominee(i, { relationship: e.target.value })}
                placeholder={eg.relationship}
                aria-label={`Nominee ${i + 1} relationship`}
                className={`${inputBase} w-full bg-white`}
              />
              </Cell>
              <Cell label="Allocation %" className="w-[92px]">
              <input
                type="number"
                step="0.01"
                value={n.percentage ?? ""}
                onChange={(e) => updateNominee(i, { percentage: numOrNull(e.target.value) })}
                placeholder="%"
                aria-label={`Nominee ${i + 1} percentage`}
                className={`${inputBase} w-full bg-white text-right`}
              />
              </Cell>
              <Cell label="Phone number" className="w-[124px]">
              <input
                type="tel"
                inputMode="tel"
                value={n.phone ?? ""}
                onChange={(e) => updateNominee(i, { phone: e.target.value })}
                placeholder={eg.phone}
                aria-label={`Nominee ${i + 1} phone`}
                className={`${inputBase} w-full bg-white`}
              />
              </Cell>
              {/* A link only once there is a number to open: a WhatsApp button
                  that opens an empty chat is worse than one that waits. */}
              {n.phone?.trim() ? (
                <a
                  href={waLink(n.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`WhatsApp nominee ${i + 1}`}
                  title={`WhatsApp ${n.name || "this nominee"}`}
                  className="mb-[1px] flex h-[38px] w-9 flex-none items-center justify-center rounded-[9px] bg-green text-white"
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.41-.56-.42h-.47c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.74 2.66 4.22 3.73.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
                  </svg>
                </a>
              ) : (
                <span
                  aria-hidden="true"
                  title="Add a phone number to message this nominee"
                  className="mb-[1px] flex h-[38px] w-9 flex-none items-center justify-center rounded-[9px] border border-sand-2 bg-white text-taupe-2"
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" opacity={0.45} aria-hidden="true">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Z" />
                  </svg>
                </span>
              )}
              <button
                type="button"
                onClick={() => setNominees((prev) => (prev.length === 1 ? [{ ...EMPTY_NOMINEE }] : prev.filter((_, idx) => idx !== i)))}
                aria-label={`Remove nominee ${i + 1}`}
                className="mb-[1px] flex h-[38px] w-8 flex-none items-center justify-center rounded-[9px] text-alert-red opacity-70 hover:opacity-100"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                </svg>
              </button>
              </div>
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
              <div className="flex items-end gap-2">
                {/* Picked, not typed: the name has to match the operator's
                    exactly, and "Others" covers anything off-list. */}
                <Cell label="Benefit" className="min-w-0 flex-1">
                <select
                  value={benefitPicks[i] ?? ""}
                  onChange={(e) => pickBenefit(i, e.target.value)}
                  aria-label={`Benefit ${i + 1}`}
                  className={`${input} bg-white`}
                >
                  <option value="">Choose a benefit…</option>
                  {benefitOptions.map((o) => (
                    <option key={o.id} value={o.name}>{o.name}</option>
                  ))}
                  <option value={BENEFIT_OTHER}>{BENEFIT_OTHER}</option>
                </select>
                </Cell>
                <button
                  type="button"
                  onClick={() => removeBenefit(i)}
                  aria-label={`Remove benefit ${i + 1}`}
                  className="mb-[1px] flex h-[38px] w-8 flex-none items-center justify-center rounded-[9px] text-alert-red opacity-70 hover:opacity-100"
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                  </svg>
                </button>
              </div>
              {benefitPicks[i] === BENEFIT_OTHER && (
                <Cell label="Benefit name" className="mt-2">
                  <input
                    value={b.benefit}
                    onChange={(e) => updateBenefit(i, { benefit: e.target.value })}
                    placeholder="Type the name exactly as the operator prints it"
                    aria-label={`Benefit ${i + 1} name`}
                    className={`${input} bg-white`}
                  />
                </Cell>
              )}
              {/* Whatever Settings recorded about this benefit, shown where the
                  agent is deciding rather than in a document they'd have to go
                  and find. */}
              {descriptionFor(benefitPicks[i]) && (
                <p className="mt-1.5 text-[11px] font-medium text-taupe">{descriptionFor(benefitPicks[i])}</p>
              )}
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Cell label="Sum covered (RM)">
                  <input type="number" step="0.01" value={b.sumCovered ?? ""} onChange={(e) => updateBenefit(i, { sumCovered: numOrNull(e.target.value) })} placeholder={eg.benefitSum} aria-label={`Benefit ${i + 1} sum covered`} className={`${input} bg-white`} />
                </Cell>
                <Cell label="Contribution (RM)">
                  <input type="number" step="0.01" value={b.installmentContribution ?? ""} onChange={(e) => updateBenefit(i, { installmentContribution: numOrNull(e.target.value) })} placeholder={eg.benefitContribution} aria-label={`Benefit ${i + 1} contribution`} className={`${input} bg-white`} />
                </Cell>
                <Cell label="Status">
                  <select
                    value={b.status ?? BENEFIT_STATUSES[0]}
                    onChange={(e) => updateBenefit(i, { status: e.target.value })}
                    aria-label={`Benefit ${i + 1} status`}
                    className={`${input} bg-white`}
                  >
                    {BENEFIT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Cell>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addBenefit}
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
          disabled={pending || !planName.trim() || !idNo.trim() || !(clientEmail.trim() || lead.email)}
          className="h-[42px] flex-1 rounded-[11px] bg-navy text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : existing ? "Save changes" : "File this case"}
        </button>
      </div>
    </div>
  );
}
