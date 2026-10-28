"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  EMPTY_NOMINEE,
  FORM_STAGES,
  MAX_NOMINEES,
  NOMINEE_RELATIONSHIPS,
  getFormSections,
  isFieldVisible,
  validateFormValues,
  validateNominees,
  type FieldErrors,
  type FormField,
  type FormValues,
  type NomineeInput,
  type PublicFormData,
} from "@/lib/lead-form-fields";
import { saveDraft, submitForm } from "./actions";
import { CHECK_ICON, FormCardPage, FormHeader, FormIcon } from "./form-header";
import { SignaturePad } from "./signature-pad";

const AUTOSAVE_MS = 2500;

const INPUT =
  "mt-1.5 w-full rounded-[10px] border bg-cream px-3.5 text-[13px] font-medium text-navy outline-none focus:border-gold focus-visible:ring-2 focus-visible:ring-gold/40 read-only:bg-sand-3 read-only:text-taupe-2";
const LABEL = "text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2";
const BTN_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

const borderFor = (invalid: boolean) => (invalid ? "border-alert-red" : "border-sand-2");

type SaveStatus = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: string } | { kind: "error"; message: string };

function Required() {
  return (
    <span className="text-alert-red">
      <span aria-hidden="true"> *</span>
      <span className="sr-only"> (required)</span>
    </span>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-[11px] font-semibold text-alert-red">
      {message}
    </p>
  );
}

/** One definition-driven field: label tied to its control, hint and error wired via aria. */
function FieldControl({
  field,
  value,
  error,
  today,
  onChange,
}: {
  field: FormField;
  value: string;
  error?: string;
  today: string;
  onChange: (value: string) => void;
}) {
  const id = `f-${field.key}`;
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const describedBy = [field.hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  const invalid = !!error;

  if (field.type === "radio") {
    return (
      <fieldset aria-describedby={describedBy} className="min-w-0">
        <legend className={LABEL}>
          {field.label}
          {field.required && <Required />}
        </legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {field.options?.map((o) => {
            const checked = value === o.value;
            return (
              <label
                key={o.value}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border px-3.5 text-[13px] font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold/40 ${
                  checked ? "border-gold bg-white text-navy" : `${borderFor(invalid)} bg-cream text-ink`
                }`}
              >
                <input
                  type="radio"
                  id={o.value === field.options?.[0].value ? id : undefined}
                  name={field.key}
                  value={o.value}
                  checked={checked}
                  onChange={() => onChange(o.value)}
                  className="h-4 w-4 accent-brand"
                />
                {o.label}
              </label>
            );
          })}
        </div>
        {field.hint && <p id={hintId} className="mt-1 text-[10.5px] font-medium text-taupe">{field.hint}</p>}
        <FieldError id={errId} message={error} />
      </fieldset>
    );
  }

  const common = {
    id,
    name: field.key,
    value,
    required: field.required && !field.readOnly,
    readOnly: field.readOnly,
    "aria-invalid": invalid ? true : undefined,
    "aria-describedby": describedBy,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(e.target.value),
  };

  return (
    <div className="min-w-0">
      <label htmlFor={id} className={LABEL}>
        {field.label}
        {field.required && !field.readOnly && <Required />}
        {field.readOnly && <span className="ml-1 normal-case tracking-normal text-taupe">(from your agent)</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea {...common} rows={3} maxLength={field.maxLength} placeholder={field.placeholder} className={`${INPUT} ${borderFor(invalid)} py-2.5`} />
      ) : field.type === "select" ? (
        <select {...common} className={`${INPUT} ${borderFor(invalid)} h-11`}>
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...common}
          type={field.type}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          // A date can't be in the future; the number bounds come from the definition.
          max={field.type === "date" ? today : field.max}
          min={field.min}
          inputMode={field.key.includes("postcode") ? "numeric" : field.type === "number" ? "decimal" : undefined}
          autoComplete={AUTOCOMPLETE[field.key]}
          className={`${INPUT} ${borderFor(invalid)} h-11`}
        />
      )}
      {field.hint && <p id={hintId} className="mt-1 text-[10.5px] font-medium text-taupe">{field.hint}</p>}
      <FieldError id={errId} message={error} />
    </div>
  );
}

const AUTOCOMPLETE: Record<string, string> = {
  full_name: "name",
  phone: "tel",
  email: "email",
  date_of_birth: "bday",
  address: "street-address",
  city: "address-level2",
  postcode: "postal-code",
  state: "address-level1",
};

function NomineeCard({
  index,
  nominee,
  errors,
  today,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  nominee: NomineeInput;
  errors: FieldErrors;
  today: string;
  canRemove: boolean;
  onChange: (patch: Partial<NomineeInput>) => void;
  onRemove: () => void;
}) {
  const err = (field: string) => errors[`nominees.${index}.${field}`];
  const cell = (field: keyof NomineeInput, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, required = true) => {
    const id = `n-${index}-${field}`;
    const message = err(field);
    return (
      <div className="min-w-0">
        <label htmlFor={id} className={LABEL}>
          {label}
          {required && <Required />}
        </label>
        <input
          id={id}
          value={nominee[field] ?? ""}
          onChange={(e) => onChange({ [field]: e.target.value })}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-err` : undefined}
          className={`${INPUT} ${borderFor(!!message)} h-11`}
          {...extra}
        />
        <FieldError id={`${id}-err`} message={message} />
      </div>
    );
  };
  const relId = `n-${index}-relationship`;

  return (
    <fieldset className="rounded-[14px] border border-sand bg-white p-4">
      <legend className="px-1 text-[12px] font-bold text-navy">Nominee {index + 1}</legend>
      <div className="flex flex-col gap-3.5">
        {cell("name", "Full name", { maxLength: 120, autoComplete: "off" })}
        {cell("id_no", "NRIC / ID number", { maxLength: 20, autoComplete: "off", placeholder: "e.g. 900101-14-5678" })}
        <div className="min-w-0">
          <label htmlFor={relId} className={LABEL}>
            Relationship
            <Required />
          </label>
          <select
            id={relId}
            value={nominee.relationship}
            onChange={(e) => onChange({ relationship: e.target.value })}
            aria-invalid={err("relationship") ? true : undefined}
            aria-describedby={err("relationship") ? `${relId}-err` : undefined}
            className={`${INPUT} ${borderFor(!!err("relationship"))} h-11`}
          >
            <option value="">Select…</option>
            {NOMINEE_RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <FieldError id={`${relId}-err`} message={err("relationship")} />
        </div>
        {cell("phone", "Phone number", { type: "tel", inputMode: "tel", autoComplete: "off" })}
        {cell("date_of_birth", "Date of birth", { type: "date", max: today }, false)}
        {cell("share_percent", "Share (%)", { type: "number", inputMode: "decimal", min: 0, max: 100, step: "any" })}
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={`press mt-3.5 min-h-10 rounded-full border border-[#f0cdc9] bg-alert-red-bg px-4 text-[11.5px] font-bold text-alert-red ${BTN_FOCUS}`}
        >
          Remove nominee {index + 1}
        </button>
      )}
    </fieldset>
  );
}

/** Keys that identify an input in the page, so the error summary can focus it. */
function focusIdFor(key: string): string {
  if (key === "consent" || key === "signature" || key === "nominees") return key === "nominees" ? "nominees-section" : `f-${key}`;
  const nominee = /^nominees\.(\d+)\.(.+)$/.exec(key);
  if (nominee) return `n-${nominee[1]}-${nominee[2]}`;
  return `f-${key}`;
}

export function FormView({ token, form, today, expiresLabel }: { token: string; form: PublicFormData; today: string; expiresLabel: string }) {
  const stage = form.stage;
  const stageInfo = FORM_STAGES[stage];
  const sections = getFormSections(stage);

  const [values, setValues] = useState<FormValues>(form.values);
  // Stage 2 always starts with one nominee card; the server may hand back a saved list.
  const [nominees, setNominees] = useState<NomineeInput[]>(
    stage === 2 ? (form.nominees.length > 0 ? form.nominees : [{ ...EMPTY_NOMINEE, share_percent: "100" }]) : [],
  );
  const [signature, setSignature] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveStatus>({ kind: "idle" });
  const [dirty, setDirty] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const summaryRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const uid = useId();

  const total = nominees.reduce((sum, n) => sum + (Number(n.share_percent) || 0), 0);
  const totalRounded = Math.round(total * 100) / 100;

  function setValue(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? omit(e, key) : e));
    setDirty(true);
  }

  function patchNominee(i: number, patch: Partial<NomineeInput>) {
    setNominees((list) => list.map((n, idx) => (idx === i ? { ...n, ...patch } : n)));
    setErrors((e) => {
      const keys = Object.keys(patch).map((f) => `nominees.${i}.${f}`);
      return keys.some((k) => e[k]) || e.nominees ? omit(e, ...keys, "nominees") : e;
    });
    setDirty(true);
  }

  function addNominee() {
    setNominees((list) => (list.length >= MAX_NOMINEES ? list : [...list, { ...EMPTY_NOMINEE }]));
    setDirty(true);
  }

  function removeNominee(i: number) {
    setNominees((list) => list.filter((_, idx) => idx !== i));
    // Indexes shift, so per-card errors no longer line up.
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith("nominees"))));
    setDirty(true);
  }

  async function persist() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSave({ kind: "saving" });
    const result = await saveDraft(token, { values: editableValues(), nominees: stage === 2 ? nominees : undefined });
    savingRef.current = false;
    if (result.error) setSave({ kind: "error", message: result.error });
    else setSave({ kind: "saved", at: (result.savedAt ? new Date(result.savedAt) : new Date()).toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit" }) });
  }

  // Name and phone are read-only here and ignored by the server; don't send them.
  function editableValues(): FormValues {
    const skip = new Set(sections.flatMap((s) => s.fields).filter((f) => f.readOnly).map((f) => f.key));
    return Object.fromEntries(Object.entries(values).filter(([k]) => !skip.has(k)));
  }

  // Debounced autosave: waits for a pause in typing, then saves quietly.
  useEffect(() => {
    if (!dirty || done) return;
    const timer = setTimeout(() => {
      setDirty(false);
      void persist();
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
    // persist closes over the latest values/nominees, which are in the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, values, nominees, done]);

  function saveNow() {
    setDirty(false);
    void persist();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const found: FieldErrors = { ...validateFormValues(stage, values, today) };
    if (stage === 2) {
      Object.assign(found, validateNominees(nominees, today));
      if (!signature) found.signature = "Please sign in the box.";
      if (!consent) found.consent = "Please tick the box to confirm you agree.";
    }
    if (Object.keys(found).length > 0) return showErrors(found);

    startSubmit(async () => {
      const result = await submitForm(token, {
        values: editableValues(),
        nominees: stage === 2 ? nominees : undefined,
        signature: stage === 2 ? (signature ?? undefined) : undefined,
        consent: stage === 2 ? consent : undefined,
      });
      if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
        showErrors(result.fieldErrors, result.error);
      } else if (result.error) {
        showErrors({}, result.error);
      } else {
        setDone(true);
        window.scrollTo({ top: 0 });
      }
    });
  }

  function showErrors(next: FieldErrors, message?: string | null) {
    setErrors(next);
    setFormError(message ?? null);
    // Wait a tick so the summary is in the DOM before moving focus to it.
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  function focusField(key: string) {
    const el = document.getElementById(focusIdFor(key));
    if (el) {
      el.scrollIntoView({ block: "center" });
      el.focus({ preventScroll: true });
    }
  }

  if (done) {
    return (
      <FormCardPage footnote="You can close this page now.">
        <FormIcon tone="ok">{CHECK_ICON}</FormIcon>
        <h1 className="mt-4 text-[18px] font-bold leading-tight tracking-[-0.02em] text-navy">Thank you</h1>
        <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-ink">
          Thank you — your agent has been notified{form.agentName ? `, ${form.agentName}` : ""}. They will be in touch with you soon.
        </p>
      </FormCardPage>
    );
  }

  const errorEntries = Object.entries(errors);

  return (
    <div className="min-h-screen bg-cream">
      <FormHeader />
      <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-6">
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-taupe-2">Step {stage} of 2</p>
          <h1 className="mt-1 text-[20px] font-bold leading-tight tracking-[-0.02em] text-navy">{stageInfo.label}</h1>
          <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-ink">{stageInfo.description}.</p>
          {form.agentName && <p className="mt-1 text-[11.5px] font-medium text-taupe">Sent by your agent, {form.agentName}.</p>}
          <p className="mt-3 rounded-[10px] bg-sand-3 px-3.5 py-2.5 text-[11.5px] font-medium leading-relaxed text-ink">
            {form.resumed ? "Welcome back. Your saved progress has been filled in. " : ""}
            You can save and come back later using this same link until {expiresLabel}. Fields marked <span className="text-alert-red">*</span> are required.
          </p>
        </div>

        {errorEntries.length > 0 || formError ? (
          <div
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            className="mb-5 rounded-[12px] border border-[#f0cdc9] bg-alert-red-bg px-4 py-3 text-[12px] text-alert-red outline-none focus-visible:ring-2 focus-visible:ring-alert-red/40"
          >
            <p className="font-bold">{formError ?? `Please fix ${errorEntries.length} ${errorEntries.length === 1 ? "problem" : "problems"} before submitting.`}</p>
            {errorEntries.length > 0 && (
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4 font-semibold">
                {errorEntries.map(([key, message]) => (
                  <li key={key}>
                    <button type="button" onClick={() => focusField(key)} className="text-left underline underline-offset-2">
                      {message}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          {sections.map((section) => {
            const visible = section.fields.filter((f) => isFieldVisible(f, values));
            if (visible.length === 0) return null;
            return (
              <section key={section.title} aria-labelledby={`${uid}-${section.title}`} className="rounded-[20px] border border-sand bg-white p-5 shadow-card">
                <h2 id={`${uid}-${section.title}`} className="text-[14px] font-bold tracking-[-0.01em] text-navy">
                  {section.title}
                </h2>
                <div className="mt-4 flex flex-col gap-4">
                  {visible.map((field) => (
                    <FieldControl
                      key={field.key}
                      field={field}
                      value={values[field.key] ?? ""}
                      error={errors[field.key]}
                      today={today}
                      onChange={(v) => setValue(field.key, v)}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {stage === 2 && (
            <>
              <section id="nominees-section" tabIndex={-1} aria-labelledby={`${uid}-nominees`} className="rounded-[20px] border border-sand bg-white p-5 shadow-card outline-none">
                <h2 id={`${uid}-nominees`} className="text-[14px] font-bold tracking-[-0.01em] text-navy">
                  Nominees
                </h2>
                <p className="mt-1 text-[11.5px] font-medium leading-relaxed text-taupe">
                  Add up to {MAX_NOMINEES} people who will receive the benefit. Their shares must add up to 100%.
                </p>
                <div className="mt-4 flex flex-col gap-3.5">
                  {nominees.map((n, i) => (
                    <NomineeCard
                      key={i}
                      index={i}
                      nominee={n}
                      errors={errors}
                      today={today}
                      canRemove={i > 0}
                      onChange={(patch) => patchNominee(i, patch)}
                      onRemove={() => removeNominee(i)}
                    />
                  ))}
                </div>
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
                  <p
                    aria-live="polite"
                    className={`text-[12px] font-bold ${Math.abs(total - 100) < 0.001 ? "text-navy" : "text-alert-red"}`}
                  >
                    Total share: {totalRounded}% {Math.abs(total - 100) < 0.001 ? "(OK)" : "(must be 100%)"}
                  </p>
                  {nominees.length < MAX_NOMINEES && (
                    <button
                      type="button"
                      onClick={addNominee}
                      className={`press min-h-10 rounded-full border border-sand-2 bg-white px-4 text-[12px] font-bold text-navy ${BTN_FOCUS}`}
                    >
                      + Add nominee
                    </button>
                  )}
                </div>
                <FieldError id="nominees-err" message={errors.nominees} />
              </section>

              <section aria-labelledby={`${uid}-sign`} className="rounded-[20px] border border-sand bg-white p-5 shadow-card">
                <h2 id={`${uid}-sign`} className="text-[14px] font-bold tracking-[-0.01em] text-navy">
                  Signature
                  <Required />
                </h2>
                <p className="mt-1 mb-3 text-[11.5px] font-medium leading-relaxed text-taupe">Sign with your finger or mouse.</p>
                <SignaturePad
                  id="f-signature"
                  invalid={!!errors.signature}
                  describedBy={errors.signature ? "signature-err" : undefined}
                  onChange={(dataUrl) => {
                    setSignature(dataUrl);
                    if (dataUrl) setErrors((e) => (e.signature ? omit(e, "signature") : e));
                  }}
                />
                <FieldError id="signature-err" message={errors.signature} />

                <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[12px] font-medium leading-relaxed text-ink">
                  <input
                    id="f-consent"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (e.target.checked) setErrors((er) => (er.consent ? omit(er, "consent") : er));
                    }}
                    aria-invalid={errors.consent ? true : undefined}
                    aria-describedby={errors.consent ? "consent-err" : undefined}
                    className="mt-0.5 h-5 w-5 flex-none accent-brand"
                  />
                  <span>
                    I confirm the information above is true and correct, and I agree to use this electronic signature for my application.
                    <Required />
                  </span>
                </label>
                <FieldError id="consent-err" message={errors.consent} />
              </section>
            </>
          )}

          <div className="rounded-[20px] border border-sand bg-white p-5 shadow-card">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={saveNow}
                disabled={save.kind === "saving" || submitting}
                className={`press min-h-12 flex-1 rounded-[12px] border border-sand-2 bg-white text-[13px] font-bold text-navy disabled:opacity-50 ${BTN_FOCUS}`}
              >
                Save &amp; continue later
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`press min-h-12 flex-1 rounded-[12px] bg-brand text-[13.5px] font-bold text-white disabled:opacity-50 ${BTN_FOCUS}`}
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
            <p aria-live="polite" className={`mt-3 text-[11.5px] font-semibold ${save.kind === "error" ? "text-alert-red" : "text-taupe"}`}>
              {save.kind === "saving" && "Saving…"}
              {save.kind === "saved" && `Saved at ${save.at}. You can reopen this same link until ${expiresLabel} to carry on.`}
              {save.kind === "error" && save.message}
              {save.kind === "idle" && "Your progress is saved automatically as you type."}
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}

function omit(obj: FieldErrors, ...keys: string[]): FieldErrors {
  const copy = { ...obj };
  for (const k of keys) delete copy[k];
  return copy;
}
