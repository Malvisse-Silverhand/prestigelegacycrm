"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/image-upload-field";
import { BrandWordmark } from "@/components/brand-wordmark";
import { saveBrandLogo, saveBrandCover, saveBrandPrimary } from "../branding-actions";
import {
  BRAND_PRESETS,
  DEFAULT_BRAND,
  contrastWithWhite,
  isHexColor,
  normalizeHex,
  readableWithWhite,
} from "@/lib/brand-theme";

/**
 * SuperAdmin-only: the shared assets every Agent Landing Page falls back to
 * -- the insurer logo, and the header background cover -- unlike Settings >
 * My Profile's per-agent images, there is exactly one of each for the whole
 * site, stored on site_settings rather than a profile. See saveBrandLogo and
 * saveBrandCover. Two independent cards, two independent save buttons -- an
 * agency that only wants to change one doesn't have to touch the other.
 */
export function BrandingTab({
  initial,
  initialCover,
  initialBrand,
}: {
  initial: string | null;
  initialCover: string | null;
  initialBrand: string | null;
}) {
  return (
    <div className="flex max-w-[520px] flex-col gap-4">
      <ThemeCard initial={initialBrand} />
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
          className="rounded-[11px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
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
          className="rounded-[11px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save cover"}
        </button>
      </div>
    </div>
  );
}

// The system-wide colour: the sidebar, the dark cards and the primary buttons
// all follow it (see --brand-primary in globals.css). Two named choices --
// Prestige Blue, the navy the system launched with, and Great Eastern Red --
// plus a custom colour for anything else.
//
// The page itself is the preview: while a colour is selected here it is
// applied to the live document, so the sidebar beside this card recolours as
// you choose, and it snaps back if you leave without saving.
function ThemeCard({ initial }: { initial: string | null }) {
  const router = useRouter();
  const saved = initial ?? DEFAULT_BRAND;
  const [hex, setHex] = useState(saved);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const valid = isHexColor(hex);
  const current = valid ? normalizeHex(hex) : null;
  const readable = current ? readableWithWhite(current) : true;
  const dirty = current !== null && current !== saved;
  const preset = current ? BRAND_PRESETS.find((p) => p.hex === current) : undefined;

  // Live preview on the real page. The cleanup removes the override, which
  // returns the document to whatever the server rendered (the saved colour).
  useEffect(() => {
    if (!current || !readable) return;
    document.documentElement.style.setProperty("--brand-primary", current);
    return () => {
      document.documentElement.style.removeProperty("--brand-primary");
    };
  }, [current, readable]);

  function pick(next: string) {
    setHex(next);
    setDone(false);
    setError(null);
  }

  function save() {
    if (!current) return;
    setError(null);
    setDone(false);
    startTransition(async () => {
      try {
        const result = await saveBrandPrimary(current);
        if (result.error) {
          setError(result.error);
          return;
        }
        setDone(true);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="rounded-[18px] border border-sand bg-white px-[22px] pt-5 pb-[22px]">
      <div className="text-[15px] font-bold text-navy">System colour</div>
      <div className="mt-1 text-[12.5px] leading-relaxed font-medium text-muted">
        Recolours the sidebar, the dark cards and the main buttons across the whole system, for everyone. Headings and
        body text stay dark so they always read clearly.
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {BRAND_PRESETS.map((p) => {
          const active = current === p.hex;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.hex)}
              aria-pressed={active}
              className={`press flex flex-col items-start gap-2 rounded-[13px] border p-3 text-left ${
                active ? "border-brand ring-2 ring-brand/25" : "border-sand-2 hover:border-brand"
              }`}
            >
              <span
                className="flex h-10 w-full items-center justify-end rounded-[9px] px-2"
                style={{ background: p.hex }}
              >
                {active && (
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fac748" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                )}
              </span>
              <span className="text-[12.5px] font-bold text-navy">{p.name}</span>
              <span className="-mt-1.5 text-[10.5px] font-medium text-muted">
                {p.hex.toUpperCase()} · {p.note}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <span className="text-[10.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">Or a custom colour</span>
        <div className="mt-1.5 flex items-center gap-2.5">
          <input
            type="color"
            value={valid ? normalizeHex(hex) : DEFAULT_BRAND}
            onChange={(e) => pick(e.target.value)}
            aria-label="Pick a custom colour"
            className="h-10 w-12 flex-none cursor-pointer rounded-[9px] border border-sand-2 bg-white p-1"
          />
          <input
            value={hex}
            onChange={(e) => pick(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
            spellCheck={false}
            maxLength={7}
            aria-label="Colour code"
            placeholder="#0f2540"
            className="h-10 w-[120px] rounded-[9px] border border-sand-2 bg-white px-3 font-mono text-[13px] font-semibold text-navy uppercase outline-none focus:border-gold"
          />
          {!preset && current && <span className="text-[11px] font-semibold text-muted">Custom</span>}
        </div>
      </div>

      {!valid && <div className="mt-3 text-[12px] font-medium text-alert-red">Enter a colour as #rrggbb, e.g. #d12822.</div>}
      {valid && !readable && (
        <div className="mt-3 rounded-[10px] border border-[#f0dfb4] bg-warn-gold-bg px-3 py-2 text-[12px] font-medium text-warn-gold-text">
          Too light for white text (contrast {contrastWithWhite(normalizeHex(hex)).toFixed(1)}:1, needs 4.5:1). Pick a
          darker shade -- it can&rsquo;t be saved as it is.
        </div>
      )}
      {error && <div className="mt-3 text-[12px] font-medium text-alert-red">{error}</div>}
      {done && !dirty && <div className="mt-3 text-[12px] font-medium text-green">Saved. Everyone sees it now.</div>}

      <div className="mt-4 flex items-center gap-2.5">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty || !readable}
          className="rounded-[11px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save colour"}
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => pick(saved)}
            className="text-[12.5px] font-semibold text-muted underline-offset-2 hover:underline"
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
