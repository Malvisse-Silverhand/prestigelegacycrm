import "server-only";
import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { appOrigin } from "@/lib/app-url";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail, leadsAssignedEmail, type AssignedLeadSummary } from "@/lib/email";

// One email per agent per uploaded-and-assigned batch: "<manager> assigned you
// 30 leads", with a few names and a button to the list filtered to that batch.
//
// A bulk upload can fan out to dozens of agents at once, so this is paced and
// capped to protect the mail provider and the server:
//   * sends are sequential, ~600 ms apart (Resend allows ~2 requests/second),
//     with one retry after a pause if it answers "too many requests";
//   * each agent gets at most AGENT_EMAILS_PER_HOUR of these an hour;
//   * all bulk emails together are capped at GLOBAL_EMAILS_PER_HOUR an hour;
//   * a single batch emails at most MAX_RECIPIENTS agents.
// Anyone skipped (opted out, inactive, no email, over a cap) is counted and the
// totals are written to the batch row, so the manager can see them. The bell
// notification is created separately and is never affected by any of this.
//
// Runs after the response (`after`), so the manager isn't kept waiting.
export const AGENT_EMAILS_PER_HOUR = 3;
export const GLOBAL_EMAILS_PER_HOUR = 150;
export const MAX_RECIPIENTS = 80;
const SPACING_MS = 600;
const RETRY_PAUSE_MS = 1500;

export type BulkRecipient = {
  agentId: string;
  total: number;
  // A handful of the leads they received, for the email body.
  sample: AssignedLeadSummary[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function queueBulkAssignmentEmails(input: {
  batchId: string;
  byName: string;
  recipients: BulkRecipient[];
  // False when the uploader has already finalised too many batches this hour:
  // everyone is skipped (and counted) but the bell still goes out.
  allowed: boolean;
}) {
  if (input.recipients.length === 0) return { queued: 0 };

  let origin: string;
  try {
    origin = await appOrigin();
  } catch {
    return { queued: 0 };
  }

  after(async () => {
    let sent = 0;
    let skipped = 0;
    try {
      const admin = createAdminClient();

      if (!input.allowed) {
        skipped = input.recipients.length;
      } else {
        const targets = input.recipients.slice(0, MAX_RECIPIENTS);
        skipped += input.recipients.length - targets.length;

        const ids = targets.map((t) => t.agentId);
        const withPref = await admin
          .from("profiles")
          .select("id, full_name, email, is_active, lead_emails_enabled")
          .in("id", ids);
        let profs = withPref.data;
        if (withPref.error) {
          // 42703: the opt-out migration hasn't run -- everyone is "on".
          const fallback = await admin.from("profiles").select("id, full_name, email, is_active").in("id", ids);
          profs = fallback.data as typeof profs;
        }
        const byId = new Map((profs ?? []).map((p) => [p.id as string, p]));

        let first = true;
        for (const t of targets) {
          const agent = byId.get(t.agentId);
          if (!agent || agent.is_active === false || !agent.email || agent.lead_emails_enabled === false) {
            skipped++;
            continue;
          }
          if (!(await checkRateLimit("lead-email-bulk-agent", t.agentId, AGENT_EMAILS_PER_HOUR, 3600))) {
            skipped++;
            continue;
          }
          if (!(await checkRateLimit("lead-email-bulk-global", "all", GLOBAL_EMAILS_PER_HOUR, 3600))) {
            skipped++;
            continue;
          }

          const { subject, html } = leadsAssignedEmail({
            agentName: agent.full_name as string,
            reason: "upload",
            byName: input.byName,
            leads: t.sample,
            total: t.total,
            origin,
            listHref: `${origin}/leads?batch=${encodeURIComponent(input.batchId)}`,
          });

          if (!first) await sleep(SPACING_MS);
          first = false;

          let result = await sendEmail({ to: agent.email as string, subject, html });
          if (!result.sent && /rate|too many|429/i.test(result.error ?? "")) {
            await sleep(RETRY_PAUSE_MS);
            result = await sendEmail({ to: agent.email as string, subject, html });
          }
          if (result.sent) {
            sent++;
          } else {
            skipped++;
            if (result.error) {
              Sentry.captureMessage(`Bulk lead email not sent: ${result.error}`, {
                level: "warning",
                tags: { area: "bulk-assignment-email" },
              });
            }
          }
        }
      }

      await admin
        .from("lead_import_batches")
        .update({ emails_sent: sent, emails_skipped: skipped })
        .eq("id", input.batchId);
    } catch (err) {
      Sentry.captureException(err, { tags: { area: "bulk-assignment-email" } });
    }
  });

  return { queued: input.recipients.length };
}
