"use client";

// The animated story blocks. Each one takes finished numbers from the engine
// and tweens from whatever it showed last, so as the agent types the prospect
// watches the gap grow or shrink rather than a figure silently swapping.
// Remounting a block (a new `key`) replays its reveal from zero, which is what
// present mode does each time a scene is entered.
import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { rm } from "@/lib/storyboard/i18n";

const EASE = [0.22, 1, 0.36, 1] as const;

const COLORS = {
  have: "#2e8f68",
  gap: "#e0533f",
  gold: "#fac748",
  track: "rgba(255,255,255,.10)",
  series: ["#fac748", "#e0533f", "#7f93aa"],
};

function useTween(value: number, duration = 1.1) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: EASE });
    return () => controls.stop();
  }, [value, duration, reduce, mv]);
  return mv;
}

export function AnimatedRM({ value, className }: { value: number; className?: string }) {
  const mv = useTween(value);
  const text = useTransform(mv, (v) => rm(v));
  return <motion.span className={`tabular-nums ${className ?? ""}`}>{text}</motion.span>;
}

export function AnimatedInt({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const mv = useTween(value);
  const text = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);
  return <motion.span className={`tabular-nums ${className ?? ""}`}>{text}</motion.span>;
}

/** Share already in place, as a ring that fills while the number counts up. */
export function CoverageRing({ pct, label, size = 148 }: { pct: number; label: string; size?: number }) {
  const reduce = useReducedMotion();
  const r = 42;
  const c = 2 * Math.PI * r;
  const share = Math.max(0, Math.min(100, pct)) / 100;
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke={COLORS.gap} strokeOpacity={0.9} strokeWidth="10" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={COLORS.have}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - share) : c }}
          animate={{ strokeDashoffset: c * (1 - share) }}
          transition={{ duration: reduce ? 0 : 1.2, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <AnimatedInt value={pct} suffix="%" className="text-[30px] leading-none font-extrabold" />
        <span className="mt-1 max-w-[90px] text-center text-[10.5px] leading-tight font-semibold text-white/60">{label}</span>
      </div>
    </div>
  );
}

/** Need → have → gap: the headline reveal every module opens its result with. */
export function GapReveal({
  need,
  have,
  gap,
  coveredPct,
  labels,
  title,
  caption,
}: {
  need: number;
  have: number;
  gap: number;
  coveredPct: number;
  labels: { need: string; have: string; gap: string; covered: string };
  title: string;
  caption: string;
}) {
  const reduce = useReducedMotion();
  const haveShare = need > 0 ? Math.min(1, have / need) : 1;
  return (
    <div className="relative overflow-hidden rounded-[22px] bg-brand p-5 text-white sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-gold/20 blur-3xl"
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <CoverageRing pct={coveredPct} label={labels.covered} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold tracking-[0.14em] text-gold uppercase">{title}</div>
          <AnimatedRM value={gap} className="mt-1 block text-[40px] leading-none font-extrabold tracking-[-0.03em] sm:text-[52px]" />
          <div className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
            {[
              { k: labels.need, v: need, c: "text-white" },
              { k: labels.have, v: have, c: "text-[#7fd1ad]" },
              { k: labels.gap, v: gap, c: "text-[#ff8a78]" },
            ].map((s) => (
              <div key={s.k} className="rounded-[12px] bg-white/[.06] px-3 py-2.5">
                <div className="font-semibold text-white/55">{s.k}</div>
                <AnimatedRM value={s.v} className={`mt-0.5 block text-[14px] font-bold sm:text-[16px] ${s.c}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="relative mt-5 flex h-3 overflow-hidden rounded-full" style={{ background: COLORS.gap }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: COLORS.have }}
          initial={{ width: reduce ? `${haveShare * 100}%` : "0%" }}
          animate={{ width: `${haveShare * 100}%` }}
          transition={{ duration: reduce ? 0 : 1.2, ease: EASE }}
        />
      </div>
      <p className="relative mt-4 text-[14px] leading-relaxed font-medium text-white/80 sm:text-[15px]">{caption}</p>
    </div>
  );
}

/** Where the need comes from, largest first, bars staggering in. */
export function BreakdownStack({ title, items }: { title: string; items: { label: string; amount: number }[] }) {
  const reduce = useReducedMotion();
  const sorted = [...items].sort((a, b) => b.amount - a.amount);
  const max = Math.max(1, ...sorted.map((i) => i.amount));
  const total = sorted.reduce((s, i) => s + i.amount, 0) || 1;
  return (
    <div className="rounded-[20px] border border-sand bg-white p-5">
      <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">{title}</div>
      <div className="mt-4 flex flex-col gap-4">
        {sorted.map((item, n) => (
          <div key={item.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-semibold text-navy">{item.label}</span>
              <span className="flex items-baseline gap-2">
                <span className="text-[11px] font-bold text-taupe">{Math.round((item.amount / total) * 100)}%</span>
                <AnimatedRM value={item.amount} className="text-[14px] font-bold text-navy" />
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sand-3">
              <motion.div
                className="h-full rounded-full"
                style={{ background: COLORS.series[n % COLORS.series.length] }}
                initial={{ width: reduce ? `${(item.amount / max) * 100}%` : "0%" }}
                animate={{ width: `${(item.amount / max) * 100}%` }}
                transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : 0.15 + n * 0.12, ease: EASE }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Year-by-year columns that rise one after another, labelled T1, T2, ... */
export function YearTimeline({ title, values, yearPrefix }: { title: string; values: number[]; yearPrefix: string }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...values);
  return (
    <div className="rounded-[20px] border border-sand bg-white p-5">
      <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">{title}</div>
      <div className="mt-4 flex h-[150px] items-end gap-1.5">
        {values.map((v, n) => (
          <div key={n} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[10px] font-bold whitespace-nowrap text-taupe opacity-0 transition-opacity group-hover:opacity-100">
              {rm(v)}
            </span>
            <motion.div
              className="w-full max-w-[44px] rounded-t-[8px]"
              style={{ background: COLORS.gold, transformOrigin: "bottom" }}
              initial={{ height: reduce ? `${(v / max) * 100}%` : "0%" }}
              animate={{ height: `${Math.max(2, (v / max) * 100)}%` }}
              transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : n * 0.06, ease: EASE }}
            />
            <span className="text-[10.5px] font-bold text-taupe-2">
              {yearPrefix}
              {n + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** One bill split into who pays it: company, savings, and the uncovered rest. */
export function WhoPays({
  title,
  segments,
}: {
  title: string;
  segments: { label: string; amount: number; tone: "have" | "gold" | "gap" }[];
}) {
  const reduce = useReducedMotion();
  const total = segments.reduce((s, x) => s + x.amount, 0) || 1;
  const tone = { have: COLORS.have, gold: COLORS.gold, gap: COLORS.gap };
  return (
    <div className="rounded-[20px] border border-sand bg-white p-5">
      <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">{title}</div>
      <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-sand-3">
        {segments.map((s, n) => (
          <motion.div
            key={s.label}
            className="h-full"
            style={{ background: tone[s.tone] }}
            initial={{ width: reduce ? `${(s.amount / total) * 100}%` : "0%" }}
            animate={{ width: `${(s.amount / total) * 100}%` }}
            transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : n * 0.25, ease: EASE }}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: tone[s.tone] }} />
            <div className="min-w-0">
              <div className="text-[11.5px] font-semibold text-muted">{s.label}</div>
              <AnimatedRM value={s.amount} className="text-[14px] font-bold text-navy" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Today's bill against the same bill five years on, the second bar overshooting. */
export function BillInflation({
  title,
  today,
  later,
  todayLabel,
  laterLabel,
}: {
  title: string;
  today: number;
  later: number;
  todayLabel: string;
  laterLabel: string;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(1, today, later);
  const rows = [
    { label: todayLabel, v: today, c: COLORS.series[2] },
    { label: laterLabel, v: later, c: COLORS.gap },
  ];
  return (
    <div className="rounded-[20px] border border-sand bg-white p-5">
      <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">{title}</div>
      <div className="mt-4 flex flex-col gap-3.5">
        {rows.map((r, n) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-[12.5px] font-semibold text-muted">{r.label}</span>
              <AnimatedRM value={r.v} className="text-[16px] font-extrabold text-navy" />
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-sand-3">
              <motion.div
                className="h-full rounded-full"
                style={{ background: r.c }}
                initial={{ width: reduce ? `${(r.v / max) * 100}%` : "0%" }}
                animate={{ width: `${(r.v / max) * 100}%` }}
                transition={{ duration: reduce ? 0 : 1, delay: reduce ? 0 : n * 0.35, ease: EASE }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Two clocks side by side: the months what's in place lasts, and the months
 * recovery takes. The first runs out before the second finishes -- that
 * shortfall is the whole critical-illness argument in one picture.
 */
export function RunwayClock({
  title,
  monthsLast,
  monthsNeeded,
  lastLabel,
  neededLabel,
  monthsWord,
}: {
  title: string;
  monthsLast: number;
  monthsNeeded: number;
  lastLabel: string;
  neededLabel: string;
  monthsWord: string;
}) {
  const reduce = useReducedMotion();
  const scale = Math.max(1, monthsLast, monthsNeeded);
  const short = monthsLast < monthsNeeded;
  const cells = Math.ceil(scale);
  return (
    <div className="rounded-[20px] border border-sand bg-white p-5">
      <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">{title}</div>
      {[
        { label: neededLabel, v: monthsNeeded, color: COLORS.series[2] },
        { label: lastLabel, v: monthsLast, color: short ? COLORS.gap : COLORS.have },
      ].map((row, r) => (
        <div key={row.label} className="mt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[12.5px] font-semibold text-muted">{row.label}</span>
            <span className="text-[16px] font-extrabold text-navy tabular-nums">
              {row.v} {monthsWord}
            </span>
          </div>
          <div className="mt-1.5 flex gap-[3px]">
            {Array.from({ length: cells }, (_, n) => {
              const fill = Math.max(0, Math.min(1, row.v - n));
              return (
                <div key={n} className="h-5 flex-1 overflow-hidden rounded-[4px] bg-sand-3">
                  <motion.div
                    className="h-full"
                    style={{ background: row.color }}
                    initial={{ width: reduce ? `${fill * 100}%` : "0%" }}
                    animate={{ width: `${fill * 100}%` }}
                    transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : r * 0.4 + n * 0.05, ease: EASE }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Half-dial for the everyday-risk score. */
export function RiskGauge({
  score,
  max,
  level,
  levelText,
  line,
  topLabel,
  top,
}: {
  score: number;
  max: number;
  level: "low" | "medium" | "high";
  levelText: string;
  line: string;
  topLabel: string;
  top: string;
}) {
  const reduce = useReducedMotion();
  const tone = { low: "#2e8f68", medium: "#e3a12c", high: "#e0533f" }[level];
  const share = Math.min(1, score / max);
  const arc = Math.PI * 40;
  return (
    <div className="flex flex-col items-center gap-5 rounded-[22px] bg-brand p-5 text-white sm:flex-row sm:p-6">
      <div className="relative h-[92px] w-[170px] flex-none">
        <svg viewBox="0 0 100 55" className="h-full w-full">
          <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="9" strokeLinecap="round" />
          <motion.path
            d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            stroke={tone}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={arc}
            initial={{ strokeDashoffset: reduce ? arc * (1 - share) : arc }}
            animate={{ strokeDashoffset: arc * (1 - share) }}
            transition={{ duration: reduce ? 0 : 1.1, ease: EASE }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <AnimatedInt value={score} className="text-[28px] leading-none font-extrabold" />
          <span className="text-[12px] font-semibold text-white/50"> / {max}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <div className="text-[22px] font-extrabold tracking-[-0.02em]" style={{ color: tone }}>
          {levelText}
        </div>
        <p className="mt-1 text-[13.5px] leading-relaxed font-medium text-white/75">{line}</p>
        <div className="mt-2.5 text-[11px] font-bold tracking-[0.12em] text-gold uppercase">{topLabel}</div>
        <div className="text-[13px] font-semibold text-white/90">{top}</div>
      </div>
    </div>
  );
}

/** A small analytics tile; the value tweens like everything else. */
export function StatTile({ label, value, format, suffix = "" }: { label: string; value: number; format: "rm" | "int"; suffix?: string }) {
  return (
    <div className="rounded-[16px] border border-sand bg-white px-4 py-3.5">
      <div className="text-[11px] font-semibold text-muted">{label}</div>
      <div className="mt-1 text-[20px] font-extrabold tracking-[-0.02em] text-navy">
        {format === "rm" ? <AnimatedRM value={value} /> : <AnimatedInt value={value} suffix={suffix} />}
      </div>
    </div>
  );
}
