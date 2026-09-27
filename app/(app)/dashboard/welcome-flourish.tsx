"use client";

import { useEffect, useState } from "react";

const ENTER_MS = 420;
const HOLD_MS = 3000;
const EXIT_MS = 340;
// 3760ms total, under the 4s budget with room for a slow device's paint.

// A few lines each for day and night, picked at random so it doesn't read
// the same every login. Casual KL Malay, matching the rest of the agency's
// own voice rather than formal Bahasa Baku.
const GREETINGS_DAY: [string, string][] = [
  ["Selamat pagi, {nama}!", "Hari baru, semangat baru. Jom mulakan!"],
  ["Selamat sejahtera, {nama}.", "Semoga hari ni penuh rezeki dan closing."],
  ["Weh {nama}, hari ni your day!", "Mari kejar target dengan senyuman."],
  ["Selamat kembali, {nama}!", "Setiap panggilan hari ni satu peluang."],
  ["Assalamualaikum, {nama}.", "Semoga usaha hari ini dipermudahkan."],
  ["Selamat kembali, {nama}.", "Leads tu tak tunggu lama-lama — jom!"],
];
const GREETINGS_NIGHT: [string, string][] = [
  ["Selamat malam, {nama}.", "Masih bersemangat lagi? Respect!"],
  ["Malam pun still grinding, {nama}?", "Jangan lupa rehat selepas ni."],
  ["Selamat kembali, {nama}.", "Sikit lagi je untuk hari ini."],
  ["Waktu malam pun boleh produktif, {nama}.", "Teruskan usaha, hasil pasti datang."],
  ["Selamat malam, {nama}.", "Terima kasih atas usaha sepanjang hari ni."],
];

/**
 * A one-time, under-4-second welcome moment the instant an agent's dashboard
 * paints after signing in -- never on a refresh, a later visit, or
 * navigating back to /dashboard from elsewhere. login/page.tsx sets the
 * sessionStorage flag right before its hard navigation to /dashboard; this
 * component is the only thing that ever reads or clears it, so the contract
 * has exactly one writer and one reader.
 *
 * No animation library, matching the rest of the app (see globals.css's
 * "INTERACTION FEEDBACK" note) -- a phase state driving Tailwind
 * transitions plus one small scoped <style> block for the two things a
 * transition class can't do (the glow's slow drift, the icon's breathing
 * pulse during the hold). Day and night get a different icon, a different
 * accent glow, and their own pool of greetings so the moment doesn't feel
 * identical every single login.
 */
export function WelcomeFlourish({ firstName }: { firstName: string }) {
  const [phase, setPhase] = useState<"idle" | "enter" | "hold" | "exit" | "gone">("idle");
  const [pick, setPick] = useState<{ isNight: boolean; title: string; sub: string } | null>(null);

  useEffect(() => {
    let flagged = false;
    try {
      flagged = sessionStorage.getItem("pl_welcome") === "1";
      sessionStorage.removeItem("pl_welcome");
    } catch {
      // Storage can throw in a locked-down browser context -- no flourish,
      // no error either.
    }
    if (!flagged) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    // 6am-7pm reads as day for a Malaysian working day; everything else is
    // the night pool. The visitor's own device clock, since that is whose
    // "now" the greeting is actually about.
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 19;
    const pool = isNight ? GREETINGS_NIGHT : GREETINGS_DAY;
    const [title, sub] = pool[Math.floor(Math.random() * pool.length)];

    // Both state updates happen inside this callback, not synchronously in
    // the effect body -- the same reason the phase transition already
    // needed a rAF (so the "hidden" state actually paints first): a direct
    // setState call here would also trip the lint rule against cascading
    // renders from an effect body.
    const raf = requestAnimationFrame(() => {
      setPick({ isNight, title: title.replace("{nama}", firstName), sub });
      setPhase("enter");
    });
    const toHold = setTimeout(() => setPhase("hold"), ENTER_MS);
    const toExit = setTimeout(() => setPhase("exit"), ENTER_MS + HOLD_MS);
    const toGone = setTimeout(() => setPhase("gone"), ENTER_MS + HOLD_MS + EXIT_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(toHold);
      clearTimeout(toExit);
      clearTimeout(toGone);
    };
    // firstName is fixed for the life of this component (a session doesn't
    // change identity mid-visit), so it's read once here rather than listed
    // as a dependency that would re-arm the whole sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "idle" || phase === "gone" || !pick) return null;

  const shown = phase === "enter" || phase === "hold";
  const breathing = phase === "hold";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center px-4"
      style={{ paddingTop: "max(18px, env(safe-area-inset-top))" }}
    >
      <style>{`
        @keyframes pl-welcome-drift {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.18); }
        }
        @keyframes pl-welcome-breathe {
          0%, 100% { transform: scale(1); opacity: .9; }
          50% { transform: scale(1.12); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pl-welcome-glow, .pl-welcome-icon { animation: none !important; }
        }
      `}</style>

      {/* A soft scrim ties the moment to the dashboard arriving underneath
          it, rather than reading as an unrelated toast that happens to be
          on screen -- but it never blocks a tap, so nobody is stuck waiting
          on it to start work. */}
      <div
        className="absolute inset-0 bg-navy/25 backdrop-blur-[1.5px] transition-opacity"
        style={{ opacity: shown ? 1 : 0, transitionDuration: `${shown ? ENTER_MS : EXIT_MS}ms` }}
      />

      <div
        className={`relative w-full max-w-[300px] overflow-hidden rounded-[20px] bg-navy p-5 text-center shadow-[0_24px_60px_-16px_rgba(15,37,64,.65)] transition-all ease-[cubic-bezier(.22,1,.36,1)] ${
          shown ? "translate-y-0 scale-100 opacity-100" : "-translate-y-4 scale-[.92] opacity-0"
        }`}
        style={{ transitionDuration: `${shown ? ENTER_MS : EXIT_MS}ms` }}
      >
        {/* A slow-drifting glow behind the icon -- gold for day, a deeper
            indigo for night -- plus a few still "stars" only at night. */}
        <div
          className="pl-welcome-glow pointer-events-none absolute top-2 left-1/2 h-[140px] w-[140px] rounded-full blur-2xl"
          style={{
            background: pick.isNight ? "#6d5ce7" : "#fac748",
            opacity: pick.isNight ? 0.35 : 0.4,
            animation: shown ? "pl-welcome-drift 3.6s ease-in-out infinite" : "none",
          }}
        />
        {pick.isNight && (
          <>
            <span className="absolute top-4 left-8 h-[3px] w-[3px] rounded-full bg-white/70" />
            <span className="absolute top-9 right-10 h-[2px] w-[2px] rounded-full bg-white/50" />
            <span className="absolute top-6 right-16 h-[2px] w-[2px] rounded-full bg-white/60" />
          </>
        )}

        <div
          className="pl-welcome-icon relative mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: pick.isNight ? "rgba(109,92,231,.22)" : "rgba(250,199,72,.22)",
            animation: breathing ? "pl-welcome-breathe 1.8s ease-in-out infinite" : "none",
          }}
        >
          {pick.isNight ? (
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
              <path
                d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
                fill="#d6cffb"
                stroke="#b9adf5"
                strokeWidth={1.2}
              />
            </svg>
          ) : (
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5.2" fill="#fac748" />
              <g stroke="#fac748" strokeWidth={1.8} strokeLinecap="round">
                <path d="M12 2v2.4M12 19.6V22M22 12h-2.4M4.4 12H2M18.7 5.3l-1.7 1.7M7 17l-1.7 1.7M18.7 18.7 17 17M7 7 5.3 5.3" />
              </g>
            </svg>
          )}
        </div>

        <div className="relative mt-3 text-[15.5px] font-extrabold leading-snug text-white">{pick.title}</div>
        <div className="relative mt-1 text-[12px] font-medium leading-relaxed text-white/65">{pick.sub}</div>
      </div>
    </div>
  );
}
