"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { QuotationRow } from "./data";
import { QuotationIcon } from "@/components/icons";
import { deleteQuotations } from "@/app/(app)/quotations/actions";

const PRODUCT_LABEL: Record<string, string> = {
  imedi_evolusi: "Medical Card — i-Medi Evolusi",
  hibah_nova: "Hibah — i-Great Nova",
  hibah_chinta: "Hibah — i-Great Chinta",
  hibah_mixed: "Hibah — i-Great Nova / Chinta",
};

function fmtRM(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function LeadQuotations({
  quotations,
  onOpen,
  canDelete,
}: {
  quotations: QuotationRow[];
  onOpen: (quotation: QuotationRow) => void;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<QuotationRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (quotations.length === 0) return null;

  function confirmDelete(q: QuotationRow) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteQuotations([q.id]);
        if (result.error) {
          setError(result.error);
          return;
        }
        setConfirming(null);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="rounded-[14px] border border-sand bg-white p-[18px]">
      <div className="flex items-center gap-2">
        <QuotationIcon width={15} height={15} className="text-warn-gold-text" />
        <div className="text-[13px] font-bold text-navy">
          Saved quotations <span className="font-semibold text-taupe">({quotations.length})</span>
        </div>
      </div>

      {error && (
        <div className="mt-2.5 rounded-[9px] bg-alert-red-bg px-3 py-2 text-[11.5px] font-medium text-alert-red">
          {error}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {quotations.map((q) => {
          // Only customizer-authored quotations carry the state needed to
          // rebuild the editor. A calculator quotation instead reopens in its
          // own calculator, which re-renders the full benefits breakdown.
          const editable = q.raw_payload?.__customizer === true;
          const primary = q.quotation_plans[0] ?? null;

          return (
            <div
              key={q.id}
              className={`rounded-[11px] border px-3.5 py-3 ${
                editable
                  ? "border-gold/45 bg-warn-gold-bg"
                  : "border-info-blue-mid/35 bg-info-blue-bg"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex-none rounded-[5px] px-1.5 py-[1px] text-[9px] font-bold tracking-[0.05em] uppercase ${
                        editable
                          ? "bg-gold/30 text-warn-gold-text"
                          : "bg-info-blue-mid/25 text-info-blue-text"
                      }`}
                    >
                      {editable ? "Quotation" : "Estimate"}
                    </span>
                    <div className="truncate text-[12.5px] font-bold text-navy">
                      {PRODUCT_LABEL[q.product] ?? q.product}
                    </div>
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-taupe">
                    {fmtWhen(q.created_at)} · {q.quotation_plans.length} plan
                    {q.quotation_plans.length === 1 ? "" : "s"}
                    {q.language ? ` · ${q.language.toUpperCase()}` : ""}
                  </div>
                </div>
                <div className="flex flex-none flex-col items-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpen(q)}
                    className="rounded-[9px] border border-sand-2 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-navy hover:border-navy"
                  >
                    {editable ? "Preview / Edit" : "Preview quotation"}
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirming(q)}
                      className="rounded-[9px] border border-[#f6d5cf] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-alert-red hover:border-alert-red"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {primary && (
                <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 border-t border-sand-3 pt-2.5">
                  {q.quotation_plans.map((p) => (
                    <div key={p.sort_order} className="min-w-0">
                      <div className="truncate text-[10px] font-bold tracking-[0.06em] text-taupe-2 uppercase">
                        {p.plan_label}
                      </div>
                      <div className="text-[12px] font-extrabold text-navy">
                        {fmtRM(p.monthly_contribution)}
                        <span className="text-[9.5px] font-semibold text-taupe">/mo</span>
                        <span className="ml-1.5 text-[10.5px] font-semibold text-green">
                          {fmtRM(p.annual_contribution)}
                          <span className="text-[9px] text-taupe">/yr</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!editable && (
                <div className="mt-2 text-[10.5px] font-medium text-taupe">
                  Generated by a calculator — opens the full benefits breakdown.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-[15px] font-bold text-navy">Delete this quotation?</div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              {PRODUCT_LABEL[confirming.product] ?? confirming.product} · {fmtWhen(confirming.created_at)}.
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
