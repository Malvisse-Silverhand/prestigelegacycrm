// Browser-only. Shrinks a phone photo down to something worth uploading,
// entirely client-side, before it reaches Supabase Storage: Server Actions
// cap request bodies at 1 MB (serverActions.bodySizeLimit), so a 6 MB JPEG
// has to become a few hundred KB of WebP before it goes anywhere near one.
import type { ImageKind } from "@/components/image-upload-field";

const MAX_SOURCE_BYTES = 15 * 1024 * 1024; // 15 MB
const RETRY_THRESHOLD_BYTES = 2.8 * 1024 * 1024; // 2.8 MB

type Target = { maxWidth: number; maxHeight: number; crop: boolean };

const TARGETS: Record<ImageKind, Target> = {
  logo: { maxWidth: 600, maxHeight: 600, crop: false },
  header: { maxWidth: 1920, maxHeight: 1080, crop: false },
  photo: { maxWidth: 800, maxHeight: 800, crop: true }, // centre-cropped to a square
};

export async function resizeImage(file: File, kind: ImageKind): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Fail mesti gambar (JPG, PNG atau WebP) / File must be an image (JPG, PNG or WebP)");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Gambar terlalu besar, maksimum 15 MB / Image is too large, 15 MB max");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Most commonly HEIC on a browser that can't decode it outside Safari.
    throw new Error("Format gambar tidak disokong — guna JPG/PNG");
  }

  let canvas: HTMLCanvasElement;
  try {
    canvas = drawToCanvas(bitmap, TARGETS[kind]);
  } finally {
    bitmap.close();
  }

  let blob = await canvasToBlob(canvas, "image/webp", 0.85);
  // Older Safari accepts the toBlob("image/webp", ...) call but silently
  // hands back a PNG (or null) instead -- fall back to JPEG in that case.
  if (!blob || blob.type !== "image/webp") {
    blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
  }
  if (!blob) throw new Error("Tidak dapat memproses gambar ini / Couldn't process this image");

  if (blob.size > RETRY_THRESHOLD_BYTES) {
    const retry = await canvasToBlob(canvas, blob.type, 0.7);
    if (retry) blob = retry;
  }

  return blob;
}

function drawToCanvas(bitmap: ImageBitmap, target: Target): HTMLCanvasElement {
  const canvas = document.createElement("canvas");

  if (target.crop) {
    // Centre-crop to a square first, then scale that square to the target.
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    canvas.width = target.maxWidth;
    canvas.height = target.maxHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Tidak dapat memproses gambar ini / Couldn't process this image");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, target.maxWidth, target.maxHeight);
    return canvas;
  }

  const scale = Math.min(1, target.maxWidth / bitmap.width, target.maxHeight / bitmap.height);
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tidak dapat memproses gambar ini / Couldn't process this image");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
