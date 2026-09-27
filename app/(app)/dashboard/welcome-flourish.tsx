"use client";

import { useEffect, useState } from "react";

const ENTER_MS = 260;
const HOLD_MS = 480;
const EXIT_MS = 220;

/**
 * A one-time, under-a-second "welcome back" toast the moment an agent's
 * dashboard first paints after signing in -- never on a refresh, a later
 * visit, or navigating back to /dashboard from elsewhere. login/page.tsx
 * sets the sessionStorage flag right before its hard navigation to
 * /dashboard; this component is the only thing that ever reads or clears
 * it, so the contract has exactly one writer and one reader.
 *
 * No animation library, matching the rest of the app (see globals.css's
 * "INTERACTION FEEDBACK" note) -- just a phase state driving a Tailwind
 * transition, so the whole thing costs nothing beyond this one component.
 */
export function WelcomeFlourish({ firstName }: { firstName: string }) {
  const [phase, setPhase] = useState<"idle" | "enter" | "hold" | "exit" | "gone">("idle");

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

    // One tick so the initial (hidden) state actually paints before the
    // transition to "enter" starts -- otherwise the browser coalesces both
    // into a single frame and nothing visibly animates.
    const raf = requestAnimationFrame(() => setPhase("enter"));
    const toHold = setTimeout(() => setPhase("hold"), ENTER_MS);
    const toExit = setTimeout(() => setPhase("exit"), ENTER_MS + HOLD_MS);
    const toGone = setTimeout(() => setPhase("gone"), ENTER_MS + HOLD_MS + EXIT_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(toHold);
      clearTimeout(toExit);
      clearTimeout(toGone);
    };
  }, []);

  if (phase === "idle" || phase === "gone") return null;

  const shown = phase === "enter" || phase === "hold";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center"
      style={{ top: "max(14px, env(safe-area-inset-top))" }}
    >
      <div
        className={`flex items-center gap-2.5 rounded-full bg-navy py-2 pr-[18px] pl-2 shadow-elevated transition-all ease-[cubic-bezier(.34,1.56,.64,1)] ${
          shown ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"
        }`}
        style={{ transitionDuration: `${shown ? ENTER_MS : EXIT_MS}ms` }}
      >
        <span
          className={`flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gold transition-transform duration-300 ${
            shown ? "scale-100" : "scale-0"
          }`}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#0f2540" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5L20 7" />
          </svg>
        </span>
        <span className="text-[13px] font-bold text-white">Welcome back, {firstName}</span>
      </div>
    </div>
  );
}
