"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLead } from "@/app/(app)/leads/actions";
import { INTEREST_OPTIONS } from "@/lib/product-interest";
import { ChevronDownIcon } from "@/components/icons";

// Logging an approach IS creating a lead -- there is no separate counter to
// keep in step, which is the whole point: the approach scoreboard reads the
// same rows Leads Manager does. This form is just the fastest possible way in,
// four fields where Add Lead has twenty, for the moment right after a
// conversation when only the name and the number are known.
export function LogApproachModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function reset() {
    setFullName("");
    setPhone("");
    setEmail("");
    setInterest("");
    setError(null);
  }

  function submit(andAnother: boolean) {
    setError(null);
    setSavedName(null);
    startTransition(async () => {
      const form = new FormData();
      form.set("full_name", fullName);
      form.set("phone", phone);
      form.set("email", email);
      form.set("interest", interest);
      // Every approach logged here was a person the agent went to directly.
      form.set("lead_source", "Direct Approach");
      try {
        const result = await createLead(form);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
        if (andAnother) {
          // Back-to-back logging is the normal case after a day of walking
          // around, so keep the form open and say what just landed.
          setSavedName(fullName.trim());
          reset();
        } else {
          reset();
          onClose();
        }
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-navy/55 p-0 lg:items-center lg:p-4">
      <div className="w-full max-w-[420px] rounded-t-2xl bg-white p-5 shadow-elevated lg:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[16px] font-bold text-navy">Log an approach</div>
            <div className="mt-0.5 text-[12px] font-medium text-muted">
              Name and number is enough — it lands in Leads Manager straight away.
            </div>
          </div>
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            aria-label="Close"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-taupe hover:bg-cream"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {savedName && (
          <div className="mt-3 rounded-[10px] bg-success-bg px-3 py-2 text-[12px] font-semibold text-green">
            {savedName} logged. Next one?
          </div>
        )}

        <label className="mt-3.5 block">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe">Name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoFocus
            className="mt-[5px] h-[40px] w-full rounded-[10px] border border-sand-2 bg-cream px-3 text-[13px] font-medium text-navy outline-none focus:border-gold"
          />
        </label>

        <label className="mt-2.5 block">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe">Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            className="mt-[5px] h-[40px] w-full rounded-[10px] border border-sand-2 bg-cream px-3 text-[13px] font-medium text-navy outline-none focus:border-gold"
          />
        </label>

        <label className="mt-2.5 block">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe">
            Email <span className="font-semibold text-taupe-2">· optional</span>
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            className="mt-[5px] h-[40px] w-full rounded-[10px] border border-sand-2 bg-cream px-3 text-[13px] font-medium text-navy outline-none focus:border-gold"
          />
        </label>

        <label className="mt-2.5 block">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe">
            Plan interest <span className="font-semibold text-taupe-2">· optional</span>
          </span>
          <div className="relative mt-[5px]">
            <select
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              className="h-[40px] w-full appearance-none rounded-[10px] border border-sand-2 bg-cream px-3 pr-9 text-[13px] font-semibold text-navy outline-none focus:border-gold"
            >
              <option value="">Not sure yet</option>
              {INTEREST_OPTIONS.map((o) => (
                <option key={o.label} value={o.label}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              width={14}
              height={14}
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy"
            />
          </div>
        </label>

        {error && (
          <div className="mt-3 rounded-[10px] bg-alert-red-bg px-3 py-2 text-[12.5px] font-medium text-alert-red">
            {error}
          </div>
        )}

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={pending}
            className="h-[42px] flex-1 rounded-[11px] border border-sand-2 bg-white text-[13px] font-semibold text-navy disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save & add another"}
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={pending}
            className="h-[42px] flex-1 rounded-[11px] bg-navy text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
