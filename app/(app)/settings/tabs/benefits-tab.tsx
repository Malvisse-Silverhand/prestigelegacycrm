"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBenefit, setBenefitActive, deleteBenefit, reorderBenefit } from "../actions";
import type { BenefitOption } from "@/app/(app)/my-sales/types";

const input =
  "h-[38px] w-full rounded-[9px] border border-sand-2 bg-cream px-3 text-[12.5px] font-medium text-navy outline-none focus:border-gold placeholder:text-taupe";

function fmtRM(n: number | null) {
  if (n == null) return "—";
  return `RM${n.toLocaleString("en-MY", { maximumFractionDigits: 2 })}`;
}

type Draft = {
  id: string | null;
  name: string;
  defaultSumCovered: string;
  description: string;
  sortOrder: string;
};

function draftFrom(b: BenefitOption): Draft {
  return {
    id: b.id,
    name: b.name,
    defaultSumCovered: b.defaultSumCovered == null ? "" : String(b.defaultSumCovered),
    description: b.description ?? "",
    sortOrder: String(b.sortOrder),
  };
}

/**
 * The benefit list the Submit Case form offers.
 *
 * This used to be four names hard-coded in the app, so adding a fifth needed a
 * deploy. The operator adds products faster than that, and the name has to
 * match theirs exactly, so it lives here instead -- with the standard sum
 * covered that prefills the case row and a description the agent sees at the
 * moment of choosing.
 */
export function BenefitsTab({ benefits, canManage }: { benefits: BenefitOption[]; canManage: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startNew() {
    setError(null);
    setDraft({
      id: null,
      name: "",
      defaultSumCovered: "",
      description: "",
      // Lands at the bottom of the dropdown rather than silently tying with
      // whatever already sits at 0.
      sortOrder: String(benefits.reduce((max, b) => Math.max(max, b.sortOrder), -1) + 1),
    });
  }

  function handleSave() {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveBenefit({
          id: draft.id,
          name: draft.name,
          defaultSumCovered: draft.defaultSumCovered.trim() ? Number(draft.defaultSumCovered) : null,
          description: draft.description,
          sortOrder: Number(draft.sortOrder) || 0,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setDraft(null);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  // The order here is the order agents see in the Submit Case dropdown, so
  // the common products can be pushed to the top where they are reached first.
  function move(id: string, direction: "up" | "down") {
    setError(null);
    startTransition(async () => {
      const result = await reorderBenefit(id, direction);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function toggleActive(b: BenefitOption) {
    setError(null);
    startTransition(async () => {
      const result = await setBenefitActive(b.id, !b.isActive);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteBenefit(id);
      if (result.error) setError(result.error);
      else {
        setConfirmDelete(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-[520px] text-[12.5px] font-medium text-muted">
          What the Submit Case form offers when an agent picks a benefit. The name has to match the
          operator&apos;s exactly — it is what ends up on the certificate.
        </p>
        {canManage && (
          <button
            type="button"
            onClick={startNew}
            className="flex-none rounded-[10px] bg-navy px-3.5 py-2.5 text-[12.5px] font-semibold text-white"
          >
            + Add benefit
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
          {error}
        </div>
      )}

      {draft && (
        <div className="rounded-[14px] border border-sand bg-white p-4">
          <div className="text-[13px] font-bold text-navy">{draft.id ? "Edit benefit" : "New benefit"}</div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Benefit name</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Exactly as the operator prints it"
                aria-label="Benefit name"
                className={`mt-[5px] ${input}`}
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">
                Standard sum covered (RM)
              </span>
              <input
                type="number"
                step="0.01"
                value={draft.defaultSumCovered}
                onChange={(e) => setDraft({ ...draft, defaultSumCovered: e.target.value })}
                placeholder="Leave blank if it varies"
                aria-label="Standard sum covered"
                className={`mt-[5px] ${input}`}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">Description</span>
              <textarea
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="What this covers, in the words an agent needs while filing."
                aria-label="Benefit description"
                className="mt-[5px] w-full resize-y rounded-[9px] border border-sand-2 bg-cream px-3 py-2.5 text-[12.5px] font-medium text-navy outline-none focus:border-gold placeholder:text-taupe"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[12.5px] font-semibold text-navy"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={pending || !draft.name.trim()}
              className="rounded-[10px] bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save benefit"}
            </button>
          </div>
        </div>
      )}

      {benefits.length === 0 ? (
        <p className="rounded-[12px] border border-dashed border-sand-2 bg-white py-10 text-center text-[12.5px] font-medium text-muted">
          No benefits yet. Add the ones your operator sells and they appear in the Submit Case form.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {benefits.map((b, i) => (
            <div
              key={b.id}
              className={`rounded-[12px] border bg-white p-3.5 ${
                b.isActive ? "border-sand" : "border-dashed border-sand-2"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[13px] font-bold ${b.isActive ? "text-navy" : "text-taupe-2"}`}>
                      {b.name}
                    </span>
                    {!b.isActive && (
                      <span className="rounded-[6px] bg-sand-2 px-2 py-[2px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-taupe-2">
                        Retired
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11.5px] font-medium text-taupe">
                    Standard sum covered {fmtRM(b.defaultSumCovered)}
                  </div>
                  {b.description && (
                    <p className="mt-1 text-[11.5px] font-medium text-muted">{b.description}</p>
                  )}
                </div>

                {canManage && (
                  <div className="flex flex-none flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => move(b.id, "up")}
                      disabled={pending || i === 0}
                      aria-label={`Move ${b.name} up`}
                      title="Move up"
                      className="rounded-[8px] border border-sand-2 bg-white px-2 py-1.5 text-navy hover:border-navy disabled:opacity-35"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 14 6-6 6 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => move(b.id, "down")}
                      disabled={pending || i === benefits.length - 1}
                      aria-label={`Move ${b.name} down`}
                      title="Move down"
                      className="rounded-[8px] border border-sand-2 bg-white px-2 py-1.5 text-navy hover:border-navy disabled:opacity-35"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 10 6 6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setDraft(draftFrom(b));
                      }}
                      className="rounded-[8px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy hover:border-navy"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(b)}
                      disabled={pending}
                      className="rounded-[8px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy hover:border-navy disabled:opacity-50"
                    >
                      {b.isActive ? "Retire" : "Bring back"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(b.id)}
                      aria-label={`Delete ${b.name}`}
                      className="rounded-[8px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-alert-red hover:border-alert-red"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {confirmDelete === b.id && (
                <div className="mt-2.5 rounded-[10px] border border-[#f0dfb4] bg-warn-gold-bg p-3">
                  <div className="text-[12px] font-semibold text-warn-gold-text">
                    Delete “{b.name}” for good? Cases already filed keep the name they were saved with, but it
                    stops being offered. Retiring it does the same thing and is reversible.
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(b.id)}
                      disabled={pending}
                      className="rounded-[8px] bg-alert-red px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50"
                    >
                      {pending ? "Deleting…" : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="rounded-[8px] border border-sand-2 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-navy"
                    >
                      Keep it
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
