import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { appOrigin } from "@/lib/app-url";
import { leadAssignedEmail, sendEmail, type AssignedLeadSummary } from "@/lib/email";

// Emails an agent when a lead lands in their book -- from a landing page or
// QuickQuote form, a manager's reassign, or a rebalance. One email per call,
// however many leads, so a rebalance of forty leads is one message.
//
// Best effort, like dispatchWebhook: the lead is already saved, so this never
// throws and never blocks the action that triggered it. Failures go to Sentry.
// Pass `actorId` when a person caused the assignment -- nobody is emailed about
// a lead they just gave themselves.
export async function emailAgentLeadsAssigned(input: {
  agentId: string | null;
  leadIds: string[];
  via: string;
  actorId?: string | null;
}): Promise<void> {
  try {
    if (!input.agentId || input.leadIds.length === 0) return;
    if (input.actorId && input.actorId === input.agentId) return;

    const admin = createAdminClient();
    const [{ data: agent }, { data: leads }] = await Promise.all([
      admin.from("profiles").select("full_name, email, is_active").eq("id", input.agentId).maybeSingle(),
      admin
        .from("leads")
        .select("id, lead_no, full_name, phone, interest, lead_source")
        .in("id", input.leadIds)
        .order("created_at", { ascending: true }),
    ]);
    if (!agent?.email || agent.is_active === false || !leads || leads.length === 0) return;

    const summaries: AssignedLeadSummary[] = leads.map((l) => ({
      id: l.id as string,
      leadNo: l.lead_no == null ? null : Number(l.lead_no),
      fullName: l.full_name as string,
      phone: (l.phone as string | null) ?? null,
      interest: (l.interest as string | null) ?? null,
      source: (l.lead_source as string | null) ?? null,
    }));

    const mail = leadAssignedEmail({
      agentName: agent.full_name as string,
      leads: summaries,
      via: input.via,
      origin: await appOrigin(),
    });
    const result = await sendEmail({ to: agent.email as string, ...mail });
    if (!result.sent) {
      Sentry.captureMessage(`Lead-assigned email not sent: ${result.error ?? "unknown"}`, {
        level: "warning",
        tags: { area: "email", kind: "lead_assigned" },
        extra: { agentId: input.agentId, leads: input.leadIds.length },
      });
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "email", kind: "lead_assigned" } });
  }
}
