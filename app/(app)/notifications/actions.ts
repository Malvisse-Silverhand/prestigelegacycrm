"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getWonClientBirthdays } from "@/app/(app)/my-sales/servicing/birthday-data";
import { occurrencesInRange, birthdayWhen } from "@/lib/birthdays";
import { malaysiaDaysAgo, malaysiaToday } from "@/lib/malaysia-date";

export type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  fireAt: string;
  readAt: string | null;
  /** Computed live from today's data rather than a stored row -- a birthday
   *  or a contribution due date. There is nothing in the `notifications`
   *  table to mark read, so the bell skips these in its mark-read flow and
   *  its unread badge count; see components/notification-bell.tsx. */
  synthetic?: boolean;
};

// The inbox is "everything already due" -- a reminder row exists from the
// moment the appointment is booked, but stays invisible until its fire_at
// passes. That is what replaces a scheduler here.
const INBOX_LIMIT = 30;

// How far ahead "coming up" looks for a birthday or a contribution due date
// -- long enough to plan around, short enough that the bell doesn't turn
// into a second Servicing calendar.
const LOOKAHEAD_DAYS = 7;

function fmtRM(n: number) {
  return `RM${Math.round(n).toLocaleString("en-MY")}`;
}

type ScheduleCaseRow = {
  id: string;
  installment_contribution: number | string | null;
  leads: { full_name: string } | null;
  contribution_schedule: { id: string; due_date: string | null; paid: boolean }[] | null;
};

/**
 * Everything the notification bell shows: the stored `notifications` rows
 * (appointment reminders) plus three kinds computed live from today's data
 * rather than persisted -- an upcoming birthday, a contribution due soon,
 * and a contribution already overdue. The live kinds are never written to
 * the `notifications` table, so they can't go stale in it and can't be
 * marked read there either; they simply stop appearing once the condition
 * that produced them clears (the birthday passes, the row gets paid).
 *
 * Scoped exactly the way the rest of the app already scopes this data: won
 * clients' birthdays via getWonClientBirthdays() (same query Servicing's own
 * calendar uses), and inforce cases' contribution schedules via RLS on
 * case_submissions ("cases follow lead visibility"), which contribution_schedule
 * itself inherits in turn.
 */
export async function getNotifications(): Promise<NotificationRow[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];

  const supabase = await createClient();
  const today = malaysiaToday();
  const withinKey = malaysiaDaysAgo(-LOOKAHEAD_DAYS);

  const [{ data: stored }, birthdayRows, { data: caseRows }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, kind, title, body, href, fire_at, read_at")
      .lte("fire_at", new Date().toISOString())
      .order("fire_at", { ascending: false })
      .limit(INBOX_LIMIT),
    getWonClientBirthdays(),
    supabase
      .from("case_submissions")
      .select(
        "id, installment_contribution, leads!case_submissions_lead_id_fkey(full_name), contribution_schedule(id, due_date, paid)",
      )
      .eq("status", "inforce"),
  ]);

  const storedRows: NotificationRow[] = (stored ?? []).map((n) => ({
    id: n.id as string,
    kind: n.kind as string,
    title: n.title as string,
    body: (n.body as string | null) ?? null,
    href: (n.href as string | null) ?? null,
    fireAt: n.fire_at as string,
    readAt: (n.read_at as string | null) ?? null,
  }));

  // Upcoming birthdays -- a won client's own day, inside the lookahead
  // window. occurrencesInRange carries the Feb-29 handling and the
  // year-rollover rule, same as Servicing's calendar and the dashboard's
  // own birthday card.
  const birthdayMap = occurrencesInRange(birthdayRows, today, withinKey, today);
  const birthdayNotifications: NotificationRow[] = [];
  for (const list of birthdayMap.values()) {
    for (const b of list) {
      birthdayNotifications.push({
        id: `birthday:${b.id}:${b.dateKey.slice(0, 4)}`,
        kind: "birthday",
        title: `${b.fullName}'s birthday is coming up`,
        body: `${birthdayWhen(b.daysAway)}${b.turningAge != null ? ` · turns ${b.turningAge}` : ""}`,
        href: "/my-sales/servicing",
        // Not a scheduled row -- there's nothing to count "since". The
        // countdown lives in the body text instead.
        fireAt: new Date().toISOString(),
        readAt: null,
        synthetic: true,
      });
    }
  }

  // Contributions due soon / already overdue -- every unpaid schedule row on
  // an inforce case this viewer can see.
  const contributionNotifications: NotificationRow[] = [];
  for (const row of (caseRows ?? []) as unknown as ScheduleCaseRow[]) {
    const clientName = row.leads?.full_name ?? "Client";
    const amount = row.installment_contribution == null ? null : Number(row.installment_contribution);
    for (const s of row.contribution_schedule ?? []) {
      if (s.paid || !s.due_date) continue;
      if (s.due_date < today) {
        contributionNotifications.push({
          id: `contribution:${s.id}`,
          kind: "contribution_overdue",
          title: `Contribution overdue — ${clientName}`,
          body: amount != null ? `${fmtRM(amount)} was due ${s.due_date}` : `Was due ${s.due_date}`,
          href: "/my-sales/servicing",
          fireAt: new Date(s.due_date).toISOString(),
          readAt: null,
          synthetic: true,
        });
      } else if (s.due_date <= withinKey) {
        contributionNotifications.push({
          id: `contribution:${s.id}`,
          kind: "contribution_due",
          title: `Contribution due soon — ${clientName}`,
          body: amount != null ? `${fmtRM(amount)} due ${s.due_date}` : `Due ${s.due_date}`,
          href: "/my-sales/servicing",
          fireAt: new Date().toISOString(),
          readAt: null,
          synthetic: true,
        });
      }
    }
  }

  // Most time-pressing first: money already overdue alongside real stored
  // reminders, then contributions due soon, then birthdays -- proximity
  // within each group is already how each list was built.
  const overdue = contributionNotifications.filter((n) => n.kind === "contribution_overdue");
  const dueSoon = contributionNotifications.filter((n) => n.kind === "contribution_due");

  return [...overdue, ...storedRows, ...dueSoon, ...birthdayNotifications];
}

export async function markNotificationsRead(ids: string[]) {
  const profile = await getCurrentProfile();
  if (!profile || ids.length === 0) return { error: null };

  const supabase = await createClient();
  // RLS already limits this to the caller's own rows.
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .is("read_at", null);

  if (error) return { error: "Couldn't update notifications." };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function markAllNotificationsRead() {
  const profile = await getCurrentProfile();
  if (!profile) return { error: null };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .lte("fire_at", new Date().toISOString())
    .is("read_at", null);

  if (error) return { error: "Couldn't update notifications." };
  revalidatePath("/dashboard");
  return { error: null };
}
