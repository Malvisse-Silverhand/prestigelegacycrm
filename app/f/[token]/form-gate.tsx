"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FORM_STAGES, type FormStage } from "@/lib/lead-form-fields";
import { verifyIdentity } from "./actions";
import { FormCardPage, FormIcon, LOCK_ICON } from "./form-header";

const INPUT =
  "mt-1.5 h-11 w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-medium text-navy outline-none focus:border-gold focus-visible:ring-2 focus-visible:ring-gold/40";
const LABEL = "text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2";

/**
 * Stage 2 identity check. The application carries an NRIC, bank details and a
 * signature, so a forwarded link alone must not open it: the visitor proves
 * they are the lead by typing the name and phone the agent has on file.
 * Nothing about the lead is shown until the Server Action sets its cookie and
 * the page re-renders.
 */
export function FormGate({ token, stage, agentName }: { token: string; stage: FormStage; agentName: string | null }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await verifyIdentity(token, fullName, phone);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <FormCardPage footnote="What you enter here is only used to confirm it is you. It is not stored anywhere else.">
      <FormIcon tone="brand">{LOCK_ICON}</FormIcon>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-taupe-2">{FORM_STAGES[stage].label}</p>
      <h1 className="mt-1 text-[18px] font-bold leading-tight tracking-[-0.02em] text-navy">Confirm it&apos;s you</h1>
      <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-ink">
        {agentName ? `${agentName} has sent you` : "You have been sent"} a secure application form. Enter your full name and phone number to continue.
      </p>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-3.5" noValidate>
        <div>
          <label htmlFor="gate-name" className={LABEL}>Full name</label>
          <input
            id="gate-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="As per NRIC"
            autoComplete="name"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "gate-error" : undefined}
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="gate-phone" className={LABEL}>Phone number</label>
          <input
            id="gate-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 012-345 6789"
            autoComplete="tel"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "gate-error" : undefined}
            className={INPUT}
          />
        </div>

        {error && (
          <div id="gate-error" role="alert" className="rounded-[10px] border border-[#f0cdc9] bg-alert-red-bg px-3.5 py-2.5 text-[11.5px] font-semibold text-alert-red">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending || fullName.trim().length === 0 || phone.trim().length === 0}
          className="press mt-1 flex min-h-12 items-center justify-center rounded-[12px] bg-brand text-[13.5px] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50"
        >
          {pending ? "Checking…" : "Continue"}
        </button>
      </form>
    </FormCardPage>
  );
}
