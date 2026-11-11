"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import {
  BODY_MAX,
  DESCRIPTION_MAX,
  MIGRATION_MESSAGE,
  PAGE_URL_MAX,
  STATUS_LABEL,
  SUBJECT_MAX,
  SUBJECT_MIN,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "./constants";

// --- Support tickets ---------------------------------------------------------
//
// Who may do what (RLS says the same, this is the second wall):
//   * anyone signed in raises a ticket and replies on their own;
//   * SuperAdmins reply on any ticket and change its status, priority and
//     assignee;
//   * the raiser may only mark their own ticket resolved, or reopen it once
//     it is resolved. RLS only lets SuperAdmins update a ticket row, so those
//     two moves go through the service role -- strictly after the ownership
//     and current-status checks below.
// Closed is final for the raiser: nobody can reply on a closed ticket.

type Result = { error: string | null };

function isMissingSchema(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "42703";
}

function failure(error: { code?: string }, action: string, friendly: string): { error: string } {
  if (isMissingSchema(error)) return { error: MIGRATION_MESSAGE };
  Sentry.captureException(error, { tags: { action } });
  return { error: friendly };
}

type TicketHead = {
  id: string;
  ticket_no: number;
  subject: string;
  created_by: string;
  assigned_to: string | null;
  status: TicketStatus;
  priority: TicketPriority;
};

// Read through the caller's own session, so a ticket they may not see simply
// comes back null -- the same "not found" as one that doesn't exist.
async function loadHead(id: string): Promise<{ head: TicketHead | null; error: string | null }> {
  if (typeof id !== "string" || id.length === 0) return { head: null, error: "Ticket not found." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, ticket_no, subject, created_by, assigned_to, status, priority")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (isMissingSchema(error)) return { head: null, error: MIGRATION_MESSAGE };
    if (error.code === "22P02") return { head: null, error: "Ticket not found." };
    Sentry.captureException(error, { tags: { action: "support.loadHead" } });
    return { head: null, error: "Couldn't load the ticket. Please try again." };
  }
  if (!data) return { head: null, error: "Ticket not found." };
  return { head: { ...(data as TicketHead), ticket_no: Number(data.ticket_no) }, error: null };
}

async function superAdminIds(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("role", "superadmin").eq("is_active", true);
  return (data ?? []).map((p) => p.id as string);
}

// Best effort, like the audit_log inserts elsewhere: a failed bell row must
// never fail the ticket action that triggered it.
async function notify(profileIds: string[], title: string, body: string | null, ticketId: string) {
  const unique = [...new Set(profileIds)];
  if (unique.length === 0) return;
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert(
    unique.map((profile_id) => ({
      profile_id,
      kind: "support_ticket",
      title,
      body,
      href: `/support/tickets/${ticketId}`,
    })),
  );
  if (error) console.error("support ticket: notification insert failed", error);
}

async function audit(actorId: string, action: string, metadata: Record<string, unknown>) {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_log").insert({ actor_id: actorId, action, metadata });
  if (error) console.error(`${action}: audit_log insert failed`, error);
}

function snippet(text: string) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 120 ? `${flat.slice(0, 117)}...` : flat;
}

function revalidateTicket(id: string) {
  revalidatePath("/support/tickets");
  revalidatePath(`/support/tickets/${id}`);
}

// --- Raise ---------------------------------------------------------------------
export async function createTicket(input: {
  subject: string;
  category: string;
  priority: string;
  description: string;
  pageUrl?: string;
}): Promise<Result & { id?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const pageUrl = typeof input.pageUrl === "string" ? input.pageUrl.trim() : "";

  if (subject.length < SUBJECT_MIN || subject.length > SUBJECT_MAX) {
    return { error: `Subject must be ${SUBJECT_MIN}-${SUBJECT_MAX} characters.` };
  }
  if (!(TICKET_CATEGORIES as readonly string[]).includes(input.category)) return { error: "Choose a category." };
  if (!(TICKET_PRIORITIES as readonly string[]).includes(input.priority)) return { error: "Choose a priority." };
  if (description.length < 1 || description.length > DESCRIPTION_MAX) {
    return { error: `Describe the problem in 1-${DESCRIPTION_MAX} characters.` };
  }
  if (pageUrl.length > PAGE_URL_MAX) return { error: `The page link must be ${PAGE_URL_MAX} characters or fewer.` };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      created_by: profile.id,
      subject,
      category: input.category as TicketCategory,
      priority: input.priority as TicketPriority,
      description,
      page_url: pageUrl || null,
    })
    .select("id, ticket_no")
    .single();

  if (error || !data) {
    return failure(error ?? {}, "createTicket", "Couldn't raise the ticket. Please try again.");
  }

  const ticketNo = Number(data.ticket_no);
  const admins = (await superAdminIds()).filter((id) => id !== profile.id);
  await notify(admins, `New ticket #${ticketNo}: ${subject}`, `${profile.full_name} · ${snippet(description)}`, data.id as string);
  await audit(profile.id, "support_ticket_created", { ticket_id: data.id, ticket_no: ticketNo });

  revalidatePath("/support/tickets");
  return { error: null, id: data.id as string };
}

// --- Reply ---------------------------------------------------------------------
export async function replyToTicket(ticketId: string, body: string): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const text = typeof body === "string" ? body.trim() : "";
  if (text.length < 1 || text.length > BODY_MAX) return { error: `A reply must be 1-${BODY_MAX} characters.` };

  const { head, error: loadError } = await loadHead(ticketId);
  if (!head) return { error: loadError };

  const isAdmin = profile.role === "superadmin";
  const isRaiser = head.created_by === profile.id;
  if (!isAdmin && !isRaiser) return { error: "Not allowed." };
  if (head.status === "closed") return { error: "This ticket is closed, so it can't take new replies." };

  // Through the caller's own session -- RLS re-checks author and closed state.
  const supabase = await createClient();
  const { error } = await supabase
    .from("support_ticket_messages")
    .insert({ ticket_id: head.id, author_id: profile.id, body: text });
  if (error) return failure(error, "replyToTicket", "Couldn't send your reply. Please try again.");

  // A reply keeps the ticket moving: the raiser answering a question (or
  // replying after a resolve) puts it back in front of the team; a SuperAdmin
  // picking up an untouched ticket marks it in progress. Written with the
  // service role because the raiser has no UPDATE right on the row.
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  if (isRaiser && !isAdmin) {
    if (head.status === "waiting_on_agent") patch.status = "in_progress";
    if (head.status === "resolved") {
      patch.status = "open";
      patch.resolved_at = null;
    }
  } else if (isAdmin && head.status === "open") {
    patch.status = "in_progress";
  }
  const admin = createAdminClient();
  const { error: bumpError } = await admin.from("support_tickets").update(patch).eq("id", head.id);
  if (bumpError) console.error("replyToTicket: ticket bump failed", bumpError);

  if (isAdmin && !isRaiser) {
    await notify([head.created_by], `New reply on ticket #${head.ticket_no}`, snippet(text), head.id);
  } else if (isRaiser) {
    const targets = head.assigned_to ? [head.assigned_to] : await superAdminIds();
    await notify(
      targets.filter((id) => id !== profile.id),
      `Ticket #${head.ticket_no}: new reply from ${profile.full_name}`,
      snippet(text),
      head.id,
    );
  }

  revalidateTicket(head.id);
  return { error: null };
}

// --- SuperAdmin controls -------------------------------------------------------
export async function updateTicketStatus(ticketId: string, status: string): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") return { error: "Not allowed." };
  if (!(TICKET_STATUSES as readonly string[]).includes(status)) return { error: "Choose a valid status." };
  const next = status as TicketStatus;

  const { head, error: loadError } = await loadHead(ticketId);
  if (!head) return { error: loadError };
  if (head.status === next) return { error: null };

  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin
    .from("support_tickets")
    .update({
      status: next,
      updated_at: now,
      resolved_at: next === "resolved" || next === "closed" ? now : null,
    })
    .eq("id", head.id);
  if (error) return failure(error, "updateTicketStatus", "Couldn't update the ticket. Please try again.");

  if (head.created_by !== profile.id) {
    await notify([head.created_by], `Ticket #${head.ticket_no}: ${STATUS_LABEL[next]}`, head.subject, head.id);
  }
  await audit(profile.id, "support_ticket_status", {
    ticket_id: head.id,
    ticket_no: head.ticket_no,
    from: head.status,
    to: next,
  });

  revalidateTicket(head.id);
  return { error: null };
}

export async function updateTicketPriority(ticketId: string, priority: string): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") return { error: "Not allowed." };
  if (!(TICKET_PRIORITIES as readonly string[]).includes(priority)) return { error: "Choose a valid priority." };

  const { head, error: loadError } = await loadHead(ticketId);
  if (!head) return { error: loadError };
  if (head.priority === priority) return { error: null };

  const admin = createAdminClient();
  const { error } = await admin
    .from("support_tickets")
    .update({ priority: priority as TicketPriority, updated_at: new Date().toISOString() })
    .eq("id", head.id);
  if (error) return failure(error, "updateTicketPriority", "Couldn't update the ticket. Please try again.");

  await audit(profile.id, "support_ticket_priority", {
    ticket_id: head.id,
    ticket_no: head.ticket_no,
    from: head.priority,
    to: priority,
  });

  revalidateTicket(head.id);
  return { error: null };
}

// `assigneeId` of "" unassigns. Only an active SuperAdmin is accepted.
export async function updateTicketAssignee(ticketId: string, assigneeId: string): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") return { error: "Not allowed." };
  if (typeof assigneeId !== "string") return { error: "Choose who to assign it to." };

  const { head, error: loadError } = await loadHead(ticketId);
  if (!head) return { error: loadError };

  const target = assigneeId.trim() || null;
  const admin = createAdminClient();
  if (target) {
    const { data: person } = await admin
      .from("profiles")
      .select("id")
      .eq("id", target)
      .eq("role", "superadmin")
      .eq("is_active", true)
      .maybeSingle();
    if (!person) return { error: "Tickets can only be assigned to a SuperAdmin." };
  }
  if (head.assigned_to === target) return { error: null };

  const { error } = await admin
    .from("support_tickets")
    .update({ assigned_to: target, updated_at: new Date().toISOString() })
    .eq("id", head.id);
  if (error) return failure(error, "updateTicketAssignee", "Couldn't update the ticket. Please try again.");

  if (target && target !== profile.id) {
    await notify([target], `Ticket #${head.ticket_no} assigned to you`, head.subject, head.id);
  }
  await audit(profile.id, "support_ticket_assignee", {
    ticket_id: head.id,
    ticket_no: head.ticket_no,
    assigned_to: target,
  });

  revalidateTicket(head.id);
  return { error: null };
}

// --- Raiser transitions --------------------------------------------------------
// The two moves a non-SuperAdmin may make on a ticket row. Ownership and the
// current status are verified first; only then does the service role write.
export async function raiserResolve(ticketId: string): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const { head, error: loadError } = await loadHead(ticketId);
  if (!head) return { error: loadError };
  if (head.created_by !== profile.id) return { error: "Only the person who raised this ticket can do that." };
  if (head.status === "resolved" || head.status === "closed") return { error: "This ticket is already resolved." };

  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin
    .from("support_tickets")
    .update({ status: "resolved", updated_at: now, resolved_at: now })
    .eq("id", head.id);
  if (error) return failure(error, "raiserResolve", "Couldn't update the ticket. Please try again.");

  const targets = head.assigned_to ? [head.assigned_to] : await superAdminIds();
  await notify(
    targets.filter((id) => id !== profile.id),
    `Ticket #${head.ticket_no}: marked resolved by ${profile.full_name}`,
    head.subject,
    head.id,
  );
  await audit(profile.id, "support_ticket_status", {
    ticket_id: head.id,
    ticket_no: head.ticket_no,
    from: head.status,
    to: "resolved",
    by: "raiser",
  });

  revalidateTicket(head.id);
  return { error: null };
}

export async function raiserReopen(ticketId: string): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const { head, error: loadError } = await loadHead(ticketId);
  if (!head) return { error: loadError };
  if (head.created_by !== profile.id) return { error: "Only the person who raised this ticket can do that." };
  // A closed ticket stays closed -- reopening is only for a resolved one.
  if (head.status !== "resolved") return { error: "Only a resolved ticket can be reopened." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("support_tickets")
    .update({ status: "open", updated_at: new Date().toISOString(), resolved_at: null })
    .eq("id", head.id);
  if (error) return failure(error, "raiserReopen", "Couldn't update the ticket. Please try again.");

  const targets = head.assigned_to ? [head.assigned_to] : await superAdminIds();
  await notify(
    targets.filter((id) => id !== profile.id),
    `Ticket #${head.ticket_no}: reopened by ${profile.full_name}`,
    head.subject,
    head.id,
  );
  await audit(profile.id, "support_ticket_status", {
    ticket_id: head.id,
    ticket_no: head.ticket_no,
    from: "resolved",
    to: "open",
    by: "raiser",
  });

  revalidateTicket(head.id);
  return { error: null };
}
