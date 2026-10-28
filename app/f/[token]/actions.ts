"use server";

import { saveFormDraft, submitLeadForm, verifyFormIdentity, type SubmitFormResult } from "@/lib/lead-forms";
import type { FormValues, NomineeInput } from "@/lib/lead-form-fields";

// The lead form's public actions. No CRM session: the token in the URL (plus,
// for Stage 2, the cookie verifyIdentity sets) is the only credential, and
// lib/lead-forms re-checks both on every call. Thin on purpose -- the rules
// live in lib/lead-forms.ts.

/** Stage 2 gate: full name + phone number must match the lead. */
export async function verifyIdentity(token: string, fullName: string, phone: string) {
  return verifyFormIdentity(token, fullName, phone);
}

/** Save progress so the lead can come back to the same link later. */
export async function saveDraft(token: string, data: { values: FormValues; nominees?: NomineeInput[] }) {
  return saveFormDraft(token, data);
}

/** Final submit. `signature` is a `data:image/png;base64,...` string (Stage 2). */
export async function submitForm(
  token: string,
  data: { values: FormValues; nominees?: NomineeInput[]; signature?: string; consent?: boolean },
): Promise<SubmitFormResult> {
  return submitLeadForm(token, data);
}
