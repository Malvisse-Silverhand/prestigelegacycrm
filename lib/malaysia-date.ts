// The single definition of "what day is it" for this app.
//
// The business runs on Malaysia time, but this app's server functions run on
// Vercel in UTC, and Malaysia is UTC+8. A plain `new Date().toISOString()
// .slice(0, 10)` -- or slicing a stored timestamp the same way -- reports
// *yesterday's* date for the first eight hours of every Malaysian day
// (00:00-07:59 MYT is 16:00-23:59 UTC the day before). That is not a rare
// edge case: it is every single morning, and it is exactly when a lot of
// follow-up calls happen. A lead created at 7am in Kuala Lumpur would be
// filed under yesterday, and a follow-up due today would not yet count as
// due -- or one due yesterday would not yet count as overdue -- until the
// UTC clock also rolls over, hours after the Malaysian day already has.
//
// Every place in the app that buckets something "by day" -- today's leads,
// this week, overdue follow-ups, the activity calendar, birthdays -- should
// go through here rather than reimplement the UTC-slice shortcut.
export const MY_TIME_ZONE = "Asia/Kuala_Lumpur";

// Reused rather than constructed per call: some pages format a day key for
// every lead, every activity row, and every day of a 13-month calendar in a
// single render.
const MY_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: MY_TIME_ZONE });

/**
 * The Malaysia calendar day for `when` (a Date, an ISO timestamp string, or
 * epoch millis), as "YYYY-MM-DD". Defaults to right now.
 *
 * en-CA is the locale that happens to format as YYYY-MM-DD, which is exactly
 * the key format used everywhere in this app -- it sorts and compares the
 * same way the calendar does.
 */
export function malaysiaDayKey(when: Date | string | number = new Date()): string {
  return MY_DAY_FORMATTER.format(when instanceof Date ? when : new Date(when));
}

/** Today's Malaysia calendar day, as "YYYY-MM-DD". */
export function malaysiaToday(): string {
  return malaysiaDayKey();
}

/**
 * The Malaysia calendar day `n` days before `from` (today, by default), as
 * "YYYY-MM-DD". `n` may be negative to count forward instead.
 *
 * `from` is treated as a plain calendar date, not an instant -- the
 * subtraction happens in UTC purely as arithmetic on the year/month/day
 * already extracted, so there is no timezone to get wrong a second time, and
 * `Date.UTC` normalises an out-of-range day (day 0, day -3, ...) into the
 * correct previous month on its own.
 */
export function malaysiaDaysAgo(n: number, from: string = malaysiaToday()): string {
  const [y, m, d] = from.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}
