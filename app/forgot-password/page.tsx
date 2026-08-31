"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await requestPasswordReset(email);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
    } catch {
      setError("Couldn't connect. Check your internet connection and try again.");
      setLoading(false);
      return;
    }

    // Shown even when the address isn't registered, so this page can't be used
    // to discover which emails have accounts.
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-cream px-4 py-10">
      <div className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-card bg-cream shadow-elevated">
        <div className="bg-navy px-10 pt-11 pb-13 text-white">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="Prestige Legacy"
              width={40}
              height={40}
              className="h-10 w-10 flex-none rounded-xl object-cover"
              priority
            />
            <div className="text-[17px] font-bold">Prestige Legacy</div>
          </div>
          <div className="mt-7 text-[27px] leading-[1.25] font-extrabold tracking-[-0.02em]">
            Forgot your
            <br />
            <span className="text-gold">password?</span>
          </div>
        </div>

        {sent ? (
          <div className="flex flex-1 flex-col px-10 pt-[30px] pb-[34px]">
            <div className="rounded-control bg-success-bg px-[14px] py-[13px] text-[13px] leading-relaxed font-medium text-green">
              If an account exists for <span className="font-bold">{email.trim()}</span>, a password reset
              link is on its way. The link expires after one hour.
            </div>
            <p className="mt-4 text-[12.5px] leading-[1.6] font-medium text-muted">
              Didn&apos;t get it? Check your spam folder, or ask your unit manager to reset it for you.
            </p>
            <Link
              href="/login"
              className="mt-6 flex h-[52px] items-center justify-center rounded-[13px] bg-navy text-[15px] font-semibold text-white"
            >
              Back to log in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-10 pt-[30px] pb-[34px]">
            <p className="text-[13px] leading-[1.6] font-medium text-muted">
              Enter the email you sign in with and we&apos;ll send you a link to set a new password.
            </p>

            <label className="mt-[18px] block">
              <span className="text-[11px] font-bold tracking-[0.1em] text-taupe-2 uppercase">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-[7px] w-full rounded-control border border-sand-2 bg-white px-[15px] py-[14px] text-[14px] font-medium text-navy outline-none focus:border-[1.5px] focus:border-gold focus:shadow-[0_0_0_4px_rgba(250,199,72,.18)]"
              />
            </label>

            {error && (
              <div className="mt-[18px] rounded-control bg-alert-red-bg px-[14px] py-[11px] text-[12.5px] font-medium text-alert-red">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="mt-6 flex h-[52px] items-center justify-center rounded-[13px] bg-navy text-[15px] font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>

            <Link
              href="/login"
              className="mt-[18px] text-center text-[12.5px] font-semibold text-green"
            >
              Back to log in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
