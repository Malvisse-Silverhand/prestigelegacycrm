// The system-wide brand colour a SuperAdmin can choose in Settings > Branding.
//
// Pure and dependency-free on purpose: the Branding tab (client) uses it to
// preview and warn, the server action uses it to validate what is saved, and
// app/layout.tsx uses it to re-check what it reads back before writing it into
// a <style> tag. That last use is the one that matters for safety -- the value
// ends up inside CSS, so it is only ever emitted after passing isHexColor(),
// which admits exactly "#" plus six hex digits and nothing else.

export const DEFAULT_BRAND = "#0f2540";

export type BrandPreset = { id: string; name: string; hex: string; note: string };

export const BRAND_PRESETS: BrandPreset[] = [
  { id: "prestige-blue", name: "Prestige Blue", hex: DEFAULT_BRAND, note: "The navy the system launched with" },
  { id: "great-eastern-red", name: "Great Eastern Red", hex: "#d12822", note: "Great Eastern Takaful's red" },
];

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Lower-cased so the same colour is always stored the same way. */
export function normalizeHex(value: string): string {
  return value.trim().toLowerCase();
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG contrast ratio of white text on this colour. */
export function contrastWithWhite(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const l = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  return 1.05 / (l + 0.05);
}

// The sidebar, the dark cards and the primary buttons all put white text on
// this colour. Below 4.5:1 that text stops being comfortably readable, so a
// colour lighter than this is refused rather than saved and left for every
// agent to squint at.
export const MIN_WHITE_CONTRAST = 4.5;

export function readableWithWhite(hex: string): boolean {
  return contrastWithWhite(hex) >= MIN_WHITE_CONTRAST;
}
