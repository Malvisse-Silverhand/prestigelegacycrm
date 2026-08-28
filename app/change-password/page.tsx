"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { setNewPassword } from "./actions";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const result = await setNewPassword(password);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Couldn't connect. Check your internet connection and try again.");
      setLoading(false);
    }
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
            Set a new password
            <br />
            <span className="text-gold">before you get started.</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-10 pt-[30px] pb-[34px]">
          <div className="mb-2 text-[12.5px] font-medium text-muted">
            Your account was created with a temporary password. Choose a new one to continue.
          </div>

          <label className="mt-4 block">
            <span className="text-[11px] font-bold tracking-[0.1em] text-taupe-2 uppercase">New password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-[7px] w-full rounded-control border border-sand-2 bg-white px-[15px] py-[14px] text-[14px] font-medium text-navy outline-none focus:border-[1.5px] focus:border-gold focus:shadow-[0_0_0_4px_rgba(250,199,72,.18)]"
            />
          </label>

          <label className="mt-[18px] block">
            <span className="text-[11px] font-bold tracking-[0.1em] text-taupe-2 uppercase">Confirm password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
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
            disabled={loading}
            className="mt-6 flex h-[52px] items-center justify-center rounded-[13px] bg-navy text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Saving…" : "Set password and continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
