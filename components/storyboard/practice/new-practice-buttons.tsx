"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createPracticeStoryboard } from "@/app/(app)/storyboards/practice-actions";
import { BUILT_MODULES, moduleName, type BuiltModule } from "@/lib/storyboard/modules";
import { STORYBOARD_STEPS } from "@/lib/storyboard/types";
import { useT } from "../lang-context";

/** Big, tappable plan cards. Picking one creates an empty practice session and opens it. */

const THEME: Record<BuiltModule, { bg: string; glow: string }> = {
  hibah: { bg: "linear-gradient(145deg,#0f2540 0%,#1d4272 100%)", glow: "rgba(250,199,72,0.28)" },
  medical: { bg: "linear-gradient(145deg,#0b3d2a 0%,#1f7a57 100%)", glow: "rgba(120,230,180,0.25)" },
  ci: { bg: "linear-gradient(145deg,#4a1623 0%,#8f3249 100%)", glow: "rgba(255,150,170,0.25)" },
  business: { bg: "linear-gradient(145deg,#33240f 0%,#7d5b1f 100%)", glow: "rgba(250,199,72,0.3)" },
};

const SVG = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ICON: Record<BuiltModule, ReactNode> = {
  // Hand giving a heart (gift of assets)
  hibah: (
    <svg {...SVG} aria-hidden="true">
      <path d="M12 9.5c-1.2-2.3-4.5-1.9-4.5.8 0 1.8 2 3.2 4.5 5 2.5-1.8 4.5-3.2 4.5-5 0-2.7-3.3-3.1-4.5-.8Z" />
      <path d="M3 19.5h4l3 1.5h6.5c1 0 1.8-.7 1.8-1.6 0-.8-.7-1.4-1.5-1.4H12" />
      <path d="M3 16.5v5" />
    </svg>
  ),
  // Medical cross in a card
  medical: (
    <svg {...SVG} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  ),
  // Heartbeat line
  ci: (
    <svg {...SVG} aria-hidden="true">
      <path d="M12 20.5s-8-4.7-8-10.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 8 2.3c0 5.5-8 10.2-8 10.2Z" />
      <path d="M6.5 12.5h3l1.5-2.5 2 4 1.3-1.5h3.2" />
    </svg>
  ),
  // Briefcase
  business: (
    <svg {...SVG} aria-hidden="true">
      <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
      <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3 13h18" />
    </svg>
  ),
};

export function NewPracticeButtons({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();
  const { t, lang } = useT();
  const [pendingModule, setPendingModule] = useState<BuiltModule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start(module: BuiltModule) {
    setError(null);
    setPendingModule(module);
    startTransition(async () => {
      try {
        const res = await createPracticeStoryboard({ module, lang });
        if (res.error || !res.id) {
          setError(res.error ?? t("practice.err.createFailed"));
          setPendingModule(null);
          return;
        }
        router.push(`/storyboards/practice/${res.id}/fill`);
      } catch {
        setError(t("common.connectError"));
        setPendingModule(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {BUILT_MODULES.map((m) => {
          const busy = pendingModule === m;
          return (
            <button
              key={m}
              type="button"
              disabled={disabled || pending}
              aria-label={t("practice.newAria", { module: moduleName(m, lang) })}
              onClick={() => start(m)}
              style={{ backgroundImage: THEME[m].bg }}
              className="group relative flex min-h-[230px] flex-col overflow-hidden rounded-[22px] p-6 text-left text-white shadow-[0_10px_30px_-12px_rgba(15,37,64,0.55)] ring-1 ring-white/10 outline-none transition motion-safe:duration-300 motion-safe:hover:-translate-y-1.5 motion-safe:hover:shadow-[0_24px_44px_-14px_rgba(15,37,64,0.6)] focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-wait disabled:opacity-80"
            >
              {/* soft glow + oversized watermark icon */}
              <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full blur-2xl" style={{ background: THEME[m].glow }} />
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-8 -right-6 h-44 w-44 text-white/[0.07] transition motion-safe:duration-500 motion-safe:group-hover:rotate-6 motion-safe:group-hover:scale-110 [&>svg]:h-full [&>svg]:w-full">
                {ICON[m]}
              </span>

              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gold text-navy shadow-[0_8px_18px_-6px_rgba(250,199,72,0.7)] [&>svg]:h-7 [&>svg]:w-7">
                {ICON[m]}
              </span>

              <span className="relative mt-5 block text-[22px] font-extrabold leading-tight tracking-[-0.02em]">{moduleName(m, lang)}</span>
              <span className="relative mt-1.5 block text-[13px] font-medium leading-snug text-white/75">{t(`plan.tagline.${m}` as const)}</span>

              <span className="relative mt-auto flex items-end justify-between gap-3 pt-5">
                <span className="flex items-center gap-1" aria-label={t("plan.steps")}>
                  {STORYBOARD_STEPS.map((s) => (
                    <span key={s} aria-hidden="true" className="h-1.5 w-6 rounded-full bg-white/30" />
                  ))}
                </span>
                <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-bold text-navy transition motion-safe:group-hover:gap-2.5 motion-safe:group-hover:bg-gold">
                  {busy ? t("plan.starting") : t("plan.start")}
                  <span aria-hidden="true">→</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <span role="status" aria-live="polite" className="text-xs font-semibold text-alert-red">
        {error}
      </span>
    </div>
  );
}
