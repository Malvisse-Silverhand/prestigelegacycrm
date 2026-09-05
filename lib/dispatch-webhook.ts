import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WebhookEvent } from "@/lib/webhook-events";

const TIMEOUT_MS = 8000;

// Fires every enabled webhook registered for this event.
//
// Deliberately never throws and never blocks the caller's result: a lead is
// saved whether or not Pabbly is reachable, so a failing webhook must not turn
// a successful save into an error toast. Failures are recorded on the row
// (surfaced in Settings > Webhooks) and reported to Sentry.
//
// Reads through the service role because the webhook table is admin-only by
// RLS, while the events that fire it (an agent creating a lead, moving a
// stage) come from users who can't see that table.
export async function dispatchWebhook(event: WebhookEvent, payload: Record<string, unknown>) {
  try {
    const admin = createAdminClient();
    const { data: hooks, error } = await admin
      .from("webhooks")
      .select("id, url")
      .eq("event", event)
      .eq("is_enabled", true);

    if (error) {
      Sentry.captureException(error, { tags: { area: "webhook", step: "load", event } });
      return;
    }
    if (!hooks || hooks.length === 0) return;

    const body = JSON.stringify({ event, firedAt: new Date().toISOString(), data: payload });

    await Promise.all(
      hooks.map(async (hook) => {
        let status = "";
        try {
          const res = await fetch(hook.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            signal: AbortSignal.timeout(TIMEOUT_MS),
          });
          status = res.ok ? `${res.status} OK` : `${res.status} ${res.statusText}`;
          if (!res.ok) {
            Sentry.captureException(new Error(`Webhook ${event} -> ${res.status}`), {
              tags: { area: "webhook", event },
              extra: { webhookId: hook.id },
            });
          }
        } catch (err) {
          // Timeout, DNS failure, connection reset -- the delivery failed but
          // the action that triggered it already succeeded.
          status = err instanceof Error ? `Failed: ${err.message}`.slice(0, 120) : "Failed";
          Sentry.captureException(err, { tags: { area: "webhook", event }, extra: { webhookId: hook.id } });
        }
        await admin
          .from("webhooks")
          .update({ last_status: status, last_fired_at: new Date().toISOString() })
          .eq("id", hook.id);
      }),
    );
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "webhook", step: "dispatch", event } });
  }
}
