"use client";

import { useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeDocument } from "@/lib/image-resize";
import { DOCUMENT_INFO, DOCUMENT_MAX_BYTES, type DocumentKind, type DocumentView } from "@/lib/lead-form-fields";
import { confirmUpload, removeUpload, requestUpload } from "./actions";

const BUCKET = "lead-documents";
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic";

const BTN_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/**
 * Where to put the two crosses ("palang") on the photo: top-left and bottom-right
 * corners only. Everything the card carries sits in the clear middle band, so
 * the crosses never cover a name, number, photo or address. The dashed squares
 * are the only places a cross may go.
 */
export function DocumentGuide({ kind }: { kind: DocumentKind }) {
  const ink = "stroke-taupe-2";
  const line = (x1: number, y: number, x2: number) => <line key={`${x1}-${y}`} x1={x1} y1={y} x2={x2} y2={y} className={ink} strokeWidth={5} strokeLinecap="round" opacity={0.45} />;

  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="Panduan: letak palang di sudut kiri atas dan kanan bawah sahaja, jangan tutup maklumat" className="h-auto w-full max-w-[280px]">
      <rect x="2" y="2" width="316" height="196" rx="14" className="fill-white stroke-sand-2" strokeWidth={2} />

      {/* The card's information: kept inside the middle band, clear of both corners. */}
      {kind === "ic_front" && (
        <>
          {line(62, 22, 250)}
          <rect x="24" y="58" width="72" height="88" rx="6" className="fill-sand-3 stroke-sand-2" strokeWidth={2} />
          <circle cx="60" cy="90" r="14" className="fill-sand-2" />
          <path d="M34 140c4-18 12-24 26-24s22 6 26 24z" className="fill-sand-2" />
          {line(112, 66, 250)}
          {line(112, 88, 220)}
          {line(112, 110, 250)}
          {line(112, 132, 200)}
        </>
      )}
      {kind === "ic_back" && (
        <>
          <rect x="24" y="52" width="38" height="30" rx="5" className="fill-sand-3 stroke-sand-2" strokeWidth={2} />
          {line(80, 60, 250)}
          {line(80, 76, 210)}
          {line(24, 108, 240)}
          {line(24, 126, 250)}
          {line(24, 144, 200)}
        </>
      )}
      {kind === "bank_card" && (
        <>
          <rect x="24" y="56" width="44" height="34" rx="6" className="fill-sand-3 stroke-sand-2" strokeWidth={2} />
          {line(24, 112, 76)}
          {line(96, 112, 148)}
          {line(168, 112, 220)}
          {line(24, 140, 150)}
          {line(200, 140, 250)}
        </>
      )}

      {/* The two corner zones, and the crosses inside them. */}
      <g className="text-alert-red">
        <rect x="10" y="10" width="40" height="40" rx="8" fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="5 4" />
        <path d="M21 21l18 18M39 21 21 39" stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
        <rect x="270" y="150" width="40" height="40" rx="8" fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="5 4" />
        <path d="M281 161l18 18M299 161 281 179" stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
      </g>
    </svg>
  );
}

type Busy = "idle" | "processing" | "uploading" | "removing";

export function DocumentUpload({
  token,
  kind,
  initial,
}: {
  token: string;
  kind: DocumentKind;
  initial: DocumentView | null;
}) {
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [doc, setDoc] = useState<DocumentView | null>(initial);
  const [busy, setBusy] = useState<Busy>("idle");
  const [error, setError] = useState<string | null>(null);
  const info = DOCUMENT_INFO[kind];
  const working = busy !== "idle";

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // picking the same file twice must still fire
    if (!file) return;
    setError(null);

    try {
      setBusy("processing");
      const blob = await resizeDocument(file, DOCUMENT_MAX_BYTES);

      setBusy("uploading");
      const target = await requestUpload(token, kind, blob.type, blob.size);
      if (target.error || !target.path || !target.uploadToken) throw new Error(target.error ?? "Couldn't start the upload.");

      const { error: putError } = await createClient().storage.from(BUCKET).uploadToSignedUrl(target.path, target.uploadToken, blob, { contentType: blob.type });
      if (putError) throw new Error("Muat naik gagal. Semak sambungan internet anda dan cuba lagi. / Upload failed. Check your connection and try again.");

      const saved = await confirmUpload(token, kind, target.path);
      if (saved.error || !saved.document) throw new Error(saved.error ?? "Couldn't save your upload.");
      setDoc(saved.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that image. Please try again.");
    } finally {
      setBusy("idle");
    }
  }

  async function remove() {
    setError(null);
    setBusy("removing");
    try {
      const result = await removeUpload(token, kind);
      if (result.error) setError(result.error);
      else setDoc(null);
    } catch {
      setError("Couldn't connect. Check your internet connection and try again.");
    } finally {
      setBusy("idle");
    }
  }

  const inputId = `${uid}-file`;
  const hintId = `${uid}-hint`;

  return (
    <div className="min-w-0 rounded-[14px] border border-sand bg-cream p-4">
      <label htmlFor={inputId} className="text-[11px] font-bold uppercase tracking-[0.06em] text-taupe-2">
        {info.label}
      </label>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-none">
          <DocumentGuide kind={kind} />
        </div>
        <p className="text-[11.5px] font-medium leading-relaxed text-ink sm:pt-1">
          Letakkan <strong className="text-alert-red">palang (✕)</strong> di hujung <strong>atas kiri</strong> dan hujung <strong>kanan bawah</strong> sahaja
          — <strong>jangan tutup maklumat</strong> pada kad. Pastikan gambar jelas dan semua tulisan boleh dibaca.
        </p>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        onChange={onFile}
        disabled={working}
        aria-describedby={hintId}
        className="sr-only"
      />

      {doc && (
        <div className="mt-3 flex items-center gap-3 rounded-[12px] border border-sand-2 bg-white p-2.5">
          {/* A signed Storage URL, so next/image has nothing to optimise. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={doc.url} alt={`Gambar dimuat naik: ${info.short}`} className="h-16 w-24 flex-none rounded-[8px] border border-sand object-cover" />
          <div className="min-w-0 text-[12px] font-semibold text-navy">Dimuat naik / Uploaded</div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={working}
          className={`press min-h-11 rounded-[10px] border border-sand-2 bg-white px-4 text-[12.5px] font-bold text-navy disabled:opacity-60 ${BTN_FOCUS}`}
        >
          {busy === "processing" ? "Memproses…" : busy === "uploading" ? "Memuat naik…" : doc ? "Tukar gambar / Replace" : "Pilih fail / Choose file"}
        </button>
        {doc && (
          <button
            type="button"
            onClick={remove}
            disabled={working}
            className={`press min-h-11 rounded-[10px] border border-[#f0cdc9] bg-alert-red-bg px-4 text-[12.5px] font-bold text-alert-red disabled:opacity-60 ${BTN_FOCUS}`}
          >
            {busy === "removing" ? "Membuang…" : "Buang / Remove"}
          </button>
        )}
      </div>

      <p id={hintId} className="mt-2 text-[10.5px] font-medium text-taupe">
        Max. file size: 5 MB.
      </p>
      <p aria-live="polite" className="mt-1 text-[11px] font-semibold text-alert-red">
        {error}
      </p>
    </div>
  );
}
