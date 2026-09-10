import type { CalendarDay } from "./data";

export type Granularity = "year" | "month" | "week" | "day";

export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function keyOf(d: Date) {
  // Local date, not toISOString() -- that shifts to UTC and can land on the
  // previous day for anyone east of Greenwich (this CRM runs in UTC+8).
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function startOfWeek(d: Date) {
  const out = new Date(d);
  // Monday-first, matching the calendar's weekday headings.
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  out.setHours(0, 0, 0, 0);
  return out;
}

export function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

// The one date that stands for whatever the calendar is currently showing.
// When the visible period contains today, today is that date -- so the cards
// keep reading "today / this week / this month" in the normal case and only
// shift once the agent actually pages away.
export function anchorFor(granularity: Granularity, offset: number, now = new Date()): Date {
  if (offset === 0) return now;
  if (granularity === "day") return addDays(now, offset);
  if (granularity === "week") return addDays(startOfWeek(now), offset * 7);
  if (granularity === "month") return new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return new Date(now.getFullYear() + offset, 0, 1);
}

// The six working days the approach scoreboard runs over. Matches how the
// weekly approach figure is built in the field -- 15 a day across Mon-Sat is
// the 90-a-week number, so Sunday carries no target and isn't shown.
export const APPROACH_DAYS = [
  { offset: 0, label: "Isnin" },
  { offset: 1, label: "Selasa" },
  { offset: 2, label: "Rabu" },
  { offset: 3, label: "Khamis" },
  { offset: 4, label: "Jumaat" },
  { offset: 5, label: "Sabtu" },
];

export type ApproachDay = { key: string; label: string; count: number; isToday: boolean; isFuture: boolean };

export type PeriodStats = {
  dayCount: number;
  dayPrevCount: number;
  dayLabel: string;
  weekCount: number;
  weekPrevCount: number;
  weekLabel: string;
  monthCount: number;
  monthLabel: string;
  closedCount: number;
  closedLabel: string;
  /** ANC of everything closed inside the visible month. */
  closedAnc: number;
  approachDays: ApproachDay[];
};

function sumLeads(days: Map<string, CalendarDay>, keys: string[]) {
  return keys.reduce((n, k) => n + (days.get(k)?.leads.length ?? 0), 0);
}

function weekKeys(anchor: Date) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => keyOf(addDays(start, i)));
}

// Every headline figure is derived from the same per-day rows the calendar
// draws, so a card can never disagree with the grid underneath it.
export function periodStats(
  calendarDays: CalendarDay[],
  anchor: Date,
  now = new Date(),
): PeriodStats {
  const byKey = new Map(calendarDays.map((d) => [d.key, d]));

  const dayKey = keyOf(anchor);
  const todayKey = keyOf(now);
  const dayCount = byKey.get(dayKey)?.leads.length ?? 0;
  const dayPrevCount = byKey.get(keyOf(addDays(anchor, -1)))?.leads.length ?? 0;

  const thisWeek = weekKeys(anchor);
  const prevWeek = weekKeys(addDays(startOfWeek(anchor), -7));
  const weekCount = sumLeads(byKey, thisWeek);
  const weekPrevCount = sumLeads(byKey, prevWeek);

  const monthPrefix = dayKey.slice(0, 7);
  const inMonth = calendarDays.filter((d) => d.key.startsWith(monthPrefix));
  const monthCount = inMonth.reduce((n, d) => n + d.leads.length, 0);
  const closedCount = inMonth.reduce((n, d) => n + d.sales.length, 0);
  const closedAnc = inMonth.reduce(
    (n, d) => n + d.sales.reduce((s, sale) => s + sale.anc, 0),
    0,
  );

  const approachWeekStart = startOfWeek(anchor);
  const approachDays: ApproachDay[] = APPROACH_DAYS.map(({ offset, label }) => {
    const key = keyOf(addDays(approachWeekStart, offset));
    return {
      key,
      label,
      count: byKey.get(key)?.leads.length ?? 0,
      isToday: key === todayKey,
      isFuture: key > todayKey,
    };
  });

  const sameMonth = monthPrefix === todayKey.slice(0, 7);
  const monthName = `${MONTH_LONG[anchor.getMonth()]} ${anchor.getFullYear()}`;
  const weekStart = startOfWeek(anchor);

  return {
    dayCount,
    dayPrevCount,
    dayLabel: dayKey === todayKey ? "Leads today" : `Leads on ${anchor.getDate()} ${MONTH_SHORT[anchor.getMonth()]}`,
    weekCount,
    weekPrevCount,
    weekLabel:
      keyOf(weekStart) === keyOf(startOfWeek(now))
        ? "Leads this week"
        : `Leads · week of ${weekStart.getDate()} ${MONTH_SHORT[weekStart.getMonth()]}`,
    monthCount,
    monthLabel: sameMonth ? "Leads this month" : `Leads · ${monthName}`,
    closedCount,
    closedLabel: sameMonth ? "This month closing" : `Closing · ${monthName}`,
    closedAnc,
    approachDays,
  };
}
