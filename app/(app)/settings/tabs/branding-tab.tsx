"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/image-upload-field";
import { BrandWordmark } from "@/components/brand-wordmark";
import { saveBrandLogo, saveBrandCover } from "../branding-actions";

/**
 * SuperAdmin-only: the shared assets every Agent Landing Page falls back to
 * -- the insurer logo, and the header background cover -- unlike Settings >
 * My Profile's per-agent images, there is exactly one of each for the whole
 * site, stored on site_settings rather than a profile. See saveBrandLogo and
 * saveBrandCover. Two independent cards, two independent save buttons -- an
 * agency that only wants to change one doesn't have to touch the other.
 */
export function BrandingTab({ initial, initialCover }: { initial: string | null; initialCover: string | null }) {
  return (
    <div className="flex max-w-[520px] flex-col gap-4">
      <LogoCard initial={initial} />
      <CoverCard initial={initialCover} />
    </div>
  );
}

function LogoCard({ initial }: { initial: string | null }) {
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
  );
}

// The built-in red pattern every Agent Landing Page header has used from the
// start -- the fallback preview here so an empty field visibly means "the red
// pattern shows", not "no header at all".
const DEFAULT_COVER = "/brand/ge-pattern-red.jpg";

function CoverCard({ initial }: { initial: string | null }) {
  const router = useRouter();
  const [coverUrl, setCoverUrl] = useState(initial ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = coverUrl !== (initial ?? "");

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await saveBrandCover(coverUrl);
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
    <div className="rounded-[18px] border border-sand bg-white px-[22px] pt-5 pb-[22px]">
      <div className="text-[15px] font-bold text-navy">Landing page background cover</div>
      <div className="mt-1 text-[12.5px] leading-relaxed font-medium text-muted">
        The header background behind every Agent Landing Page that hasn&rsquo;t set its own. An agent&rsquo;s own
        header image (Settings &gt; My Profile, or a page&rsquo;s own settings) always takes priority over this.
      </div>

      <div className="mt-5">
        <ImageUploadField
          label="Background cover"
          kind="header"
          value={coverUrl}
          fallbackPreview={DEFAULT_COVER}
          onChange={(url) => {
            setCoverUrl(url);
            setSaved(false);
          }}
        />
      </div>

      {!coverUrl && (
        <div className="mt-4 text-[11px] font-medium text-taupe-2">
          Using the built-in red pattern shown above until a cover is uploaded.
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
          {pending ? "Saving…" : "Save cover"}
        </button>
      </div>
    </div>
  );
}
