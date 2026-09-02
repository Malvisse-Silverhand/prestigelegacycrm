"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateQuotationStatus, deleteQuotations } from "./actions";

const PRODUCT_LABEL: Record<string, string> = {
  imedi_evolusi: "i-Medi Evolusi",
  hibah_nova: "Hibah i-Great Nova",
  hibah_chinta: "Hibah i-Great Chinta",
  hibah_mixed: "Hibah (mixed)",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-sand-3 text-taupe-2",
  sent: "bg-info-blue-bg text-info-blue-text",
  accepted: "bg-success-bg text-green",
};

const STATUSES = ["draft", "sent", "accepted"] as const;

export type QuotationRowView = {
  id: string;
  lead_id: string | null;
  product: string;
  status: string;
  clientName: string;
  agentName: string;
  contribution: number | null;
};

function fmtRM(n: number | null) {
  if (n === null) return "—";
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const GRID = "grid grid-cols-[36px_1.5fr_1.3fr_1fr_.9fr_1.1fr_92px]";

export function QuotationTable({
  quotations,
  canDelete,
}: {
  quotations: QuotationRowView[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<QuotationRowView | null>(null);
  const [confirming, setConfirming] = useState<QuotationRowView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allSelected = quotations.length > 0 && selected.size === quotations.length;

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(quotations.map((q) => q.id)));
  }

  function applyStatus(ids: string[], status: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateQuotationStatus(ids, status);
        if (result.error) {
          setError(result.error);
          return;
        }
        setSelected(new Set());
        setEditing(null);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  function confirmDelete(rows: QuotationRowView[]) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteQuotations(rows.map((r) => r.id));
        if (result.error) {
          setError(result.error);
          return;
        }
        setSelected(new Set());
        setConfirming(null);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
          {error}
        </div>
      )}

      {/* Bulk bar -- only appears once something is selected, so the page stays
          quiet in its normal state. */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-[12px] border border-sand-2 bg-cream px-4 py-3">
          <span className="text-[12.5px] font-bold text-navy">
            {selected.size} selected
          </span>
          <span className="text-[12px] font-medium text-muted">Set status to</span>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => applyStatus([...selected], s)}
              className="rounded-[9px] border border-sand-2 bg-white px-3 py-1.5 text-[12px] font-semibold text-navy capitalize hover:border-navy disabled:opacity-60"
            >
              {s}
            </button>
          ))}
          <div className="flex-1" />
          {canDelete && (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(quotations.filter((q) => selected.has(q.id)))}
              className="rounded-[9px] border border-[#f6d5cf] px-3 py-1.5 text-[12px] font-semibold text-alert-red disabled:opacity-60"
            >
              Delete selected
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="rounded-[9px] px-2.5 py-1.5 text-[12px] font-semibold text-muted"
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-card">
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <div className={`${GRID} bg-navy px-5 py-[13px] text-[10.5px] font-bold tracking-[0.07em] text-white/72 uppercase`}>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all quotations"
                  className="h-[15px] w-[15px] cursor-pointer accent-gold"
                />
              </div>
              <div>Client</div>
              <div>Product</div>
              <div>Contribution</div>
              <div>Status</div>
              <div>Agent</div>
              <div className="text-right">Actions</div>
            </div>

            {quotations.map((q) => (
              <div
                key={q.id}
                className={`${GRID} items-center border-b border-sand-3 px-5 py-3.5 text-[12.5px] text-ink last:border-b-0 ${
                  selected.has(q.id) ? "bg-cream" : ""
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selected.has(q.id)}
                    onChange={() => toggle(q.id)}
                    aria-label={`Select quotation for ${q.clientName}`}
                    className="h-[15px] w-[15px] cursor-pointer accent-navy"
                  />
                </div>
                <div className="truncate font-bold text-navy">
                  {q.lead_id ? (
                    <Link href={`/leads/${q.lead_id}`} className="hover:underline">
                      {q.clientName}
                    </Link>
                  ) : (
                    q.clientName
                  )}
                </div>
                <div className="font-medium">{PRODUCT_LABEL[q.product] ?? q.product}</div>
                <div className="font-semibold text-navy">
                  {fmtRM(q.contribution)}
                  {q.contribution !== null && <span className="text-taupe">/mo</span>}
                </div>
                <div>
                  <span
                    className={`inline-block rounded-[7px] px-[9px] py-1 text-[10.5px] font-bold capitalize ${
                      STATUS_STYLE[q.status] ?? "bg-sand-3 text-taupe-2"
                    }`}
                  >
                    {q.status}
                  </span>
                </div>
                <div className="truncate font-semibold text-green">{q.agentName}</div>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditing(q)}
                    aria-label="Edit quotation"
                    title="Edit status"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-sand-2 bg-cream text-navy"
                  >
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
                      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
                    </svg>
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirming([q])}
                      aria-label="Delete quotation"
                      title="Delete"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f6d5cf] text-alert-red"
                    >
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-[15px] font-bold text-navy">Edit quotation</div>
            <p className="mt-1 text-[12.5px] text-muted">
              {editing.clientName} · {PRODUCT_LABEL[editing.product] ?? editing.product}
            </p>
            <p className="mt-4 text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Status</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pending}
                  onClick={() => applyStatus([editing.id], s)}
                  className={`rounded-[10px] border px-3 py-2.5 text-[12.5px] font-semibold capitalize disabled:opacity-60 ${
                    editing.status === s ? "border-navy bg-navy text-white" : "border-sand-2 bg-cream text-navy"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] text-taupe">
              The figures themselves come from the calculator or customizer — reopen the quotation from the
              lead to change those.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-[15px] font-bold text-navy">
              Delete {confirming.length === 1 ? "this quotation" : `${confirming.length} quotations`}?
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              {confirming.length === 1
                ? `${confirming[0].clientName} · ${PRODUCT_LABEL[confirming[0].product] ?? confirming[0].product}. `
                : ""}
              This also removes the saved plan options. It can&apos;t be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => confirmDelete(confirming)}
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
