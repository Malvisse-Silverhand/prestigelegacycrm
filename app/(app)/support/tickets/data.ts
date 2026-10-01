import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABEL, type Role } from "@/lib/profile-types";
import type {
  StaffOption,
  TicketCategory,
  TicketDetail,
  TicketMessage,
  TicketPriority,
  TicketRow,
  TicketStatus,
} from "./constants";

// 42P01 = table missing, 42703 = column missing: the migration hasn't been run.
function isMissingSchema(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "42703";
}

type ProfileBits = { name: string; initials: string; roleLabel: string };

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

// Names of the people on a ticket. The user-session client can't be trusted to
// see them -- an agent's profiles RLS doesn't necessarily include the
// SuperAdmin who answered -- so this goes through the service role. It is only
// ever called with ids taken from tickets/messages the caller has ALREADY been
// allowed to read, and only returns a name, initials and role label.
async function loadProfiles(ids: string[]): Promise<Map<string, ProfileBits>> {
  const out = new Map<string, ProfileBits>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return out;
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, role, avatar_initials")
    .in("id", unique);
  for (const p of data ?? []) {
    out.set(p.id as string, {
      name: p.full_name as string,
      initials: ((p.avatar_initials as string | null) || initialsFrom(p.full_name as string)) as string,
      roleLabel: ROLE_LABEL[p.role as Role] ?? "Agent",
    });
  }
  return out;
}

type RawTicket = {
  id: string;
  ticket_no: number | string;
  created_by: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  page_url: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

const TICKET_COLUMNS =
  "id, ticket_no, created_by, subject, category, priority, status, description, page_url, assigned_to, created_at, updated_at, resolved_at";

function toRow(t: RawTicket, profiles: Map<string, ProfileBits>, replyCount: number): TicketRow {
  return {
    id: t.id,
    ticketNo: Number(t.ticket_no),
    subject: t.subject,
    category: t.category as TicketCategory,
    priority: t.priority as TicketPriority,
    status: t.status as TicketStatus,
    createdBy: t.created_by,
    raiserName: profiles.get(t.created_by)?.name ?? "Unknown",
    assignedTo: t.assigned_to,
    assigneeName: t.assigned_to ? (profiles.get(t.assigned_to)?.name ?? null) : null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    replyCount,
  };
}

export type TicketListResult = { setup: true; tickets: TicketRow[] } | { setup: false; tickets: [] };

// RLS does the scoping: an agent's query returns only their own tickets, a
// SuperAdmin's returns everything.
export async function getTickets(): Promise<TicketListResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select(TICKET_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    if (isMissingSchema(error)) return { setup: false, tickets: [] };
    Sentry.captureException(error, { tags: { action: "getTickets" } });
    return { setup: true, tickets: [] };
  }

  const rows = (data ?? []) as RawTicket[];
  if (rows.length === 0) return { setup: true, tickets: [] };

  const ids = rows.map((t) => t.id);
  const [{ data: msgs }, profiles] = await Promise.all([
    supabase.from("support_ticket_messages").select("ticket_id").in("ticket_id", ids),
    loadProfiles(rows.flatMap((t) => [t.created_by, ...(t.assigned_to ? [t.assigned_to] : [])])),
  ]);

  const counts = new Map<string, number>();
  for (const m of msgs ?? []) counts.set(m.ticket_id as string, (counts.get(m.ticket_id as string) ?? 0) + 1);

  return { setup: true, tickets: rows.map((t) => toRow(t, profiles, counts.get(t.id) ?? 0)) };
}

export type TicketDetailResult =
  | { state: "not_setup" }
  | { state: "not_found" }
  | { state: "ok"; detail: TicketDetail };

export async function getTicketDetail(id: string): Promise<TicketDetailResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("support_tickets").select(TICKET_COLUMNS).eq("id", id).maybeSingle();

  if (error) {
    if (isMissingSchema(error)) return { state: "not_setup" };
    // A malformed uuid lands here too (22P02) -- treat it as "no such ticket".
    if (error.code !== "22P02") Sentry.captureException(error, { tags: { action: "getTicketDetail" } });
    return { state: "not_found" };
  }
  if (!data) return { state: "not_found" };

  const ticket = data as RawTicket;
  const { data: msgs, error: msgError } = await supabase
    .from("support_ticket_messages")
    .select("id, author_id, body, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });
  if (msgError && !isMissingSchema(msgError)) {
    Sentry.captureException(msgError, { tags: { action: "getTicketDetail.messages" } });
  }

  const messageRows = msgs ?? [];
  const profiles = await loadProfiles([
    ticket.created_by,
    ...(ticket.assigned_to ? [ticket.assigned_to] : []),
    ...messageRows.map((m) => m.author_id as string),
  ]);

  const messages: TicketMessage[] = messageRows.map((m) => {
    const p = profiles.get(m.author_id as string);
    return {
      id: m.id as string,
      authorId: m.author_id as string,
      authorName: p?.name ?? "Unknown",
      authorInitials: p?.initials ?? "?",
      authorRoleLabel: p?.roleLabel ?? "",
      body: m.body as string,
      createdAt: m.created_at as string,
    };
  });

  const raiser = profiles.get(ticket.created_by);
  return {
    state: "ok",
    detail: {
      ticket: {
        ...toRow(ticket, profiles, messages.length),
        description: ticket.description,
        pageUrl: ticket.page_url,
        resolvedAt: ticket.resolved_at,
        raiserInitials: raiser?.initials ?? "?",
        raiserRoleLabel: raiser?.roleLabel ?? "",
      },
      messages,
    },
  };
}

// SuperAdmins a ticket can be assigned to. Service role because it is only
// called from the SuperAdmin view, after that check.
export async function getSuperAdmins(): Promise<StaffOption[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "superadmin")
    .eq("is_active", true)
    .order("full_name");
  return (data ?? []).map((p) => ({ id: p.id as string, name: p.full_name as string }));
}
