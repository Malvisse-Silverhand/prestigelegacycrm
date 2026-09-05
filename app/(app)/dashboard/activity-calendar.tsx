"use client";

import { useMemo, useState } from "react";
import type { CalendarDay } from "./data";

type Granularity = "year" | "month" | "week" | "day";

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "year", label: "Year" },
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_SHORT = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// What a filled cell means, most significant first: a closed sale outranks a
// new lead, which outranks bare activity. A cell with nothing stays white.
const LEGEND = [
  { key: "sales" as const, label: "Closed client", light: "#0f4c35", dark: "#2e8f68" },
  { key: "leads" as const, label: "Leads", light: "#1c3f66", dark: "#5b8fc7" },
  { key: "activities" as const, label: "Activities", light: "#d8d2c6", dark: "#4a5a6b" },
];

function keyOf(d: Date) {
  // Local date, not toISOString() -- that shifts to UTC and can land on the
  // previous day for anyone east of Greenwich (this CRM runs in UTC+8).
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(d: Date) {
  const out = new Date(d);
  // Monday-first, matching WEEKDAY_SHORT.
  const shift = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - shift);
  out.setHours(0, 0, 0, 0);
  return out;
}

type Cell = {
  key: string;
  label: string;
  leads: number;
  sales: number;
  activities: number;
  outside?: boolean; // padding day from an adjacent month
};

function emptyTotals() {
  return { leads: 0, sales: 0, activities: 0 };
}

export function ActivityCalendar({
  days,
  startKey,
  compact,
}: {
  days: CalendarDay[];
  startKey: string;
  compact?: boolean;
}) {
  const [granularity, setGranularity] = useState<Granularity>("month");
  // 0 = the period containing today, -1 = the one before it, etc.
  const [offset, setOffset] = useState(0);

  const byDay = useMemo(() => new Map(days.map((d) => [d.key, d])), [days]);

  const { cells, title, columns, canGoBack } = useMemo(() => {
    const now = new Date();
    // Counts only -- callers supply their own `key`, so this must not carry one.
    const get = (key: string) => {
      const hit = byDay.get(key);
      return { leads: hit?.leads ?? 0, sales: hit?.sales ?? 0, activities: hit?.activities ?? 0 };
    };

    if (granularity === "year") {
      const year = now.getFullYear() + offset;
      const monthCells: Cell[] = MONTH_SHORT.map((label, m) => {
        const totals = emptyTotals();
        const prefix = `${year}-${String(m + 1).padStart(2, "0")}`;
        for (const d of days) {
          if (d.key.startsWith(prefix)) {
            totals.leads += d.leads;
            totals.sales += d.sales;
            totals.activities += d.activities;
          }
        }
        return { key: prefix, label, ...totals };
      });
      return {
        cells: monthCells,
        title: String(year),
        columns: 4,
        canGoBack: `${year - 1}-12-31` >= startKey,
      };
    }

    if (granularity === "month") {
      const anchor = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const year = anchor.getFullYear();
      const month = anchor.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const lead = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first padding

      const monthCells: Cell[] = [];
      for (let i = 0; i < lead; i++) {
        monthCells.push({ key: `pad-${i}`, label: "", ...emptyTotals(), outside: true });
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const key = keyOf(new Date(year, month, day));
        monthCells.push({ key, label: String(day), ...get(key) });
      }
      const prevMonthEnd = keyOf(new Date(year, month, 0));
      return {
        cells: monthCells,
        title: `${MONTH_LONG[month]} ${year}`,
        columns: 7,
        canGoBack: prevMonthEnd >= startKey,
      };
    }

    if (granularity === "week") {
      const anchor = startOfWeek(now);
      anchor.setDate(anchor.getDate() + offset * 7);
      const weekCells: Cell[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(anchor);
        d.setDate(d.getDate() + i);
        const key = keyOf(d);
        return { key, label: `${WEEKDAY_SHORT[i]} ${d.getDate()}`, ...get(key) };
      });
      const end = new Date(anchor);
      end.setDate(end.getDate() + 6);
      const sameMonth = anchor.getMonth() === end.getMonth();
      const prevWeekEnd = new Date(anchor);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
      return {
        cells: weekCells,
        title: sameMonth
          ? `${anchor.getDate()}–${end.getDate()} ${MONTH_SHORT[anchor.getMonth()]} ${end.getFullYear()}`
          : `${anchor.getDate()} ${MONTH_SHORT[anchor.getMonth()]} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`,
        columns: 7,
        canGoBack: keyOf(prevWeekEnd) >= startKey,
      };
    }

    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const key = keyOf(d);
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    return {
      cells: [{ key, label: `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`, ...get(key) }],
      title: `${d.getDate()} ${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`,
      columns: 1,
      canGoBack: keyOf(prev) >= startKey,
    };
  }, [granularity, offset, days, byDay, startKey]);

  const totals = cells.reduce(
    (acc, c) => {
      acc.leads += c.leads;
      acc.sales += c.sales;
      acc.activities += c.activities;
      return acc;
    },
    emptyTotals(),
  );

  const todayKey = keyOf(new Date());

  return (
    <div className={`rounded-[18px] border border-sand bg-white dark:border-white/10 dark:bg-[#12283f] ${compact ? "p-4" : "p-5 pb-[22px]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={`font-bold text-navy dark:text-[#eef3f8] ${compact ? "text-[13.5px]" : "text-[15.5px]"}`}>
          Activity calendar
        </div>
        <div className="flex rounded-[10px] border border-sand-2 bg-cream p-[3px] dark:border-white/10 dark:bg-[#0b1a2b]">
          {GRANULARITIES.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => {
                setGranularity(g.value);
                setOffset(0);
              }}
              className={`rounded-[7px] px-2.5 py-[5px] text-[11px] font-semibold ${
                granularity === g.value
                  ? "bg-navy text-white dark:bg-gold dark:text-navy"
                  : "text-taupe dark:text-[#7f93aa]"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          disabled={!canGoBack}
          aria-label="Previous period"
          className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-sand-2 text-navy disabled:opacity-35 dark:border-white/10 dark:text-[#eef3f8]"
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="text-[12.5px] font-bold text-navy dark:text-[#eef3f8]">{title}</div>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
          aria-label="Next period"
          className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-sand-2 text-navy disabled:opacity-35 dark:border-white/10 dark:text-[#eef3f8]"
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {granularity === "month" && (
        <div className="mt-2.5 grid grid-cols-7 gap-1 text-center text-[9.5px] font-bold tracking-[0.04em] text-taupe-2 uppercase dark:text-[#7f93aa]">
          {WEEKDAY_SHORT.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
      )}

      <div
        className={`mt-1.5 grid gap-1 ${
          columns === 7 ? "grid-cols-7" : columns === 4 ? "grid-cols-4" : "grid-cols-1"
        }`}
      >
        {cells.map((c) => (
          <CalendarCell key={c.key} cell={c} isToday={c.key === todayKey} big={columns === 1} />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-sand-3 pt-2.5 dark:border-white/10">
        {LEGEND.map((l) => (
          <span key={l.key} className="flex items-center gap-1.5 text-[10.5px] font-semibold text-muted dark:text-[#7f93aa]">
            <span className="h-[9px] w-[9px] rounded-[3px]" style={{ background: l.light }} />
            {l.label}
            <span className="font-extrabold text-navy dark:text-[#eef3f8]">{totals[l.key]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function CalendarCell({ cell, isToday, big }: { cell: Cell; isToday: boolean; big?: boolean }) {
  if (cell.outside) return <div />;

  // Most significant thing that happened decides the fill; nothing at all
  // leaves it white/blank.
  const fill =
    cell.sales > 0
      ? LEGEND[0]
      : cell.leads > 0
        ? LEGEND[1]
        : cell.activities > 0
          ? LEGEND[2]
          : null;

  const total = cell.sales + cell.leads + cell.activities;
  const onDark = fill?.key === "sales" || fill?.key === "leads";

  const title = [
    cell.label || cell.key,
    `${cell.leads} lead${cell.leads === 1 ? "" : "s"}`,
    `${cell.sales} closed`,
    `${cell.activities} activit${cell.activities === 1 ? "y" : "ies"}`,
  ].join(" · ");

  return (
    <div
      title={title}
      className={`flex flex-col items-center justify-center rounded-[7px] border ${
        big ? "aspect-auto py-6" : "aspect-square"
      } ${
        isToday ? "border-gold ring-1 ring-gold" : "border-sand-2 dark:border-white/10"
      }`}
      style={fill ? { background: fill.light, borderColor: fill.light } : undefined}
    >
      <span
        className={`text-[10px] font-bold leading-none ${
          onDark ? "text-white/90" : "text-navy dark:text-[#eef3f8]"
        }`}
      >
        {cell.label}
      </span>
      {total > 0 && (
        <span
          className={`mt-0.5 text-[9px] font-extrabold leading-none ${
            onDark ? "text-white" : "text-navy dark:text-[#eef3f8]"
          }`}
        >
          {total}
        </span>
      )}
    </div>
  );
}
