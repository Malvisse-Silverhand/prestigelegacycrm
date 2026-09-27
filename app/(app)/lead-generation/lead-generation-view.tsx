"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LandingPageRow } from "./data";
import { PRODUCT_LABEL, type LandingProduct, type LandingLayout } from "@/lib/landing-content";
import { landingPath } from "@/lib/agent-slug";
import { createLandingPage, setLandingPublished, deleteLandingPage } from "./actions";
import { EmptyState } from "@/components/empty-state";
import { CalendarIcon } from "@/components/icons";

const PRODUCT_TONE: Record<LandingProduct, string> = {
  medical: "bg-success-bg text-green",
  hibah: "bg-info-blue-bg text-info-blue-text",
  both: "bg-warn-gold-bg text-warn-gold-text",
};

// The public URL is built in the browser so it always matches the host the
// agent is actually on -- localhost, a preview, or production. Namespaced
// under the agent's own slug once they have one; /p/<slug> otherwise.
function publicUrl(agentSlug: string | null, slug: string) {
  const path = landingPath(agentSlug, slug);
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function LeadGenerationView({
  pages,
  stats,
  owners,
  currentUserId,
  canChooseOwner,
}: {
  pages: LandingPageRow[];
  stats: { published: number; views: number; leads: number; conversion: number | null };
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
  const [layout, setLayout] = useState<LandingLayout>("full");
  const [ownerId, setOwnerId] = useState(currentUserId);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LandingPageRow | null>(null);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const shown = pages.filter((p) =>
    filter === "all" ? true : filter === "published" ? p.isPublished : !p.isPublished,
  );

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

  async function copy(agentSlug: string | null, slug: string) {
    try {
      await navigator.clipboard.writeText(publicUrl(agentSlug, slug));
      setCopied(slug);
      setTimeout(() => setCopied((c) => (c === slug ? null : c)), 2000);
    } catch {
      setError("Couldn't copy — select the link and copy it manually.");
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-20 lg:static flex flex-wrap items-start justify-between gap-4 border-b border-sand bg-white/85 backdrop-blur-md px-5 py-5 lg:bg-white lg:backdrop-blur-none lg:px-[30px]">
        <div>
          <div className="text-[22px] font-extrabold tracking-[-0.02em] text-navy">Lead Generation</div>
          <div className="mt-[3px] text-[13px] font-medium text-muted">
            Landing pages that feed leads straight into your pipeline
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
          className="flex flex-none items-center gap-2 rounded-[11px] bg-gold px-[17px] py-3 text-[13px] font-bold text-navy shadow-sm hover:brightness-95"
        >
          + New Landing Page
        </button>
      </div>

      <div className="flex flex-col gap-[18px] px-5 py-[22px] lg:px-[30px]">
        {error && (
          <div className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-alert-red">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
          <Stat label="Live landing pages" value={String(stats.published)} />
          <Stat label="Views" value={stats.views.toLocaleString("en-MY")} />
          <Stat label="Leads captured" value={String(stats.leads)} tone="text-green" />
          <Stat label="Conversion" value={stats.conversion === null ? "—" : `${stats.conversion}%`} />
        </div>

        {pages.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon width={28} height={28} className="text-green" />}
            title="No landing pages yet"
            description="Create one, share the link, and every lead it captures is assigned straight to you."
          />
        ) : (
          <div className="rounded-[14px] border border-sand bg-white px-3.5 py-4 lg:rounded-[18px] lg:px-[22px] lg:py-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 text-[14px] font-bold text-navy lg:text-[15.5px]">Your landing pages</div>
              <div className="flex rounded-[10px] border border-sand-2 bg-cream p-[3px]">
                {(["all", "published", "draft"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`rounded-[7px] px-3 py-1.5 text-[11.5px] font-bold lg:px-3.5 lg:text-[12px] ${
                      filter === f ? "bg-navy text-white" : "font-medium text-taupe"
                    }`}
                  >
                    {f === "all" ? "All" : f === "published" ? "Live" : "Draft"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {shown.length === 0 && (
                <p className="rounded-xl border border-dashed border-taupe px-4 py-6 text-center text-[12.5px] font-medium text-taupe-2">
                  No landing pages in this filter.
                </p>
              )}
              {shown.map((p) => (
                <div key={p.id} className="rounded-[12px] border border-sand-2 bg-cream px-3.5 py-3.5 lg:rounded-[14px] lg:px-4 lg:py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
                        <span className="truncate text-[13.5px] font-bold text-navy lg:text-[14.5px]">{p.name}</span>
                        <span
                          className={`shrink-0 rounded-[6px] px-1.5 py-[2px] text-[9px] font-bold lg:px-2 lg:py-[3px] lg:text-[9.5px] ${PRODUCT_TONE[p.product]}`}
                        >
                          {PRODUCT_LABEL[p.product].toUpperCase()}
                        </span>
                        <span
                          className={`shrink-0 rounded-[6px] px-1.5 py-[2px] text-[9px] font-bold lg:px-2 lg:py-[3px] lg:text-[9.5px] ${
                            p.isPublished ? "bg-success-bg text-green" : "bg-sand-3 text-taupe-2"
                          }`}
                        >
                          {p.isPublished ? "LIVE" : "DRAFT"}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 lg:gap-2">
                        <span className="min-w-0 break-all font-mono text-[10.5px] font-medium text-muted lg:text-[11.5px]">
                          {landingPath(p.agentSlug, p.slug)}
                        </span>
                        <button
                          type="button"
                          onClick={() => copy(p.agentSlug, p.slug)}
                          className="shrink-0 rounded-[7px] border border-sand-2 bg-white px-2 py-[3px] text-[10px] font-semibold text-navy lg:text-[10.5px]"
                        >
                          {copied === p.slug ? "Copied" : "Copy"}
                        </button>
                        <span className="text-[10.5px] font-medium text-taupe lg:text-[11px]">· {p.agentName}</span>
                      </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-sand-2 pt-3 lg:w-auto lg:flex-none lg:justify-end lg:gap-5 lg:border-t-0 lg:pt-0">
                      <div className="flex items-center gap-4 lg:gap-5">
                        <Metric label="Views" value={p.viewCount} />
                        <Metric label="Leads" value={p.leadCount} tone="text-green" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          href={`/lead-generation/${p.id}`}
                          className="rounded-[9px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy lg:px-3 lg:py-2 lg:text-[12px]"
                        >
                          Edit
                        </Link>
                        {p.isPublished && (
                          <a
                            href={landingPath(p.agentSlug, p.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-[9px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy lg:px-3 lg:py-2 lg:text-[12px]"
                          >
                            Open
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => setLandingPublished(p.id, !p.isPublished))}
                          className="rounded-[9px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy disabled:opacity-60 lg:px-3 lg:py-2 lg:text-[12px]"
                        >
                          {p.isPublished ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setConfirmDelete(p)}
                          className="rounded-[9px] border border-[#f6d5cf] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-alert-red disabled:opacity-60 lg:px-3 lg:py-2 lg:text-[12px]"
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
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4" onClick={() => setCreating(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-[16px] font-bold text-navy">New landing page</div>
            <div className="mt-0.5 text-[12.5px] font-medium text-muted">
              It starts with a full draft of copy — publish now and edit whenever you like.
            </div>

            <label className="mt-4 block">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Medical Card — Kempen Ogos"
                className="mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
              />
            </label>

            <label className="mt-3.5 block">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">Template</span>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as LandingLayout)}
                className="mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
              >
                <option value="full">Standard — hero, benefits, testimonials, FAQ</option>
                <option value="medical">Medical Card funnel — long-form, builds the case first</option>
                <option value="agent">Agent Landing Page — profile card, products and lead form</option>
              </select>
              <span className="mt-1 block text-[11px] font-medium text-taupe">
                {layout === "medical"
                  ? "Cost-of-treatment case, benefits, why you, your profile, testimonials and the panel of operators — then the calculator."
                  : layout === "agent"
                    ? "A mobile profile card: your photo, socials, products and a short lead form, alongside the same calculator every other template uses."
                    : "The shorter page: hero, benefits, testimonials and FAQ around the calculator."}
              </span>
            </label>

            <label className="mt-3.5 block">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">
                {layout === "agent" ? "Form" : "Calculators"}
              </span>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value as LandingProduct)}
                className="mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
              >
                <option value="both">Medical Card + Hibah (tabs)</option>
                <option value="medical">Medical Card only</option>
                <option value="hibah">Hibah only</option>
              </select>
              {layout === "agent" && (
                <span className="mt-1 block text-[11px] font-medium text-taupe">
                  Plus a lead form (Full Name, Phone, Email, DOB, Gender, Smoker, Occupation) — each submission becomes
                  a Warm lead.
                </span>
              )}
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
              <button type="button" onClick={() => setCreating(false)} className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy">
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || !name.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const result = await createLandingPage({ name, product, ownerId, layout });
                    if (result.error) {
                      setError(result.error);
                      return;
                    }
                    setCreating(false);
                    if (result.id) router.push(`/lead-generation/${result.id}`);
                  })
                }
                className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Creating…" : "Create & Edit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-[15px] font-bold text-navy">Delete this landing page?</div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              {confirmDelete.name} will be gone and its link will stop working. Leads it already captured stay in your
              pipeline.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy">
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteLandingPage(confirmDelete.id), () => setConfirmDelete(null))}
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[14px] border border-sand bg-white px-3 py-2.5 lg:rounded-[18px] lg:px-[19px] lg:py-[17px]">
      <div className="text-[10px] font-semibold text-muted lg:text-[11.5px]">{label}</div>
      <div className={`mt-1 text-[19px] font-extrabold tracking-[-0.03em] lg:mt-[7px] lg:text-[28px] ${tone ?? "text-navy"}`}>
        {value}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="text-right">
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.06em] text-taupe lg:text-[10.5px]">{label}</div>
      <div className={`mt-0.5 text-[15px] font-bold lg:text-[17px] ${tone ?? "text-navy"}`}>{value}</div>
    </div>
  );
}
