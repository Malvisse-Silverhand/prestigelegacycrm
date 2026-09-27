"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/image-upload-field";
import { BrandWordmark } from "@/components/brand-wordmark";
import { saveBrandLogo } from "../branding-actions";

/**
 * SuperAdmin-only: the one insurer logo shown on every Agent Landing Page.
 * Unlike Settings > My Profile's per-agent images, there is exactly one of
 * these for the whole site, stored on site_settings rather than a profile --
 * see saveBrandLogo. When it's empty, the public page falls back to a text
 * wordmark rather than an empty box; the preview below shows exactly that.
 */
export function BrandingTab({ initial }: { initial: string | null }) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState(initial ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = logoUrl !== (initial ?? "");

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await saveBrandLogo(logoUrl);
        if (result.error) {
          setError(result.error);
          return;
        }
        setSaved(true);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="flex max-w-[520px] flex-col gap-4">
      <div className="rounded-[18px] border border-sand bg-white px-[22px] pt-5 pb-[22px]">
        <div className="text-[15px] font-bold text-navy">Insurer logo</div>
        <div className="mt-1 text-[12.5px] leading-relaxed font-medium text-muted">
          Shown in the logo box on every Agent Landing Page. PNG with a transparent or white background works best.
        </div>

        <div className="mt-5">
          <ImageUploadField
            label="Great Eastern Takaful logo"
            kind="logo"
            value={logoUrl}
            onChange={(url) => {
              setLogoUrl(url);
              setSaved(false);
            }}
          />
        </div>

        {!logoUrl && (
          <div className="mt-4">
            <span className="text-[10.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">
              Placeholder shown until a logo is uploaded
            </span>
            <div className="mt-1.5 flex w-full max-w-[220px] items-center justify-center rounded-2xl border border-sand-2 bg-white px-4 py-3">
              <BrandWordmark />
            </div>
          </div>
        )}

        {error && <div className="mt-3 text-[12px] font-medium text-alert-red">{error}</div>}
        {saved && !dirty && <div className="mt-3 text-[12px] font-medium text-green">Saved and live.</div>}

        <div className="mt-4">
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="rounded-[11px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save logo"}
          </button>
        </div>
      </div>
    </div>
  );
}
