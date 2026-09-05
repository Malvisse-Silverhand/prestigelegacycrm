"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WebhookRow } from "../types";
import { saveWebhook, setWebhookEnabled, deleteWebhook } from "../actions";
import { WEBHOOK_EVENTS, webhookEventLabel } from "@/lib/webhook-events";

type Draft = { id: string | null; name: string; url: string; event: string };

const BLANK: Draft = { id: null, name: "", url: "", event: WEBHOOK_EVENTS[0].value };

export function WebhooksTab({ webhooks }: { webhooks: WebhookRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WebhookRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error: string | null }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await fn();
        if (result.error) {
          setError(result.error);
          return;
        }
        onDone?.();
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="max-w-[720px] rounded-[18px] border border-sand bg-white px-[22px] pb-[22px] pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-bold text-navy">Webhooks</div>
          <div className="mt-[3px] text-[11.5px] font-medium text-taupe">
            POST lead events to Pabbly Connect (or any endpoint that accepts JSON). Add as many as you need.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setDraft(BLANK);
          }}
          className="flex flex-none items-center gap-1.5 rounded-[10px] bg-gold px-3.5 py-2.5 text-[12.5px] font-bold text-navy shadow-sm hover:brightness-95"
        >
          + Add webhook URL
        </button>
      </div>

      {error && <div className="mt-3 text-[12px] font-medium text-alert-red">{error}</div>}

      {webhooks.length === 0 && !draft ? (
        <div className="mt-5 rounded-xl border border-dashed border-taupe px-4 py-6 text-center text-[12.5px] font-medium text-taupe-2">
          No webhooks yet. Add one to start pushing leads out as they arrive.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {webhooks.map((w) => (
            <div key={w.id} className="rounded-[12px] border border-sand-2 bg-cream px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-bold text-navy">{w.name}</span>
                    <span className="flex-none rounded-[6px] bg-info-blue-bg px-2 py-[2px] text-[9.5px] font-bold text-info-blue-text">
                      {webhookEventLabel(w.event)}
                    </span>
                    {!w.isEnabled && (
                      <span className="flex-none rounded-[6px] bg-sand-2 px-2 py-[2px] text-[9.5px] font-bold text-taupe-2">
                        PAUSED
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-muted">{w.url}</div>
                  {w.lastFiredAt && (
                    <div className="mt-1 text-[10.5px] font-medium text-taupe">
                      Last fired {new Date(w.lastFiredAt).toLocaleString("en-MY", {
                        day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                      })}
                      {w.lastStatus ? ` · ${w.lastStatus}` : ""}
                    </div>
                  )}
                </div>
                <div className="flex flex-none items-center gap-1.5">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setWebhookEnabled(w.id, !w.isEnabled))}
                    className="rounded-[9px] border border-sand-2 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-navy disabled:opacity-60"
                  >
                    {w.isEnabled ? "Pause" : "Resume"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      setDraft({ id: w.id, name: w.name, url: w.url, event: w.event });
                    }}
                    className="rounded-[9px] border border-sand-2 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-navy disabled:opacity-60"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirmDelete(w)}
                    className="rounded-[9px] border border-[#f6d5cf] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-alert-red disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <div className="mt-4 rounded-[12px] border-2 border-navy bg-white px-3.5 py-3.5">
          <div className="text-[13px] font-bold text-navy">{draft.id ? "Edit webhook" : "New webhook"}</div>
          <div className="mt-3 flex flex-col gap-3">
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">Name</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Pabbly — new lead to WhatsApp"
                className="mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">Webhook URL</span>
              <input
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                placeholder="https://connect.pabbly.com/workflow/sendwebhookdata/..."
                className="mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 font-mono text-[12px] text-navy outline-none focus:border-gold"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">Fires on</span>
              <select
                value={draft.event}
                onChange={(e) => setDraft({ ...draft, event: e.target.value })}
                className="mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
              >
                {WEBHOOK_EVENTS.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
              <p className="mt-1 text-[10.5px] font-medium text-taupe">
                {WEBHOOK_EVENTS.find((e) => e.value === draft.event)?.hint}
              </p>
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || !draft.name.trim() || !draft.url.trim()}
                onClick={() => run(() => saveWebhook(draft), () => setDraft(null))}
                className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save webhook"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-[15px] font-bold text-navy">Delete this webhook?</div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              {confirmDelete.name} will stop receiving {webhookEventLabel(confirmDelete.event).toLowerCase()} events.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteWebhook(confirmDelete.id), () => setConfirmDelete(null))}
                className="rounded-[10px] bg-alert-red px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
