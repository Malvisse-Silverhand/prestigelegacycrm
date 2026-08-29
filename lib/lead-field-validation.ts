import { MALAYSIAN_STATES, LEAD_SOURCES } from "@/lib/lead-constants";
import { INTEREST_OPTIONS } from "@/lib/product-interest";

// Shared field validation/normalization for anything that writes to `leads`
// against a fixed list -- manual create/edit (leads/actions.ts) and the
// Google Sheets import (leads/import/actions.ts) both go through the same
// rules, so a value that isn't valid there isn't valid here either.
export const STATUS_VALUES = ["hot", "warm", "cold"];

export function pickState(v: string) {
  return (MALAYSIAN_STATES as readonly string[]).includes(v) ? v : null;
}
export function pickLeadSource(v: string) {
  return (LEAD_SOURCES as readonly string[]).includes(v) ? v : null;
}
export function pickInterest(v: string) {
  return INTEREST_OPTIONS.some((o) => o.label === v) ? v : null;
}
export function pickStatus(v: string, fallback: string) {
  return STATUS_VALUES.includes(v) ? v : fallback;
}
export function pickGender(v: string) {
  return v === "male" || v === "female" ? v : null;
}
export function pickSmoker(v: string) {
  return v === "" ? null : v === "true";
}
