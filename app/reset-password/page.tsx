"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { setNewPassword } from "@/app/change-password/actions";

type LinkState = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The recovery link can land here in two shapes, and an invite always
  // arrives as the first one:
  //
  //  - implicit: #access_token=...&refresh_token=...&type=recovery. This is
  //    what Supabase issues for a link minted server-side (admin.generateLink),
  //    which is exactly how an invite is created -- by the person doing the
  //    inviting, in their browser, not the new agent's.
  //  - PKCE: ?code=... -- needs an exchange, and only works in the same
  //    browser that asked for the reset, because the verifier is stored there.
  //
  // The implicit tokens have to be handed to setSession explicitly:
  // createBrowserClient (@supabase/ssr) runs the PKCE flow by default, so it
  // ignores the fragment and leaves no session -- which is why a perfectly
  // valid invite link used to render "invalid or has expired".
  useEffect(() => {
    const supabase = createClient();

    async function establishSession() {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const linkErr = params.get("error_description") ?? hash.get("error_description");
      if (linkErr) {
        setLinkError(linkErr);
        setLinkState("invalid");
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error: setError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!setError) {
          // Take the tokens back out of the address bar once they're in the
          // session -- they shouldn't sit in history or get copied out of it.
          window.history.replaceState(null, "", window.location.pathname);
          setLinkState("ready");
          return;
        }
        setLinkError(setError.message);
        setLinkState("invalid");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setLinkState("ready");
        return;
      }

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
          setLinkState("ready");
          return;
        }
        setLinkError(exchangeError.message);
      }

      setLinkState("invalid");
    }

    establishSession();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      // Same server action the first-login flow uses -- it sets the password
      // and clears must_change_password in one place.
      const result = await setNewPassword(password);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      // A full document load, not router.push. The password change rotated
      // the auth cookies server-side, and a hard navigation is the one way
      // every server component and the middleware are guaranteed to read the
      // new ones. It also avoids a race that left people stranded here:
      // router.refresh() fired straight after router.push() aborted the
      // pending navigation, so the dashboard rendered but the URL never
      // moved off /reset-password and the button sat on "Saving…".
      window.location.assign("/dashboard");
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
            Choose a
            <br />
            <span className="text-gold">new password.</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-10 pt-[30px] pb-[34px]">
          {linkState === "checking" && (
            <p className="text-[13px] font-medium text-muted">Checking your reset link…</p>
          )}

          {linkState === "invalid" && (
            <>
              <div className="rounded-control bg-alert-red-bg px-[14px] py-[13px] text-[13px] leading-relaxed font-medium text-alert-red">
                This reset link is invalid or has expired. Reset links last one hour, and must be opened in
                the same browser you requested them from.
              </div>
              {linkError && (
                <p className="mt-2 text-[11.5px] font-medium text-taupe">Details: {linkError}</p>
              )}
              <Link
                href="/forgot-password"
                className="mt-6 flex h-[52px] items-center justify-center rounded-[13px] bg-navy text-[15px] font-semibold text-white"
              >
                Request a new link
              </Link>
            </>
          )}

          {linkState === "ready" && (
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
              <label className="block">
                <span className="text-[11px] font-bold tracking-[0.1em] text-taupe-2 uppercase">
                  New password
                </span>
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
                <span className="text-[11px] font-bold tracking-[0.1em] text-taupe-2 uppercase">
                  Confirm new password
                </span>
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

              <p className="mt-2 text-[11.5px] font-medium text-taupe">At least 8 characters.</p>

              {error && (
                <div className="mt-[18px] rounded-control bg-alert-red-bg px-[14px] py-[11px] text-[12.5px] font-medium text-alert-red">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="mt-6 flex h-[52px] items-center justify-center rounded-[13px] bg-navy text-[15px] font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Saving…" : "Set new password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
