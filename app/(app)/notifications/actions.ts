"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

export type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  fireAt: string;
  readAt: string | null;
};

// The inbox is "everything already due" -- a reminder row exists from the
// moment the appointment is booked, but stays invisible until its fire_at
// passes. That is what replaces a scheduler here.
const INBOX_LIMIT = 30;

export async function getNotifications(): Promise<NotificationRow[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, href, fire_at, read_at")
    .lte("fire_at", new Date().toISOString())
    .order("fire_at", { ascending: false })
    .limit(INBOX_LIMIT);

  return (data ?? []).map((n) => ({
    id: n.id as string,
    kind: n.kind as string,
    title: n.title as string,
    body: (n.body as string | null) ?? null,
    href: (n.href as string | null) ?? null,
    fireAt: n.fire_at as string,
    readAt: (n.read_at as string | null) ?? null,
  }));
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
