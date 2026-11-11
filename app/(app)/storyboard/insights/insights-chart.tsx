"use client";

import { motion, useReducedMotion } from "motion/react";

// Presentations per day over the last two weeks, columns rising in turn.
export function InsightsChart({ days }: { days: { date: string; count: number }[] }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="rounded-[20px] border border-sand bg-white p-5">
      <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">Presentations · last 14 days</div>
      <div className="mt-4 flex h-[180px] items-end gap-1.5">
        {days.map((d, n) => (
          <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${d.date}: ${d.count}`}>
            {d.count > 0 && <span className="text-[10.5px] font-bold text-navy tabular-nums">{d.count}</span>}
            <motion.div
              className={`w-full max-w-[34px] rounded-t-[7px] ${d.count ? "bg-brand" : "bg-sand-3"}`}
              initial={{ height: reduce ? `${(d.count / max) * 100}%` : "0%" }}
              animate={{ height: `${Math.max(3, (d.count / max) * 100)}%` }}
              transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : n * 0.04, ease: [0.22, 1, 0.36, 1] }}
            />
            <span className="text-[10px] font-semibold text-taupe">{d.date.slice(8)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
