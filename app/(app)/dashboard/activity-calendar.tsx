"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CalendarDay, CalendarLeadItem, CalendarActivityItem } from "./data";

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
  leads: CalendarLeadItem[];
  sales: CalendarLeadItem[];
  activities: CalendarActivityItem[];
  outside?: boolean; // padding day from an adjacent month
  // Month cells in year view aggregate a whole month's worth of days --
  // "click a date cell" doesn't apply to those, so they open nothing.
  clickable?: boolean;
};

function emptyDay(): Pick<Cell, "leads" | "sales" | "activities"> {
  return { leads: [], sales: [], activities: [] };
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
  const [openCell, setOpenCell] = useState<Cell | null>(null);

  const byDay = useMemo(() => new Map(days.map((d) => [d.key, d])), [days]);

  const { cells, title, columns, canGoBack } = useMemo(() => {
    const now = new Date();
    const get = (key: string) => byDay.get(key) ?? { leads: [], sales: [], activities: [] };

    if (granularity === "year") {
      const year = now.getFullYear() + offset;
      const monthCells: Cell[] = MONTH_SHORT.map((label, m) => {
        const agg = emptyDay();
        const prefix = `${year}-${String(m + 1).padStart(2, "0")}`;
        for (const d of days) {
          if (d.key.startsWith(prefix)) {
            agg.leads.push(...d.leads);
            agg.sales.push(...d.sales);
            agg.activities.push(...d.activities);
          }
        }
        return { key: prefix, label, ...agg, clickable: false };
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
        monthCells.push({ key: `pad-${i}`, label: "", ...emptyDay(), outside: true });
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const key = keyOf(new Date(year, month, day));
        monthCells.push({ key, label: String(day), ...get(key), clickable: true });
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
        return { key, label: `${WEEKDAY_SHORT[i]} ${d.getDate()}`, ...get(key), clickable: true };
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
      cells: [{ key, label: `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`, ...get(key), clickable: true }],
      title: `${d.getDate()} ${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`,
      columns: 1,
      canGoBack: keyOf(prev) >= startKey,
    };
  }, [granularity, offset, days, byDay, startKey]);

  const totals = cells.reduce(
    (acc, c) => {
      acc.leads += c.leads.length;
      acc.sales += c.sales.length;
      acc.activities += c.activities.length;
      return acc;
    },
    { leads: 0, sales: 0, activities: 0 },
  );

  const todayKey = keyOf(new Date());

  return (
    <div className={`rounded-[18px] border border-sand bg-white dark:border-white/10 dark:bg-[#12283f] ${compact ? "p-4" : "p-3.5"}`}>
      {openCell && <DayModal cell={openCell} onClose={() => setOpenCell(null)} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={`font-bold text-navy dark:text-[#eef3f8] ${compact ? "text-[13.5px]" : "text-[13px]"}`}>
          Activity calendar
        </div>
        <div className="flex rounded-[9px] border border-sand-2 bg-cream p-[2px] dark:border-white/10 dark:bg-[#0b1a2b]">
          {GRANULARITIES.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => {
                setGranularity(g.value);
                setOffset(0);
              }}
              className={`rounded-[6px] px-2 py-[3px] text-[10.5px] font-semibold ${
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

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          disabled={!canGoBack}
          aria-label="Previous period"
          className="flex h-6 w-6 items-center justify-center rounded-[7px] border border-sand-2 text-navy disabled:opacity-35 dark:border-white/10 dark:text-[#eef3f8]"
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="text-[11.5px] font-bold text-navy dark:text-[#eef3f8]">{title}</div>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
          aria-label="Next period"
          className="flex h-6 w-6 items-center justify-center rounded-[7px] border border-sand-2 text-navy disabled:opacity-35 dark:border-white/10 dark:text-[#eef3f8]"
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {granularity === "month" && (
        <div className="mt-1.5 grid grid-cols-7 gap-[3px] text-center text-[8.5px] font-bold tracking-[0.04em] text-taupe-2 uppercase dark:text-[#7f93aa]">
          {WEEKDAY_SHORT.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
      )}

      <div
        className={`mt-1 grid gap-[3px] ${
          columns === 7 ? "grid-cols-7" : columns === 4 ? "grid-cols-4" : "grid-cols-1"
        }`}
      >
        {cells.map((c) => (
          <CalendarCell
            key={c.key}
            cell={c}
            isToday={c.key === todayKey}
            big={columns === 1}
            onOpen={() => setOpenCell(c)}
          />
        ))}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-sand-3 pt-2 dark:border-white/10">
        {LEGEND.map((l) => (
          <span key={l.key} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted dark:text-[#7f93aa]">
            <span className="h-[8px] w-[8px] rounded-[3px]" style={{ background: l.light }} />
            {l.label}
            <span className="font-extrabold text-navy dark:text-[#eef3f8]">{totals[l.key]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function CalendarCell({
  cell, isToday, big, onOpen,
}: {
  cell: Cell; isToday: boolean; big?: boolean; onOpen: () => void;
}) {
  if (cell.outside) return <div />;

  const leadCount = cell.leads.length;
  const salesCount = cell.sales.length;
  const activityCount = cell.activities.length;

  // Most significant thing that happened decides the fill; nothing at all
  // leaves it white/blank.
  const fill =
    salesCount > 0
      ? LEGEND[0]
      : leadCount > 0
        ? LEGEND[1]
        : activityCount > 0
          ? LEGEND[2]
          : null;

  const onDark = fill?.key === "sales" || fill?.key === "leads";
  const hasAnything = leadCount + salesCount + activityCount > 0;

  const title = [
    cell.label || cell.key,
    `${leadCount} lead${leadCount === 1 ? "" : "s"}`,
    `${salesCount} closed`,
    `${activityCount} activit${activityCount === 1 ? "y" : "ies"}`,
  ].join(" · ");

  return (
    <button
      type="button"
      title={title}
      onClick={cell.clickable && hasAnything ? onOpen : undefined}
      disabled={!cell.clickable || !hasAnything}
      className={`flex flex-col items-center justify-center rounded-[6px] border ${
        big ? "h-14" : "h-8"
      } ${
        isToday ? "border-gold ring-1 ring-gold" : "border-sand-2 dark:border-white/10"
      } ${cell.clickable && hasAnything ? "cursor-pointer hover:brightness-95" : "cursor-default"}`}
      style={fill ? { background: fill.light, borderColor: fill.light } : undefined}
    >
      <span
        className={`text-[9.5px] font-bold leading-none ${
          onDark ? "text-white/90" : "text-navy dark:text-[#eef3f8]"
        }`}
      >
        {cell.label}
      </span>
      {/* Only the lead count, smaller than the date above it -- sales/activity
          counts still drive the fill colour, and the full breakdown is one
          click away in the modal. */}
      {leadCount > 0 && (
        <span
          className={`mt-0.5 text-[7px] font-semibold leading-none ${
            onDark ? "text-white/85" : "text-taupe-2 dark:text-[#9fb2c4]"
          }`}
        >
          {leadCount} lead{leadCount === 1 ? "" : "s"}
        </span>
      )}
    </button>
  );
}

function Section({
  title, count, color, defaultOpen, children,
}: {
  title: string; count: number; color: string; defaultOpen: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[12px] border border-sand-2 dark:border-white/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-3.5 py-3"
      >
        <span className="h-[9px] w-[9px] flex-none rounded-[3px]" style={{ background: color }} />
        <span className="flex-1 text-left text-[13px] font-bold text-navy dark:text-[#eef3f8]">{title}</span>
        <span className="text-[12px] font-extrabold text-navy dark:text-[#eef3f8]">{count}</span>
        <svg
          width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}
          strokeLinecap="round" strokeLinejoin="round"
          className={`flex-none text-taupe transition-transform dark:text-[#7f93aa] ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-sand-3 px-3.5 py-2.5 dark:border-white/10">
          {count === 0 ? (
            <p className="py-1 text-[12px] text-muted dark:text-[#7f93aa]">Nothing here.</p>
          ) : (
            <div className="flex flex-col gap-1.5">{children}</div>
          )}
        </div>
      )}
    </div>
  );
}

// cell.label is deliberately short in-grid ("1", "Mo 1") -- the modal needs
// the actual date, parsed from the key rather than local-midnight new Date()
// on "YYYY-MM-DD" (which some engines read as UTC and can shift by a day).
function fullDateLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  return `${d} ${MONTH_LONG[m - 1]} ${y}`;
}

function DayModal({ cell, onClose }: { cell: Cell; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-elevated dark:bg-[#12283f]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-bold text-navy dark:text-[#eef3f8]">{fullDateLabel(cell.key)}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-taupe hover:bg-cream dark:text-[#7f93aa] dark:hover:bg-white/5"
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-3.5 flex flex-col gap-2.5">
          <Section title="Leads" count={cell.leads.length} color={LEGEND[1].light} defaultOpen={cell.leads.length > 0}>
            {cell.leads.map((l) => (
              <Link
                key={l.id}
                href={`/leads/${l.id}`}
                className="rounded-[9px] bg-cream px-3 py-2 text-[12.5px] font-semibold text-navy hover:underline dark:bg-white/5 dark:text-[#eef3f8]"
              >
                {l.fullName}
              </Link>
            ))}
          </Section>

          <Section title="Closed clients" count={cell.sales.length} color={LEGEND[0].light} defaultOpen={cell.sales.length > 0 && cell.leads.length === 0}>
            {cell.sales.map((l) => (
              <Link
                key={l.id}
                href={`/leads/${l.id}`}
                className="rounded-[9px] bg-cream px-3 py-2 text-[12.5px] font-semibold text-navy hover:underline dark:bg-white/5 dark:text-[#eef3f8]"
              >
                {l.fullName}
              </Link>
            ))}
          </Section>

          <Section
            title="Activities"
            count={cell.activities.length}
            color={LEGEND[2].light}
            defaultOpen={cell.activities.length > 0 && cell.leads.length === 0 && cell.sales.length === 0}
          >
            {cell.activities.map((a) => (
              <div key={a.id} className="rounded-[9px] bg-cream px-3 py-2 dark:bg-white/5">
                <div className="text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">{a.label}</div>
                {a.leadName && a.leadId && (
                  <Link href={`/leads/${a.leadId}`} className="text-[11px] font-medium text-taupe hover:underline dark:text-[#7f93aa]">
                    {a.leadName}
                  </Link>
                )}
              </div>
            ))}
          </Section>
        </div>
      </div>
    </div>
  );
}
