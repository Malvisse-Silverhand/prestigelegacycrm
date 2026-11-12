// Practice sessions: rules that do not need a database. Pure, so unit-tested.

import type { TKey } from "./i18n";

/** A practice session nobody touched for this many days is deleted. */
export const PRACTICE_RETENTION_DAYS = 30;
export const PRACTICE_TITLE_MAX = 80;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Rows with updated_at before this instant are due for deletion. */
export function purgeCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - PRACTICE_RETENTION_DAYS * DAY_MS);
}

/** Whole days left before auto-delete (0 = goes today, never negative). */
export function daysUntilPurge(updatedAt: string, now: Date = new Date()): number {
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return PRACTICE_RETENTION_DAYS;
  const left = Math.ceil((t + PRACTICE_RETENTION_DAYS * DAY_MS - now.getTime()) / DAY_MS);
  return Math.max(0, Math.min(PRACTICE_RETENTION_DAYS, left));
}

/** A practice title: trimmed, collapsed whitespace, no control characters, max 80. Empty -> null. */
export function sanitizeTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, PRACTICE_TITLE_MAX).trim();
  return cleaned === "" ? null : cleaned;
}

export type AttachOutcome = "ok" | "not_found" | "not_allowed" | "duplicate" | "error";

/** Maps what attach_practice_storyboard() returned to an outcome; anything unexpected is 'error'. */
export function mapAttachResult(raw: unknown): AttachOutcome {
  return raw === "ok" || raw === "not_found" || raw === "not_allowed" || raw === "duplicate" ? raw : "error";
}

const ATTACH_ERROR: Record<Exclude<AttachOutcome, "ok">, TKey> = {
  not_found: "practice.err.attachNotFound",
  not_allowed: "practice.err.attachNotAllowed",
  duplicate: "practice.err.attachDuplicate",
  error: "practice.err.attachFailed",
};

/** Dictionary key of the friendly message for a failed attach. */
export function attachErrorKey(outcome: Exclude<AttachOutcome, "ok">): TKey {
  return ATTACH_ERROR[outcome];
}
