"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const HEIGHT = 180;
// Keeps the PNG data URL well under the server's size limit even on a 3x phone.
const MAX_DPR = 2;
// The exported PNG is cropped to the ink and fitted inside this box, which keeps
// a typical signature at a few KB -- plenty for a printed application form.
const EXPORT_MAX_W = 480;
const EXPORT_MAX_H = 160;
const EXPORT_PAD = 8;

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

/** Crops the canvas to the ink (CSS px bounds) and downsizes it into a fresh PNG. */
function exportSignature(canvas: HTMLCanvasElement, b: Bounds): string {
  const dpr = canvas.width / canvas.clientWidth;
  const sx = Math.max(0, Math.floor((b.minX - EXPORT_PAD) * dpr));
  const sy = Math.max(0, Math.floor((b.minY - EXPORT_PAD) * dpr));
  const sw = Math.min(canvas.width, Math.ceil((b.maxX + EXPORT_PAD) * dpr)) - sx;
  const sh = Math.min(canvas.height, Math.ceil((b.maxY + EXPORT_PAD) * dpr)) - sy;
  const scale = Math.min(1, EXPORT_MAX_W / sw, EXPORT_MAX_H / sh);
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(sw * scale));
  out.height = Math.max(1, Math.round(sh * scale));
  const ctx = out.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

type Props = {
  /** A PNG data URL once something is drawn, null when empty or cleared. */
  onChange: (dataUrl: string | null) => void;
  invalid?: boolean;
  describedBy?: string;
  id?: string;
};

/**
 * Dependency-free signature canvas. Pointer events cover mouse, pen and touch
 * with one code path; `touch-action: none` stops the page scrolling while the
 * finger is signing. The backing store is scaled by devicePixelRatio so strokes
 * stay crisp, and painted white so the exported PNG is not transparent.
 */
export function SignaturePad({ onChange, invalid, describedBy, id }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const bounds = useRef<Bounds | null>(null);
  const onChangeRef = useRef(onChange);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const paintBackground = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const dpr = canvas.width / canvas.clientWidth;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    bounds.current = null;
  }, []);

  // Size the backing store to the displayed size. A width change (rotating the
  // phone) wipes the canvas, so the signature is cleared and the form told.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let lastWidth = 0;
    const fit = () => {
      const width = canvas.clientWidth;
      if (!width || width === lastWidth) return;
      const hadWidth = lastWidth !== 0;
      lastWidth = width;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(HEIGHT * dpr);
      paintBackground(canvas);
      if (hadWidth) {
        setEmpty(true);
        onChangeRef.current(null);
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paintBackground]);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const b = bounds.current;
    bounds.current = b
      ? { minX: Math.min(b.minX, p.x), minY: Math.min(b.minY, p.y), maxX: Math.max(b.maxX, p.x), maxY: Math.max(b.maxY, p.y) }
      : { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y };
    return p;
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    last.current = p;
    // A tap leaves a dot.
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y + 0.01);
    ctx.stroke();
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d");
    const from = last.current;
    if (!ctx || !from) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function end(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    setEmpty(false);
    const b = bounds.current;
    onChange(b ? exportSignature(e.currentTarget, b) : e.currentTarget.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintBackground(canvas);
    setEmpty(true);
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        id={id}
        role="img"
        aria-label="Signature pad. Draw your signature with your finger or mouse."
        aria-describedby={describedBy}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        style={{ height: HEIGHT, touchAction: "none" }}
        className={`block w-full cursor-crosshair rounded-[12px] border-2 border-dashed bg-white ${invalid ? "border-alert-red" : "border-sand-2"}`}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[10.5px] font-medium text-taupe">{empty ? "Sign inside the box above." : "Signature captured."}</p>
        <button
          type="button"
          onClick={clear}
          disabled={empty}
          className="press min-h-9 rounded-full border border-sand-2 bg-white px-4 text-[11.5px] font-bold text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
