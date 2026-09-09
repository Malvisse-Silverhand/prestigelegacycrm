"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RelativeRow } from "./data";
import { LeadFormFields } from "../lead-form-fields";
import { addRelative, updateRelationship } from "../actions";
import { RELATIONSHIPS } from "@/lib/lead-constants";
import { LeadNo } from "@/components/lead-no";
import { ChevronDownIcon } from "@/components/icons";

function FamilyIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="17" cy="9.5" r="2.3" />
      <path d="M2.5 20v-1.5A4.5 4.5 0 0 1 7 14h2a4.5 4.5 0 0 1 4.5 4.5V20" />
      <path d="M15 14h1.5A4 4 0 0 1 21 18v2" />
    </svg>
  );
}

export function LeadFamily({
  leadId,
  leadName,
  parent,
  relatives,
  relationship,
  canEdit,
}: {
  leadId: string;
  leadName: string;
  /** Set when this lead is itself somebody's relative. */
  parent: RelativeRow | null;
  relatives: RelativeRow[];
  relationship: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [relPending, startRelTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await addRelative(leadId, formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        setAdding(false);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  function handleRelationshipChange(value: string) {
    setError(null);
    startRelTransition(async () => {
      try {
        const result = await updateRelationship(leadId, value);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="rounded-[14px] border border-sand bg-white p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FamilyIcon className="text-green" />
          <div className="text-[13px] font-bold text-navy">
            Family &amp; relatives{" "}
            {relatives.length > 0 && <span className="font-semibold text-taupe">({relatives.length})</span>}
          </div>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="press rounded-[9px] border border-sand-2 bg-cream px-3 py-1.5 text-[11.5px] font-semibold text-navy hover:border-navy"
          >
            + Add family/relative
          </button>
        )}
      </div>

      {/* This lead is somebody's relative: say whose, and let the relationship
          be corrected without going back to the other record. */}
      {parent && (
        <div className="mt-3 rounded-[11px] border border-info-blue-mid/35 bg-info-blue-bg px-3.5 py-3">
          <div className="text-[10px] font-bold tracking-[0.08em] text-info-blue-text uppercase">
            Family member of
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <LeadNo no={parent.lead_no} />
            <Link href={`/leads/${parent.id}`} className="truncate text-[13px] font-bold text-navy hover:underline">
              {parent.full_name}
            </Link>
          </div>
          <div className="mt-2">
            <div className="text-[10px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Relationship</div>
            {canEdit ? (
              <div className="relative mt-[3px] max-w-[220px]">
                <select
                  value={relationship ?? ""}
                  disabled={relPending}
                  onChange={(e) => handleRelationshipChange(e.target.value)}
                  aria-label="Relationship to the parent lead"
                  className="w-full appearance-none rounded-[8px] border border-sand-2 bg-white py-1.5 pr-7 pl-2 text-[13px] font-semibold text-navy disabled:opacity-70"
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon width={13} height={13} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-navy" />
              </div>
            ) : (
              <div className="mt-[3px] text-[13px] font-semibold text-navy">{relationship ?? "—"}</div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2.5 rounded-[9px] bg-alert-red-bg px-3 py-2 text-[11.5px] font-medium text-alert-red">
          {error}
        </div>
      )}

      {relatives.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          {relatives.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 rounded-[11px] border border-sand-2 bg-cream px-3 py-2.5">
              <span className="flex-none rounded-[6px] bg-success-bg px-[7px] py-[2px] text-[9.5px] font-bold text-green">
                {r.relationship ?? "Relative"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <LeadNo no={r.lead_no} />
                  <Link href={`/leads/${r.id}`} className="truncate text-[12.5px] font-bold text-navy hover:underline">
                    {r.full_name}
                  </Link>
                </div>
                <div className="text-[11px] font-medium text-taupe">{r.phone}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !parent && (
          <p className="mt-2.5 text-[11.5px] leading-relaxed font-medium text-muted">
            Add a spouse, child or relative and they become a lead of their own, filed under this one and assigned to
            the same agent.
          </p>
        )
      )}

      {adding && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-lg font-bold text-navy">Add family / relative</div>
            <p className="mt-0.5 text-[12.5px] text-muted">
              A family member of <span className="font-semibold text-navy">{leadName}</span>. They get their own lead
              record — own date of birth, occupation class and quotations — filed under this one and assigned to the
              same agent.
            </p>

            <form action={handleSubmit} className="mt-4 flex flex-col gap-3">
              <label className="block">
                <span className="text-[11px] font-bold tracking-[0.1em] text-taupe-2 uppercase">Relationship</span>
                <div className="relative mt-[5px]">
                  <select
                    name="relationship"
                    required
                    defaultValue=""
                    className="w-full appearance-none rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 pr-9 text-[13px] font-semibold text-navy"
                  >
                    <option value="" disabled>
                      How are they related?
                    </option>
                    {RELATIONSHIPS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon width={14} height={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy" />
                </div>
              </label>

              {/* The same fields as any other lead, so a relative is never a
                  second-class record missing the details a quotation needs. */}
              <LeadFormFields defaults={{}} />

              {error && (
                <div className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
                  {error}
                </div>
              )}

              <div className="mt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setError(null);
                  }}
                  className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save family member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
