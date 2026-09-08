"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LandingPageRow } from "../data";
import { PRODUCT_LABEL, type LandingProduct } from "@/lib/landing-content";
import { createLandingPage, setLandingPublished, deleteLandingPage } from "../actions";
import { EmptyState } from "@/components/empty-state";
import { QuotationIcon } from "@/components/icons";

const PRODUCT_TONE: Record<LandingProduct, string> = {
  medical: "bg-success-bg text-green",
  hibah: "bg-info-blue-bg text-info-blue-text",
  both: "bg-warn-gold-bg text-warn-gold-text",
};

function publicUrl(slug: string) {
  if (typeof window === "undefined") return `/p/${slug}`;
  return `${window.location.origin}/p/${slug}`;
}

export function QuickQuoteView({
  forms,
  owners,
  currentUserId,
  canChooseOwner,
}: {
  forms: LandingPageRow[];
  owners: { id: string; full_name: string }[];
  currentUserId: string;
  canChooseOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [product, setProduct] = useState<LandingProduct>("both");
  const [ownerId, setOwnerId] = useState(currentUserId);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LandingPageRow | null>(null);

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

  async function copy(slug: string) {
    try {
      await navigator.clipboard.writeText(publicUrl(slug));
      setCopied(slug);
      setTimeout(() => setCopied((c) => (c === slug ? null : c)), 2000);
    } catch {
      setError("Couldn't copy — select the link and copy it manually.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sand bg-white px-5 py-5 lg:px-[30px]">
        <div>
          <Link href="/lead-generation" className="press text-[12px] font-semibold text-taupe hover:text-navy">
            ← Lead Generation
          </Link>
          <div className="mt-1 text-[22px] font-extrabold tracking-[-0.02em] text-navy">QuickQuote Form</div>
          <div className="mt-[3px] text-[13px] font-medium text-muted">
            Just the calculators, on a link you can drop into a chat
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setName("");
            setProduct("both");
            setOwnerId(currentUserId);
            setCreating(true);
          }}
          className="press flex flex-none items-center gap-2 rounded-[11px] bg-gold px-[17px] py-3 text-[13px] font-bold text-navy shadow-sm hover:brightness-95"
        >
          + New QuickQuote Form
        </button>
      </div>

      <div className="flex flex-col gap-[18px] px-5 py-[22px] lg:px-[30px]">
        {error && (
          <div className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-alert-red">
            {error}
          </div>
        )}

        <div className="rounded-[18px] border border-sand bg-info-blue-bg-2 px-[22px] py-[18px]">
          <div className="text-[13.5px] font-bold text-info-blue-text">How this differs from a landing page</div>
          <div className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-info-blue-text/80">
            A QuickQuote form is the same funnel with the marketing removed — no hero, benefits, testimonials or FAQ,
            just your card and the calculators. Leads still land in your pipeline exactly the same way, and your
            manager, Group Manager and SuperAdmin can see them.
          </div>
        </div>

        {forms.length === 0 ? (
          <EmptyState
            icon={<QuotationIcon width={28} height={28} className="text-green" />}
            title="No QuickQuote forms yet"
            description="Create one, share the link, and anyone who works out an estimate becomes a lead assigned to you."
          />
        ) : (
          <div className="rounded-[18px] border border-sand bg-white px-[22px] py-5">
            <div className="text-[15.5px] font-bold text-navy">Your QuickQuote forms</div>

            <div className="mt-4 flex flex-col gap-2.5">
              {forms.map((f) => (
                <div key={f.id} className="rounded-[14px] border border-sand-2 bg-cream px-4 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14.5px] font-bold text-navy">{f.name}</span>
                        <span className={`rounded-[6px] px-2 py-[3px] text-[9.5px] font-bold ${PRODUCT_TONE[f.product]}`}>
                          {PRODUCT_LABEL[f.product].toUpperCase()}
                        </span>
                        <span
                          className={`rounded-[6px] px-2 py-[3px] text-[9.5px] font-bold ${
                            f.isPublished ? "bg-success-bg text-green" : "bg-sand-3 text-taupe-2"
                          }`}
                        >
                          {f.isPublished ? "LIVE" : "DRAFT"}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11.5px] font-medium text-muted">/p/{f.slug}</span>
                        <button
                          type="button"
                          onClick={() => copy(f.slug)}
                          className="press rounded-[7px] border border-sand-2 bg-white px-2 py-[3px] text-[10.5px] font-semibold text-navy"
                        >
                          {copied === f.slug ? "Copied" : "Copy"}
                        </button>
                        <span className="text-[11px] font-medium text-taupe">· {f.agentName}</span>
                      </div>
                    </div>

                    <div className="flex flex-none flex-wrap items-center gap-5">
                      <Metric label="Views" value={f.viewCount} />
                      <Metric label="Leads" value={f.leadCount} tone="text-green" />
                      <div className="flex gap-1.5">
                        {f.isPublished && (
                          <a
                            href={`/p/${f.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="press rounded-[9px] border border-sand-2 bg-white px-3 py-2 text-[12px] font-semibold text-navy"
                          >
                            Open
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => setLandingPublished(f.id, !f.isPublished))}
                          className="press rounded-[9px] border border-sand-2 bg-white px-3 py-2 text-[12px] font-semibold text-navy disabled:opacity-60"
                        >
                          {f.isPublished ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setConfirmDelete(f)}
                          className="press rounded-[9px] border border-[#f6d5cf] bg-white px-3 py-2 text-[12px] font-semibold text-alert-red disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {creating && (
        <div className="animate-fade fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4" onClick={() => setCreating(false)}>
          <div onClick={(e) => e.stopPropagation()} className="animate-rise w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-[16px] font-bold text-navy">New QuickQuote form</div>
            <div className="mt-0.5 text-[12.5px] font-medium text-muted">
              Publish it and the link is ready to share — there is nothing else to fill in.
            </div>

            <label className="mt-4 block">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="QuickQuote — WhatsApp broadcast"
                className="mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
              />
            </label>

            <label className="mt-3.5 block">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">Calculators</span>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value as LandingProduct)}
                className="mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
              >
                <option value="both">Medical Card + Hibah (tabs)</option>
                <option value="medical">Medical Card only</option>
                <option value="hibah">Hibah only</option>
              </select>
            </label>

            {canChooseOwner && (
              <label className="mt-3.5 block">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">Leads go to</span>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
                >
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.full_name}
                      {o.id === currentUserId ? " (you)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="mt-5 flex justify-end gap-2.5 border-t border-sand pt-4">
              <button type="button" onClick={() => setCreating(false)} className="press rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy">
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || !name.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const result = await createLandingPage({ name, product, ownerId, layout: "quickquote" });
                    if (result.error) {
                      setError(result.error);
                      return;
                    }
                    setCreating(false);
                    router.refresh();
                  })
                }
                className="press rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="animate-fade fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
          <div className="animate-rise w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-[15px] font-bold text-navy">Delete this QuickQuote form?</div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              {confirmDelete.name} will stop working. Leads it already captured stay in your pipeline.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button type="button" onClick={() => setConfirmDelete(null)} className="press rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy">
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteLandingPage(confirmDelete.id), () => setConfirmDelete(null))}
                className="press rounded-[10px] bg-alert-red px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
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

function Metric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="text-right">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-taupe">{label}</div>
      <div className={`mt-0.5 text-[17px] font-bold ${tone ?? "text-navy"}`}>{value}</div>
    </div>
  );
}
