"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LIMITS, type FeedbackAnswers, type FormRow } from "../../constants";
import { submitForm } from "../../actions";
import { FIELD, LABEL, PRIMARY_BTN } from "../../feedback-chips";

export function FillForm({ form, from }: { form: FormRow; from: string }) {
  const [pending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<FeedbackAnswers>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function set(id: string, value: string | string[] | number | null) {
    setAnswers((a) => {
      const next = { ...a };
      if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) delete next[id];
      else next[id] = value;
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Friendly client-side check for the controls the browser can't (checkboxes, rating).
    for (const f of form.fields) {
      if (f.required && answers[f.id] === undefined) {
        setError(`Please answer: ${f.label}`);
        return;
      }
    }
    startTransition(async () => {
      try {
        const res = await submitForm(form.id, answers, from.slice(0, LIMITS.pageUrl));
        if (res.error) setError(res.error);
        else setDone(true);
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  if (done) {
    return (
      <div className="px-5 py-10 lg:px-[30px]">
        <div className="mx-auto max-w-md rounded-2xl border border-sand bg-white p-6 text-center">
          <div className="text-[15px] font-bold text-navy">Thank you!</div>
          <p className="mt-1.5 text-[12.5px] font-medium text-muted">Your feedback has been sent.</p>
          <div className="mt-4 flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                setDone(false);
              }}
              className={PRIMARY_BTN}
            >
              Submit another
            </button>
            <Link
              href="/support/feedback"
              className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
            >
              Done
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-20 lg:static border-b border-sand bg-white/85 backdrop-blur-md px-5 py-4 lg:bg-white lg:backdrop-blur-none lg:px-[30px] lg:py-5">
        <Link href="/support/feedback" className="text-[12px] font-semibold text-taupe hover:text-navy">
          &larr; Feedback
        </Link>
        <div className="mt-1 text-2xl font-extrabold tracking-[-0.025em] text-navy">{form.title}</div>
        {form.description && (
          <div className="mt-0.5 whitespace-pre-line text-[13px] font-medium text-muted">{form.description}</div>
        )}
      </div>

      <form onSubmit={submit} className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-[22px] pb-[30px] lg:mx-0 lg:px-[30px]">
        {form.fields.map((f) => {
          const id = `fill-${f.id}`;
          const value = answers[f.id];
          const required = f.required;
          const label = (
            <span>
              {f.label}
              {required && <span className="text-alert-red"> *</span>}
            </span>
          );
          return (
            <div key={f.id}>
              {f.type === "short_text" && (
                <>
                  <label htmlFor={id} className={LABEL}>
                    {label}
                  </label>
                  <input
                    id={id}
                    required={required}
                    maxLength={LIMITS.shortText}
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => set(f.id, e.target.value)}
                    className={FIELD}
                  />
                </>
              )}
              {f.type === "long_text" && (
                <>
                  <label htmlFor={id} className={LABEL}>
                    {label}
                  </label>
                  <textarea
                    id={id}
                    required={required}
                    rows={6}
                    maxLength={LIMITS.longText}
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => set(f.id, e.target.value)}
                    className={`${FIELD} resize-y`}
                  />
                </>
              )}
              {f.type === "dropdown" && (
                <>
                  <label htmlFor={id} className={LABEL}>
                    {label}
                  </label>
                  <select
                    id={id}
                    required={required}
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => set(f.id, e.target.value)}
                    className={FIELD}
                  >
                    <option value="">Choose...</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {f.type === "checkboxes" && (
                <fieldset>
                  <legend className={LABEL}>{label}</legend>
                  <div className="flex flex-col gap-2">
                    {(f.options ?? []).map((o) => {
                      const picked = Array.isArray(value) ? value : [];
                      const checked = picked.includes(o);
                      return (
                        <label key={o} className="flex items-center gap-2.5 text-[13px] font-medium text-navy">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => set(f.id, checked ? picked.filter((p) => p !== o) : [...picked, o])}
                            className="h-4 w-4 accent-brand"
                          />
                          {o}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
              {f.type === "rating" && (
                <fieldset>
                  <legend className={LABEL}>{label}</legend>
                  <div className="flex items-center gap-1.5" role="radiogroup" aria-label={f.label}>
                    {[1, 2, 3, 4, 5].map((n) => {
                      const on = typeof value === "number" && n <= value;
                      return (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={value === n}
                          aria-label={`${n} out of 5`}
                          onClick={() => set(f.id, value === n && !required ? null : n)}
                          className={`flex h-11 w-11 items-center justify-center rounded-[10px] border text-[20px] leading-none ${
                            on ? "border-gold bg-warn-gold-bg text-gold" : "border-sand-2 bg-white text-taupe"
                          }`}
                        >
                          {on ? "★" : "☆"}
                        </button>
                      );
                    })}
                    {typeof value === "number" && (
                      <span className="ml-1 text-[12px] font-semibold text-muted">{value}/5</span>
                    )}
                  </div>
                </fieldset>
              )}
            </div>
          );
        })}

        {error && (
          <div role="alert" className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-alert-red">
            {error}
          </div>
        )}

        <div>
          <button type="submit" disabled={pending} className={`${PRIMARY_BTN} px-5`}>
            {pending ? "Sending..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
