"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginToPortal } from "./actions";

const COPY = {
  bm: {
    tag: "Portal Klien",
    title: "Log Masuk",
    subtitle: "Sahkan identiti anda untuk melihat sijil takaful anda.",
    idLabel: "E-mel atau Nombor Telefon",
    idPlaceholder: "cth. ahmad@email.com atau 012-345 6789",
    nricLabel: "4 Digit Terakhir NRIC",
    nricPlaceholder: "1234",
    nricHint: "Contohnya, jika NRIC anda 900101-10-1234, masukkan 1234.",
    submit: "Log Masuk",
    submitting: "Menyemak…",
    disclaimer:
      "Portal agensi Prestige Legacy, bukan sistem rasmi Great Eastern Takaful Berhad. Maklumat log masuk anda hanya digunakan untuk mengesahkan identiti dan tidak disimpan di tempat lain.",
  },
  en: {
    tag: "Client Portal",
    title: "Sign In",
    subtitle: "Verify your identity to view your takaful certificate.",
    idLabel: "Email or Phone Number",
    idPlaceholder: "e.g. ahmad@email.com or 012-345 6789",
    nricLabel: "Last 4 Digits of NRIC",
    nricPlaceholder: "1234",
    nricHint: "For example, if your NRIC is 900101-10-1234, enter 1234.",
    submit: "Sign In",
    submitting: "Checking…",
    disclaimer:
      "This is the Prestige Legacy agency portal, not the official system of Great Eastern Takaful Berhad. What you enter here is used only to verify your identity and is not stored anywhere else.",
  },
} as const;

/**
 * The one gate in front of the portal: what the client typed either matches
 * the certificate this link points to, or it doesn't. Everything past this
 * point -- which certificates they see, in what language -- is decided after
 * the Server Action sets the session cookie and the page re-renders.
 */
export function PortalLogin({ token }: { token: string }) {
  const router = useRouter();
  const [lang, setLang] = useState<"bm" | "en">("bm");
  const [identifier, setIdentifier] = useState("");
  const [nric, setNric] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const t = COPY[lang];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await loginToPortal(token, identifier, nric);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="flex items-center gap-2.5 bg-navy px-4 py-3">
        <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-gold">
          <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] text-navy" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4 6.2v5.4c0 4.4 3.3 8.5 8 9.4 4.7-.9 8-5 8-9.4V6.2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold leading-tight tracking-[-0.01em] text-white">Prestige Legacy</div>
          <div className="text-[9.5px] font-semibold uppercase leading-snug tracking-[0.1em] text-gold">{t.tag}</div>
        </div>
        <div className="flex flex-none gap-0.5 rounded-full bg-white/10 p-[3px]">
          {(["bm", "en"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={`press min-h-8 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
                lang === code ? "bg-gold text-navy" : "text-white/60"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="rounded-[20px] border border-sand bg-white p-6 shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-navy">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-gold" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
              <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
            </svg>
          </div>

          <h1 className="mt-4 text-[18px] font-bold leading-tight tracking-[-0.02em] text-navy">{t.title}</h1>
          <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-ink">{t.subtitle}</p>

          <form onSubmit={submit} className="mt-5 flex flex-col gap-3.5">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">{t.idLabel}</span>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t.idPlaceholder}
                autoComplete="off"
                required
                className="mt-1.5 h-11 w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">{t.nricLabel}</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={nric}
                onChange={(e) => setNric(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder={t.nricPlaceholder}
                autoComplete="off"
                required
                className="mt-1.5 h-11 w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 font-mono text-[15px] font-bold tracking-[0.15em] text-navy outline-none focus:border-gold"
              />
              <p className="mt-1 text-[10.5px] font-medium text-taupe">{t.nricHint}</p>
            </label>

            {error && (
              <div className="rounded-[10px] border border-[#f0cdc9] bg-alert-red-bg px-3.5 py-2.5 text-[11.5px] font-semibold text-alert-red">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending || identifier.trim().length === 0 || nric.length !== 4}
              className="press mt-1 flex min-h-12 items-center justify-center rounded-[12px] bg-navy text-[13.5px] font-bold text-white disabled:opacity-50"
            >
              {pending ? t.submitting : t.submit}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[10.5px] font-medium leading-relaxed text-taupe">{t.disclaimer}</p>
      </main>
    </div>
  );
}
