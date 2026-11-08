"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FlowSlide, FlowTone } from "@/lib/storyboard/types";
import { t } from "@/lib/storyboard/i18n";

const AUTO_MS = 4800;

const TONE: Record<FlowTone, { bar: string; text: string; chip: string }> = {
  good: { bar: "bg-green", text: "text-green", chip: "bg-success-bg text-green" },
  warn: { bar: "bg-warn-orange", text: "text-warn-gold-text", chip: "bg-warn-gold-bg text-warn-gold-text" },
  bad: { bar: "bg-alert-red", text: "text-alert-red", chip: "bg-alert-red-bg text-alert-red" },
  neutral: { bar: "bg-info-blue-mid", text: "text-info-blue-text", chip: "bg-info-blue-bg text-info-blue-text" },
};

type Props = {
  slides: FlowSlide[];
  autoPlay?: boolean;
  onIndexChange?: (index: number) => void;
};

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ScenarioFlow({ slides, autoPlay = false, onIndexChange }: Props) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      const i = ((next % count) + count) % count;
      setIndex(i);
      onIndexChange?.(i);
    },
    [count, onIndexChange],
  );

  useEffect(() => {
    if (!playing || count < 2 || reducedMotion()) return;
    const id = window.setTimeout(() => go(index + 1), AUTO_MS);
    return () => window.clearTimeout(id);
  }, [playing, index, count, go]);

  if (count === 0) return null;
  const safe = Math.min(index, count - 1);
  const slide = slides[safe];
  const tone = TONE[slide.tone];
  const pct = Math.max(0, Math.min(100, slide.meter));

  const btn =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-[12px] border border-sand bg-white px-4 text-sm font-semibold text-navy hover:bg-sand-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("flow.region")}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          go(safe + 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(safe - 1);
        }
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (start === null || end === undefined) return;
        const dx = end - start;
        if (Math.abs(dx) > 40) go(safe + (dx < 0 ? 1 : -1));
      }}
      className="rounded-[20px] border border-sand bg-white p-4 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:p-5"
    >
      <div
        key={safe}
        className="sb-slide-in sb-reduce-transition"
        aria-roledescription="slide"
        aria-label={t("flow.slideOf", "en", { n: safe + 1, total: count })}
      >
        <span
          className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone.chip}`}
        >
          {slide.tag}
        </span>
        <h3 className="mt-3 text-base font-bold text-navy">{slide.title}</h3>
        <div className={`mt-1 text-2xl font-bold ${tone.text}`}>{slide.value}</div>
        <p className="mt-2 text-[13px] leading-relaxed text-ink">{slide.desc}</p>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-2">
            <span>{slide.meterLabel}</span>
            <span className="font-semibold text-navy">{slide.meterText}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand" role="presentation">
            <div className={`sb-meter h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {slide.title}: {slide.value}
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button type="button" className={btn} onClick={() => go(safe - 1)} aria-label={t("flow.previous")}>
          <span aria-hidden="true">&larr;</span>
        </button>
        <button type="button" className={btn} onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? t("flow.pause") : t("flow.play")}
        </button>
        <button type="button" className={btn} onClick={() => go(safe + 1)} aria-label={t("flow.next")}>
          <span aria-hidden="true">&rarr;</span>
        </button>
        <input
          type="range"
          min={0}
          max={count - 1}
          step={1}
          value={safe}
          onChange={(e) => go(Number(e.target.value))}
          aria-label={t("flow.scrubber")}
          aria-valuetext={`${slide.title}: ${slide.value}`}
          className="ml-2 h-11 min-w-0 flex-1 accent-[var(--brand-primary)]"
        />
      </div>

      <div className="mt-2 flex justify-center">
        {slides.map((s, i) => (
          <button
            key={`${i}-${s.tag}`}
            type="button"
            onClick={() => go(i)}
            aria-label={t("flow.goTo", "en", { n: i + 1 })}
            aria-current={i === safe ? "true" : undefined}
            className="flex h-11 w-7 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
          >
            <span
              className={`block h-2.5 rounded-full transition-all ${i === safe ? "w-5 bg-brand" : "w-2.5 bg-sand-2"}`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
