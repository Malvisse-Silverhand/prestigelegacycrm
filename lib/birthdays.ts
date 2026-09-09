// Birthdays of leads and clients.
//
// A wish on the day is one of the few messages a client is pleased to get, so
// the whole point is landing on the right day. Everything here works on plain
// "YYYY-MM-DD" strings rather than Date arithmetic: a birthday has no time of
// day, and running it through a Date makes it a UTC instant that can slide a
// day either way.

export type BirthdayRow = {
  id: string;
  full_name: string;
  phone: string;
  date_of_birth: string | null;
  pipeline_stage: string;
};

export type Birthday = {
  id: string;
  fullName: string;
  phone: string;
  /** Someone who already bought -- worth a warmer message than a cold lead. */
  isClient: boolean;
  /** The age they reach on this occurrence, or null if the year looks wrong. */
  turningAge: number | null;
  /** This occurrence, as YYYY-MM-DD. */
  dateKey: string;
  /** 0 = today, 1 = tomorrow. */
  daysAway: number;
};

// Business already won -- matches WON_STAGES on the dashboard.
const CLIENT_STAGES = ["closed_won", "servicing"];

// The server runs in UTC and Malaysia is UTC+8, so a plain toISOString() call
// reports yesterday's date for the first eight hours of every Malaysian day.
// A birthday card is the one place that is immediately obvious, so this asks
// for the Malaysian calendar date explicitly -- via the one shared definition
// of "what day is it" the rest of the app now uses too.
export { MY_TIME_ZONE, malaysiaDayKey } from "@/lib/malaysia-date";
import { malaysiaDayKey as dayKey } from "@/lib/malaysia-date";

export function malaysiaToday(now: Date = new Date()): string {
  return dayKey(now);
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// The day this year's (or next year's) birthday actually falls on. Someone
// born on 29 February has no birthday in a common year; they are wished on
// the 28th, which is the convention Malaysian records follow.
function occurrenceIn(year: number, month: number, day: number) {
  const clamped = Math.min(day, daysInMonth(year, month));
  return `${year}-${pad(month)}-${pad(clamped)}`;
}

function diffInDays(fromKey: string, toKey: string) {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

/**
 * Birthdays falling within the next `withinDays` days, today included,
 * soonest first. `todayKey` is passed in rather than read from the clock so
 * the result is a pure function of its inputs -- which keeps it out of React's
 * render path rules and makes it testable.
 */
export function upcomingBirthdays(
  rows: BirthdayRow[],
  todayKey: string,
  withinDays = 30,
): Birthday[] {
  const [todayYear] = todayKey.split("-").map(Number);
  const out: Birthday[] = [];

  for (const row of rows) {
    if (!row.date_of_birth) continue;
    const [birthYear, month, day] = row.date_of_birth.split("-").map(Number);
    if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) continue;

    // This year's occurrence, unless it has already gone -- then next year's,
    // so someone born on 2 January still appears in late December.
    let dateKey = occurrenceIn(todayYear, month, day);
    let daysAway = diffInDays(todayKey, dateKey);
    if (daysAway < 0) {
      dateKey = occurrenceIn(todayYear + 1, month, day);
      daysAway = diffInDays(todayKey, dateKey);
    }
    if (daysAway > withinDays) continue;

    const occurrenceYear = Number(dateKey.slice(0, 4));
    const age = occurrenceYear - birthYear;

    out.push({
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      isClient: CLIENT_STAGES.includes(row.pipeline_stage),
      // A year outside living memory means the date is a typo, not a
      // centenarian -- better to show the birthday without an age than to
      // print "turning 126".
      turningAge: Number.isFinite(age) && age > 0 && age < 120 ? age : null,
      dateKey,
      daysAway,
    });
  }

  return out.sort((a, b) => a.daysAway - b.daysAway || a.fullName.localeCompare(b.fullName));
}

/**
 * Every birthday falling inside an arbitrary date range, keyed by day.
 *
 * The calendar can be paged to any month, so markers can't come from a fixed
 * "next 30 days" list -- a birthday recurs every year, and the grid has to
 * show it whichever year is on screen. `daysAway` is still measured from
 * today, so a marker in a past month reads as negative rather than pretending
 * to be upcoming.
 */
export function occurrencesInRange(
  rows: BirthdayRow[],
  startKey: string,
  endKey: string,
  todayKey: string,
): Map<string, Birthday[]> {
  const startYear = Number(startKey.slice(0, 4));
  const endYear = Number(endKey.slice(0, 4));
  const map = new Map<string, Birthday[]>();

  for (const row of rows) {
    if (!row.date_of_birth) continue;
    const [birthYear, month, day] = row.date_of_birth.split("-").map(Number);
    if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) continue;

    for (let year = startYear; year <= endYear; year++) {
      const dateKey = occurrenceIn(year, month, day);
      if (dateKey < startKey || dateKey > endKey) continue;
      const age = year - birthYear;
      const entry: Birthday = {
        id: row.id,
        fullName: row.full_name,
        phone: row.phone,
        isClient: CLIENT_STAGES.includes(row.pipeline_stage),
        turningAge: Number.isFinite(age) && age > 0 && age < 120 ? age : null,
        dateKey,
        daysAway: diffInDays(todayKey, dateKey),
      };
      const list = map.get(dateKey);
      if (list) list.push(entry);
      else map.set(dateKey, [entry]);
    }
  }

  for (const list of map.values()) list.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return map;
}

/** Groups birthdays by their YYYY-MM-DD occurrence, for a calendar grid. */
export function birthdaysByDate(birthdays: Birthday[]): Map<string, Birthday[]> {
  const map = new Map<string, Birthday[]>();
  for (const b of birthdays) {
    const list = map.get(b.dateKey);
    if (list) list.push(b);
    else map.set(b.dateKey, [b]);
  }
  return map;
}

export function birthdayWhen(daysAway: number): string {
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  return `In ${daysAway} days`;
}

// A greeting the agent can send as-is or edit before sending.
export function birthdayWish(b: Birthday): string {
  const firstName = b.fullName.trim().split(/\s+/)[0];
  return b.isClient
    ? `Selamat Hari Lahir, ${firstName}! 🎉 Semoga sihat sejahtera dan murah rezeki sentiasa. Terima kasih kerana terus mempercayai kami.`
    : `Selamat Hari Lahir, ${firstName}! 🎉 Semoga sihat sejahtera dan murah rezeki sentiasa.`;
}
