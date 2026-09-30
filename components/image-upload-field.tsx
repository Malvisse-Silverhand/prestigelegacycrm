"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";

// Kept here rather than in lib/image-resize.ts because this component is the
// one place that decides what an "image" means for the Agent Landing Page --
// the resize targets in lib/image-resize.ts key off this same union.
export type ImageKind = "logo" | "header" | "photo";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic";

// resizeImage() prefers WebP and falls back to JPEG on browsers that can't
// encode it (older Safari) -- this is just the matching file extension.
const EXT_FOR_TYPE: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

/**
 * One image slot: preview, Upload/Replace/Remove, resize-then-upload straight
 * to Supabase Storage from the browser (Server Actions cap out at 1 MB, and a
 * phone photo is routinely 4-8 MB before resizeImage() shrinks it). Only the
 * resulting public URL ever reaches the server, via onChange.
 */
export function ImageUploadField({
  label,
  kind,
  value,
  onChange,
  hint,
  fallbackPreview = null,
}: {
  label: string;
  kind: ImageKind;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  fallbackPreview?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // No image of its own yet -- show the profile-level default, dimmed, so it
  // reads as "inherited" rather than "this page's own picture".
  const preview = value || fallbackPreview || null;
  const dimmed = !value && !!fallbackPreview;
  const shapeClass = kind === "header" ? "aspect-[16/9] w-full" : "aspect-square w-28";

  function pick() {
    setError(null);
    inputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the exact same file twice still fires onChange
    if (!file) return;

    setError(null);
    startTransition(async () => {
      try {
        const blob = await resizeImage(file, kind);
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setError("Not signed in.");
          return;
        }

        const contentType = blob.type || "image/webp";
        const ext = EXT_FOR_TYPE[contentType] ?? "webp";
        const path = `${session.user.id}/${kind}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("landing-assets")
          .upload(path, blob, { contentType, upsert: false, cacheControl: "31536000" });
        if (uploadError) {
          if (uploadError.message?.toLowerCase().includes("bucket not found")) {
            setError("Image uploads aren't set up yet — the database migration needs to be run.");
          } else {
            setError("Couldn't upload this image. Please try again.");
          }
          return;
        }

        const { data } = supabase.storage.from("landing-assets").getPublicUrl(path);
        onChange(data.publicUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't process this image.");
      }
    });
  }

  function remove() {
    setError(null);
    onChange("");
  }

  return (
    <div>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">{label}</span>
      <div className="mt-1.5 flex items-start gap-3">
        <div className={`${shapeClass} shrink-0 overflow-hidden rounded-[12px] border border-sand-2 bg-cream`}>
          {preview ? (
            // Landing images live in a public Storage bucket at arbitrary,
            // per-user paths -- next/image would need every one of them added
            // to remotePatterns, so this stays a plain <img>.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={label} className={`h-full w-full object-cover ${dimmed ? "opacity-40" : ""}`} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10.5px] font-medium text-taupe">No image</div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onFileChange} disabled={pending} />
          <button
            type="button"
            onClick={pick}
            disabled={pending}
            className="rounded-[8px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy disabled:opacity-50"
          >
            {pending ? (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-3 w-3 animate-spin rounded-full border-2 border-brand/40 border-t-navy"
                  aria-hidden="true"
                />
                Uploading…
              </span>
            ) : value ? (
              "Replace"
            ) : (
              "Upload"
            )}
          </button>
          {value && (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded-[7px] border border-[#f6d5cf] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-alert-red disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {hint && <p className="mt-1 text-[10.5px] font-medium text-taupe">{hint}</p>}
      {error && <p className="mt-1 text-[11px] font-semibold text-alert-red">{error}</p>}
    </div>
  );
}
