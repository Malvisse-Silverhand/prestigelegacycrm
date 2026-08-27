"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(
        "That email and password don't match our records. Try again, or contact your unit manager for help.",
      );
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-cream px-4 py-10">
      <div className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-card bg-cream shadow-elevated">
        <div className="bg-navy px-10 pt-11 pb-13 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-base font-extrabold text-navy">
              T4
            </div>
            <div className="text-[17px] font-bold">Takaful4Us</div>
          </div>
          <div className="mt-7 text-[27px] leading-[1.25] font-extrabold tracking-[-0.02em]">
            Welcome back.
            <br />
            <span className="text-gold">Your leads are waiting.</span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col px-10 pt-[30px] pb-[34px]"
        >
          <label className="block">
            <span className="text-[11px] font-bold tracking-[0.1em] text-taupe-2 uppercase">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-[7px] w-full rounded-control border border-sand-2 bg-white px-[15px] py-[14px] text-[14px] font-medium text-navy outline-none focus:border-[1.5px] focus:border-gold focus:shadow-[0_0_0_4px_rgba(250,199,72,.18)]"
            />
          </label>

          <label className="mt-[18px] block">
            <span className="text-[11px] font-bold tracking-[0.1em] text-taupe-2 uppercase">
              Password
            </span>
            <div className="mt-[7px] flex items-center gap-2 rounded-control border border-sand-2 bg-white px-[15px] py-[14px] focus-within:border-[1.5px] focus-within:border-gold focus-within:shadow-[0_0_0_4px_rgba(250,199,72,.18)]">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="flex-1 text-[14px] font-medium text-navy outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="flex-none text-taupe"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                  <circle cx="12" cy="12" r="2.6" />
                </svg>
              </button>
            </div>
          </label>

          <div className="mt-[15px] flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(event) => setKeepSignedIn(event.target.checked)}
                className="peer sr-only"
              />
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-navy peer-focus-visible:ring-2 peer-focus-visible:ring-gold peer-focus-visible:ring-offset-2">
                {keepSignedIn && (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-gold)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span className="text-[12.5px] font-medium text-ink">
                Keep me signed in
              </span>
            </label>
            <Link
              href="/forgot-password"
              className="text-[12.5px] font-semibold text-green"
            >
              Forgot password?
            </Link>
          </div>

          {error && (
            <div className="mt-[18px] rounded-control bg-alert-red-bg px-[14px] py-[11px] text-[12.5px] font-medium text-alert-red">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex h-[52px] items-center justify-center rounded-[13px] bg-navy text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>

          <div className="mt-[18px] text-center text-[12.5px] leading-[1.6] font-medium text-muted">
            New agent? Ask your unit manager to send an invite.
          </div>

          <div className="mt-auto flex items-center justify-center gap-2 border-t border-sand pt-[22px] text-[11px] font-semibold text-taupe">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <rect x="4" y="10" width="16" height="11" rx="2.5" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Agent portal · authorised users only
          </div>
        </form>
      </div>
    </div>
  );
}
