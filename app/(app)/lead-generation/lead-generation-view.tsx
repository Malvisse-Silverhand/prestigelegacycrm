"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LandingPageRow } from "./data";
import { PRODUCT_LABEL, type LandingProduct } from "@/lib/landing-content";
import { createLandingPage, setLandingPublished, deleteLandingPage } from "./actions";
import { EmptyState } from "@/components/empty-state";
import { CalendarIcon } from "@/components/icons";

const PRODUCT_TONE: Record<LandingProduct, string> = {
  medical: "bg-success-bg text-green",
  hibah: "bg-info-blue-bg text-info-blue-text",
  both: "bg-warn-gold-bg text-warn-gold-text",
};

// The public URL is built in the browser so it always matches the host the
// agent is actually on -- localhost, a preview, or production.
function publicUrl(slug: string) {
  if (typeof window === "undefined") return `/p/${slug}`;
  return `${window.location.origin}/p/${slug}`;
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
        setError("Tidak dapat sambung. Semak sambungan internet anda.");
      }
    });
  }

  async function copy(slug: string) {
    try {
      await navigator.clipboard.writeText(publicUrl(slug));
      setCopied(slug);
      setTimeout(() => setCopied((c) => (c === slug ? null : c)), 2000);
    } catch {
      setError("Tidak dapat salin — pilih pautan dan salin secara manual.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sand bg-white px-5 py-5 lg:px-[30px]">
        <div>
          <div className="text-[22px] font-extrabold tracking-[-0.02em] text-navy">Lead Generation</div>
          <div className="mt-[3px] text-[13px] font-medium text-muted">
            Landing page yang menyalurkan lead terus ke pipeline anda
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
          + Landing Page Baharu
        </button>
      </div>

      <div className="flex flex-col gap-[18px] px-5 py-[22px] lg:px-[30px]">
        {error && (
          <div className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-alert-red">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <Stat label="Landing page aktif" value={String(stats.published)} />
          <Stat label="Tontonan" value={stats.views.toLocaleString("en-MY")} />
          <Stat label="Lead ditangkap" value={String(stats.leads)} tone="text-green" />
          <Stat label="Kadar tukaran" value={stats.conversion === null ? "—" : `${stats.conversion}%`} />
        </div>

        {pages.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon width={28} height={28} className="text-green" />}
            title="Belum ada landing page"
            description="Cipta satu, kongsi pautannya, dan setiap lead yang masuk akan terus ditugaskan kepada anda."
          />
        ) : (
          <div className="rounded-[18px] border border-sand bg-white px-[22px] py-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 text-[15.5px] font-bold text-navy">Landing page anda</div>
              <div className="flex rounded-[10px] border border-sand-2 bg-cream p-[3px]">
                {(["all", "published", "draft"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`rounded-[7px] px-3.5 py-1.5 text-[12px] font-bold ${
                      filter === f ? "bg-navy text-white" : "font-medium text-taupe"
                    }`}
                  >
                    {f === "all" ? "Semua" : f === "published" ? "Aktif" : "Draf"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {shown.length === 0 && (
                <p className="rounded-xl border border-dashed border-taupe px-4 py-6 text-center text-[12.5px] font-medium text-taupe-2">
                  Tiada landing page dalam kategori ini.
                </p>
              )}
              {shown.map((p) => (
                <div key={p.id} className="rounded-[14px] border border-sand-2 bg-cream px-4 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14.5px] font-bold text-navy">{p.name}</span>
                        <span className={`rounded-[6px] px-2 py-[3px] text-[9.5px] font-bold ${PRODUCT_TONE[p.product]}`}>
                          {PRODUCT_LABEL[p.product].toUpperCase()}
                        </span>
                        <span
                          className={`rounded-[6px] px-2 py-[3px] text-[9.5px] font-bold ${
                            p.isPublished ? "bg-success-bg text-green" : "bg-sand-3 text-taupe-2"
                          }`}
                        >
                          {p.isPublished ? "AKTIF" : "DRAF"}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11.5px] font-medium text-muted">/p/{p.slug}</span>
                        <button
                          type="button"
                          onClick={() => copy(p.slug)}
                          className="rounded-[7px] border border-sand-2 bg-white px-2 py-[3px] text-[10.5px] font-semibold text-navy"
                        >
                          {copied === p.slug ? "Disalin" : "Salin"}
                        </button>
                        <span className="text-[11px] font-medium text-taupe">· {p.agentName}</span>
                      </div>
                    </div>

                    <div className="flex flex-none flex-wrap items-center gap-5">
                      <Metric label="Tontonan" value={p.viewCount} />
                      <Metric label="Lead" value={p.leadCount} tone="text-green" />
                      <div className="flex gap-1.5">
                        <Link
                          href={`/lead-generation/${p.id}`}
                          className="rounded-[9px] border border-sand-2 bg-white px-3 py-2 text-[12px] font-semibold text-navy"
                        >
                          Edit
                        </Link>
                        {p.isPublished && (
                          <a
                            href={`/p/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-[9px] border border-sand-2 bg-white px-3 py-2 text-[12px] font-semibold text-navy"
                          >
                            Lihat
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => setLandingPublished(p.id, !p.isPublished))}
                          className="rounded-[9px] border border-sand-2 bg-white px-3 py-2 text-[12px] font-semibold text-navy disabled:opacity-60"
                        >
                          {p.isPublished ? "Nyahaktif" : "Aktifkan"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setConfirmDelete(p)}
                          className="rounded-[9px] border border-[#f6d5cf] bg-white px-3 py-2 text-[12px] font-semibold text-alert-red disabled:opacity-60"
                        >
                          Padam
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
            <div className="text-[16px] font-bold text-navy">Landing page baharu</div>
            <div className="mt-0.5 text-[12.5px] font-medium text-muted">
              Kandungan lalai sudah siap — anda boleh terus aktifkan dan ubah kemudian.
            </div>

            <label className="mt-4 block">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">Nama</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Medical Card — Kempen Ogos"
                className="mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
              />
            </label>

            <label className="mt-3.5 block">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">Kalkulator</span>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value as LandingProduct)}
                className="mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
              >
                <option value="both">Medical Card + Hibah (tab)</option>
                <option value="medical">Medical Card sahaja</option>
                <option value="hibah">Hibah sahaja</option>
              </select>
            </label>

            {canChooseOwner && (
              <label className="mt-3.5 block">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">Lead pergi kepada</span>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
                >
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.full_name}
                      {o.id === currentUserId ? " (anda)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="mt-5 flex justify-end gap-2.5 border-t border-sand pt-4">
              <button type="button" onClick={() => setCreating(false)} className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy">
                Batal
              </button>
              <button
                type="button"
                disabled={pending || !name.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const result = await createLandingPage({ name, product, ownerId });
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
                {pending ? "Mencipta…" : "Cipta & Edit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-[15px] font-bold text-navy">Padam landing page ini?</div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              {confirmDelete.name} akan hilang dan pautannya berhenti berfungsi. Lead yang sudah masuk kekal dalam
              pipeline anda.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy">
                Batal
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteLandingPage(confirmDelete.id), () => setConfirmDelete(null))}
                className="rounded-[10px] bg-alert-red px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Memadam…" : "Padam"}
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
    <div className="rounded-[18px] border border-sand bg-white px-[19px] py-[17px]">
      <div className="text-[11.5px] font-semibold text-muted">{label}</div>
      <div className={`mt-[7px] text-[28px] font-extrabold tracking-[-0.03em] ${tone ?? "text-navy"}`}>{value}</div>
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
