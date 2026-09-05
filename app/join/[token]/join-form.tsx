"use client";

import { useState, type FormEvent } from "react";
import { submitRegistration } from "../actions";

const FIELD =
  "mt-[7px] w-full rounded-control border border-sand-2 bg-white px-[15px] py-[14px] text-[14px] font-medium text-navy outline-none focus:border-[1.5px] focus:border-gold focus:shadow-[0_0_0_4px_rgba(250,199,72,.18)]";
const LABEL = "text-[11px] font-bold tracking-[0.1em] text-taupe-2 uppercase";

export function JoinForm({ token }: { token: string }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // A repeat submission comes back as { duplicate: true } rather than an
      // error -- from the applicant's side their details are already in.
      const result = await submitRegistration({ token, fullName, email, phone, note });
      if (result.error) setError(result.error);
      else setDone(true);
    } catch {
      setError("Couldn't connect. Check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="px-8 pt-9 pb-10 text-center sm:px-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold text-[22px] font-bold text-navy">
          ✓
        </div>
        <div className="mt-4 text-[17px] font-extrabold tracking-[-0.01em] text-navy">Details received</div>
        <p className="mt-2 text-[13.5px] leading-relaxed font-medium text-muted">
          Your manager will review your registration. Once it&apos;s approved you&apos;ll get an email at{" "}
          <span className="font-bold text-navy">{email}</span> with a link to set your password and sign in.
        </p>
        <p className="mt-3 text-[12px] font-medium text-taupe">You can close this page now.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-8 pt-[30px] pb-[34px] sm:px-10">
      <p className="text-[13px] leading-relaxed font-medium text-muted">
        Fill in your details below. Your manager reviews every registration before an account is created.
      </p>

      <label className="mt-[22px] block">
        <span className={LABEL}>Full name</span>
        <input
          required
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={FIELD}
        />
      </label>

      <label className="mt-[18px] block">
        <span className={LABEL}>Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={FIELD}
        />
        <span className="mt-1.5 block text-[11.5px] font-medium text-taupe">
          Your sign-in link is sent here once you&apos;re approved.
        </span>
      </label>

      <label className="mt-[18px] block">
        <span className={LABEL}>Phone number</span>
        <input
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="012-345 6789"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={FIELD}
        />
      </label>

      <label className="mt-[18px] block">
        <span className={LABEL}>Anything we should know (optional)</span>
        <textarea
          rows={3}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={`${FIELD} resize-none`}
        />
      </label>

      {error && <div className="mt-4 text-[12.5px] font-semibold text-alert-red">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="mt-[26px] w-full rounded-control bg-gold py-[15px] text-[14px] font-bold text-navy shadow-sm hover:brightness-95 disabled:opacity-60"
      >
        {loading ? "Sending…" : "Submit registration"}
      </button>
    </form>
  );
}
