import { MALAYSIAN_STATES, LEAD_SOURCES, OCCUPATION_CLASSES } from "@/lib/lead-constants";
import { INTEREST_OPTIONS } from "@/lib/product-interest";
import { getFormFields } from "@/lib/lead-form-fields";

// Shared field validation/normalization for anything that writes to `leads`
// against a fixed list -- manual create/edit (leads/actions.ts) and the
// lead upload (leads/upload) both go through the same
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
export function pickOccupationClass(v: string) {
  return OCCUPATION_CLASSES.some((o) => o.value === v) ? v : null;
}

// ---- Application details (the columns the lead form links also write) ------
//
// Same rules as the prospect-facing form (lib/lead-form-fields.ts) minus the
// "required" part: an agent may fill these in piecemeal. Every field is
// nullable, and an unrecognised choice is an error rather than silently
// dropped, because the table has check constraints on three of them.
const EXTRA_TEXT_KEYS = [
  "id_no",
  "nationality",
  "city",
  "employer_name",
  "employer_address",
  "medical_condition_details",
  "correspondence_address",
  "correspondence_city",
  "bank_account_no",
] as const;
const EXTRA_CHOICE_KEYS = [
  "marital_status",
  "race",
  "religion",
  "income_range",
  "correspondence_state",
  "bank_name",
  "payment_frequency",
  "payment_method",
] as const;

/** Returns the columns to write, or `{ error }`. Only call when `extra_present` was submitted. */
export function parseLeadExtras(formData: FormData): { values: Record<string, string | number | boolean | null> } | { error: string } {
  const fields = new Map(getFormFields(2).map((f) => [f.key, f]));
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const values: Record<string, string | number | boolean | null> = {};

  for (const k of EXTRA_TEXT_KEYS) {
    const v = get(k);
    const max = fields.get(k)?.maxLength ?? 300;
    if (v.length > max) return { error: `${fields.get(k)?.label ?? k} is too long.` };
    values[k] = v || null;
  }
  if (values.id_no && !/^[A-Za-z0-9-]{6,20}$/.test(String(values.id_no))) return { error: "Enter a valid NRIC / ID number." };
  if (values.bank_account_no && !/^\d{6,24}$/.test(String(values.bank_account_no).replace(/[\s-]/g, ""))) {
    return { error: "Enter a valid bank account number (digits only)." };
  }

  for (const k of EXTRA_CHOICE_KEYS) {
    const v = get(k);
    const options = fields.get(k)?.options;
    if (v && options && !options.some((o) => o.value === v)) return { error: `Choose one of the options for ${fields.get(k)?.label ?? k}.` };
    values[k] = v || null;
  }

  const cpc = get("correspondence_postcode");
  if (cpc && !/^\d{5}$/.test(cpc)) return { error: "Correspondence postcode must be exactly 5 digits." };
  values.correspondence_postcode = cpc || null;

  for (const k of ["height_cm", "weight_kg"] as const) {
    const v = get(k);
    if (!v) {
      values[k] = null;
      continue;
    }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 20 || n > 250) return { error: `${fields.get(k)?.label ?? k} must be between 20 and 250.` };
    values[k] = n;
  }

  for (const k of ["has_medical_condition", "correspondence_same"] as const) {
    values[k] = pickSmoker(get(k));
  }
  return { values };
}
