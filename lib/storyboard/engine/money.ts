// Money helpers for the storyboard engine.
//
// Inside the engine every amount is carried as integer sen where it is summed,
// and converted back to ringgit once, at output. Inputs from the UI are
// untrusted numbers, so everything is passed through num() first: NaN,
// Infinity, negative zero and non-numeric strings all become 0.

/** Coerce anything to a finite number; the design's `Number(x) || 0`. */
export function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Ringgit to integer sen (rounded half away from zero). */
export function toSen(rm: number): number {
  const n = num(rm);
  return Math.sign(n) * Math.round(Math.abs(n) * 100);
}

/** Integer sen to ringgit. Rounds once, to the sen. */
export function fromSen(sen: number): number {
  const n = num(sen);
  return Math.round(n) / 100;
}

/** Sum of ringgit amounts, accumulated in sen and returned in ringgit. */
export function sumRm(...amounts: number[]): number {
  return fromSen(amounts.reduce((acc, a) => acc + toSen(a), 0));
}

/**
 * "RM1,234". en-MY grouping. Whole ringgit show no decimals; a fractional
 * amount shows two (so RM0.50 is not displayed as RM1 or RM0).
 */
export function formatRM(value: number): string {
  const n = fromSen(toSen(num(value)));
  const abs = Math.abs(n);
  const whole = Number.isInteger(abs);
  const body = abs.toLocaleString("en-MY", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return (n < 0 ? "-RM" : "RM") + body;
}

/** Plain grouped integer, no currency. */
export function formatNum(value: number): string {
  return Math.round(num(value)).toLocaleString("en-MY");
}

/** x/y as a percentage clamped to 0..100; 0 when y is not positive. */
export function pctOf(x: number, y: number): number {
  const a = num(x);
  const b = num(y);
  if (b <= 0) return 0;
  return Math.max(0, Math.min(100, (a / b) * 100));
}

/** Divide, returning 0 instead of NaN/Infinity. */
export function safeDiv(a: number, b: number): number {
  const d = num(b);
  if (d === 0) return 0;
  const r = num(a) / d;
  return Number.isFinite(r) ? r : 0;
}

/** One decimal, as the design's toFixed(1), never "NaN". */
export function fixed1(value: number): string {
  return num(value).toFixed(1);
}

/** The design's rm(): whole ringgit, "RM1,234". Used for display strings. */
export function rmWhole(value: number): string {
  return formatRM(Math.round(num(value)));
}
