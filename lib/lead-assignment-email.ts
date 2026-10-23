import "server-only";
import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { appOrigin } from "@/lib/app-url";
import { sendEmail, leadsAssignedEmail, type AssignedLeadSummary, type AssignmentReason } from "@/lib/email";

// "You have a new lead" email, sent when a lead lands on an agent by any route
// other than the agent creating it themselves: their own landing page, a
// manager assigning it, or a rebalance.
//
// It runs after the response is sent (next/server `after`), so a visitor
// submitting a landing-page form or a manager clicking Rebalance never waits on
// the mail provider -- and because sendEmail never throws and this wraps the
// rest, a mail problem can't undo or fail the assignment it describes.
//
// Call it from a Server Action / route handler, after the assignment has been
// saved. The caller decides when NOT to send (assigning a lead to yourself,
// an unchanged owner); this only decides whether the recipient can be mailed.
export async function queueLeadAssignedEmail(input: {
  agentId: string;
  reason: AssignmentReason;
  byName?: string | null;
  leads: AssignedLeadSummary[];
  // Defaults to leads.length; pass it when `leads` is a trimmed sample.
  total?: number;
}) {
  if (input.leads.length === 0) return;

  // Resolved now, while the request is still in scope -- the callback below
  // runs after the response.
  let origin: string;
  try {
    origin = await appOrigin();
  } catch {
    return;
  }

  after(async () => {
    try {
      const admin = createAdminClient();
      const { data: agent } = await admin
        .from("profiles")
        .select("full_name, email, is_active")
        .eq("id", input.agentId)
        .maybeSingle();
      // Deactivated people keep their row but must not get mail about new work.
      if (!agent || agent.is_active === false || !agent.email) return;

      const { subject, html } = leadsAssignedEmail({
        agentName: agent.full_name as string,
        reason: input.reason,
        byName: input.byName ?? null,
        leads: input.leads,
        total: input.total ?? input.leads.length,
        origin,
      });
      const result = await sendEmail({ to: agent.email as string, subject, html });
      if (!result.sent && result.error) {
        Sentry.captureMessage(`Lead assignment email not sent: ${result.error}`, {
          level: "warning",
          tags: { area: "lead-assignment-email", reason: input.reason },
        });
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { area: "lead-assignment-email", reason: input.reason } });
    }
  });
}
