// Only events the app actually fires belong here -- an option in the picker
// that never fires would look configured and silently do nothing.
export const WEBHOOK_EVENTS = [
  {
    value: "lead_created",
    label: "Lead created",
    hint: "Fires when a lead is added by hand or through the Google Sheets import.",
  },
  {
    value: "lead_stage_changed",
    label: "Lead stage changed",
    hint: "Fires when a lead moves between pipeline stages.",
  },
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]["value"];

export function isWebhookEvent(v: string): v is WebhookEvent {
  return WEBHOOK_EVENTS.some((e) => e.value === v);
}

export function webhookEventLabel(v: string) {
  return WEBHOOK_EVENTS.find((e) => e.value === v)?.label ?? v;
}
