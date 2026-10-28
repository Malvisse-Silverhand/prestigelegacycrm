// Field definitions, types and validation for the lead form links.
//
// No server-only import on purpose: the public form (a client component) and
// the CRM UI both import this, and validation is pure so the form can run the
// same rules the server enforces on submit.
//
// Every value travels as a string (what an <input> gives you) and is
// converted to the column's type on the server: "true"/"false" for booleans,
// "" for unknown. A field's `key` IS the leads column it writes to.
import { MALAYSIAN_STATES } from "@/lib/lead-constants";

export type FormStage = 1 | 2;

export const FORM_STAGES: Record<FormStage, { label: string; description: string }> = {
  1: {
    label: "Additional Details",
    description: "Occupation, address & basic profile",
  },
  2: {
    label: "Application & Signature",
    description: "Full application details, nominees & signature",
  },
};

export type FormFieldType = "text" | "email" | "tel" | "date" | "number" | "textarea" | "select" | "radio";

export type FormFieldOption = { value: string; label: string };

export type FormField = {
  /** The leads column this writes to. */
  key: string;
  label: string;
  type: FormFieldType;
  section: string;
  required?: boolean;
  /** Shown pre-filled but never written back: the identity fields, which are also the Stage 2 gate. */
  readOnly?: boolean;
  options?: readonly FormFieldOption[];
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  /** Only shown (and required) when another field has this value. */
  showIf?: { key: string; equals: string };
  /** The column is boolean: "true" | "false" | "" on the wire. */
  boolean?: boolean;
};

const YES_NO: readonly FormFieldOption[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const opts = (values: readonly string[]): FormFieldOption[] => values.map((v) => ({ value: v, label: v }));

export const INCOME_RANGES = [
  "Not working",
  "Below RM1,500",
  "RM1,500 - RM2,499",
  "RM2,500 - RM4,499",
  "RM4,500 - RM7,499",
  "RM7,500 - RM9,999",
  "RM10,000 and above",
] as const;

export const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed"] as const;
export const PAYMENT_FREQUENCIES = ["Monthly", "Quarterly", "Yearly"] as const;
export const PAYMENT_METHODS = ["Debit Card", "Credit Card"] as const;

export const RACES = ["Malay", "Chinese", "Indian", "Bumiputera Sabah", "Bumiputera Sarawak", "Orang Asli", "Other"] as const;
export const RELIGIONS = ["Islam", "Buddhism", "Christianity", "Hinduism", "Sikhism", "Other"] as const;

// Inferred, not scraped: the source form's own list was not readable. Covers
// the banks a Malaysian policyholder is realistically paid through.
export const MALAYSIAN_BANKS = [
  "Maybank",
  "CIMB Bank",
  "Public Bank",
  "RHB Bank",
  "Hong Leong Bank",
  "AmBank",
  "Bank Islam",
  "Bank Muamalat",
  "Bank Rakyat",
  "BSN",
  "Affin Bank",
  "Alliance Bank",
  "OCBC Bank",
  "HSBC Bank",
  "Standard Chartered",
  "UOB",
  "Agrobank",
  "MBSB Bank",
  "Other",
] as const;

export const NOMINEE_RELATIONSHIPS = [
  "Spouse",
  "Child",
  "Mother",
  "Father",
  "Brother",
  "Sister",
  "Adopted child",
  "Other",
] as const;

export const MAX_NOMINEES = 4;

const STAGE1_FIELDS: FormField[] = [
  // Personal
  { key: "full_name", label: "Full name (as per NRIC)", type: "text", section: "Personal details", required: true, readOnly: true },
  { key: "phone", label: "Phone number", type: "tel", section: "Personal details", required: true, readOnly: true },
  { key: "email", label: "Email", type: "email", section: "Personal details", maxLength: 120 },
  { key: "date_of_birth", label: "Date of birth", type: "date", section: "Personal details", required: true },
  {
    key: "gender",
    label: "Gender",
    type: "radio",
    section: "Personal details",
    required: true,
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
    ],
  },
  { key: "is_smoker", label: "Do you smoke?", type: "radio", section: "Personal details", required: true, boolean: true, options: YES_NO },
  { key: "marital_status", label: "Marital status", type: "select", section: "Personal details", required: true, options: opts(MARITAL_STATUSES) },
  // Occupation
  { key: "occupation", label: "Occupation / job title", type: "text", section: "Occupation", required: true, maxLength: 120, hint: "Enter 'Not working' if you are not employed." },
  // Address
  { key: "address", label: "Address", type: "textarea", section: "Address", required: true, maxLength: 300, placeholder: "House / unit no., street, taman" },
  { key: "city", label: "City / district", type: "text", section: "Address", required: true, maxLength: 80 },
  { key: "postcode", label: "Postcode", type: "text", section: "Address", required: true, maxLength: 5, placeholder: "e.g. 50450" },
  { key: "state", label: "State", type: "select", section: "Address", required: true, options: opts(MALAYSIAN_STATES) },
];

const STAGE2_EXTRA_FIELDS: FormField[] = [
  // Identity & health (inserted after personal details by section order below)
  { key: "id_no", label: "NRIC number", type: "text", section: "Personal details", required: true, maxLength: 20, placeholder: "e.g. 900101-14-5678" },
  { key: "nationality", label: "Nationality", type: "text", section: "Personal details", required: true, maxLength: 60, placeholder: "e.g. Malaysian" },
  { key: "race", label: "Race", type: "select", section: "Personal details", required: true, options: opts(RACES) },
  { key: "religion", label: "Religion", type: "select", section: "Personal details", required: true, options: opts(RELIGIONS) },
  { key: "height_cm", label: "Height (cm)", type: "number", section: "Health", required: true, min: 20, max: 250 },
  { key: "weight_kg", label: "Weight (kg)", type: "number", section: "Health", required: true, min: 20, max: 250 },
  { key: "has_medical_condition", label: "Do you have any existing medical condition?", type: "radio", section: "Health", required: true, boolean: true, options: YES_NO },
  {
    key: "medical_condition_details",
    label: "Please describe the condition",
    type: "textarea",
    section: "Health",
    required: true,
    maxLength: 500,
    showIf: { key: "has_medical_condition", equals: "true" },
  },
  // Employment
  { key: "employer_name", label: "Company name", type: "text", section: "Employment", required: true, maxLength: 120, hint: "Enter 'Tidak Bekerja' if not working." },
  { key: "employer_address", label: "Work location", type: "textarea", section: "Employment", maxLength: 300 },
  { key: "income_range", label: "Monthly income", type: "select", section: "Employment", required: true, options: opts(INCOME_RANGES) },
  // Correspondence address
  {
    key: "correspondence_same",
    label: "Correspondence address",
    type: "radio",
    section: "Correspondence address",
    required: true,
    boolean: true,
    options: [
      { value: "true", label: "Same as residential address" },
      { value: "false", label: "Different from residential address" },
    ],
  },
  { key: "correspondence_address", label: "Address", type: "textarea", section: "Correspondence address", required: true, maxLength: 300, showIf: { key: "correspondence_same", equals: "false" } },
  { key: "correspondence_city", label: "City / district", type: "text", section: "Correspondence address", required: true, maxLength: 80, showIf: { key: "correspondence_same", equals: "false" } },
  { key: "correspondence_postcode", label: "Postcode", type: "text", section: "Correspondence address", required: true, maxLength: 5, showIf: { key: "correspondence_same", equals: "false" } },
  { key: "correspondence_state", label: "State", type: "select", section: "Correspondence address", required: true, options: opts(MALAYSIAN_STATES), showIf: { key: "correspondence_same", equals: "false" } },
  // Claim payout
  { key: "bank_name", label: "Bank name", type: "select", section: "Claim payout", required: true, options: opts(MALAYSIAN_BANKS) },
  { key: "bank_account_no", label: "Bank account number", type: "text", section: "Claim payout", required: true, maxLength: 24 },
  // Payment
  { key: "payment_frequency", label: "Payment frequency", type: "radio", section: "Premium payment", required: true, options: opts(PAYMENT_FREQUENCIES) },
  { key: "payment_method", label: "Payment method", type: "radio", section: "Premium payment", required: true, options: opts(PAYMENT_METHODS) },
];

// Section order for Stage 2 (Stage 1 is a prefix of it, minus the sections
// Stage 2 adds between its own).
const STAGE2_SECTION_ORDER = [
  "Personal details",
  "Health",
  "Occupation",
  "Employment",
  "Address",
  "Correspondence address",
  "Claim payout",
  "Premium payment",
];

/** Fields for a stage, in display order, grouped by section order. */
export function getFormFields(stage: FormStage): FormField[] {
  if (stage === 1) return STAGE1_FIELDS;
  const all = [...STAGE1_FIELDS, ...STAGE2_EXTRA_FIELDS];
  return STAGE2_SECTION_ORDER.flatMap((section) => all.filter((f) => f.section === section));
}

/** Sections in display order, each with its fields. */
export function getFormSections(stage: FormStage): { title: string; fields: FormField[] }[] {
  const out: { title: string; fields: FormField[] }[] = [];
  for (const f of getFormFields(stage)) {
    const last = out[out.length - 1];
    if (last && last.title === f.section) last.fields.push(f);
    else out.push({ title: f.section, fields: [f] });
  }
  return out;
}

/** Every key a draft or submission may carry for this stage. */
export function formFieldKeys(stage: FormStage): string[] {
  return getFormFields(stage).map((f) => f.key);
}

export type FormValues = Record<string, string>;

/** Whether a field is currently visible given the other values. */
export function isFieldVisible(field: FormField, values: FormValues): boolean {
  if (!field.showIf) return true;
  return (values[field.showIf.key] ?? "") === field.showIf.equals;
}

export type NomineeInput = {
  name: string;
  id_no: string;
  relationship: string;
  phone: string;
  /** Percent 0-100, as typed. */
  share_percent: string;
  /** YYYY-MM-DD, optional. */
  date_of_birth?: string;
};

export const EMPTY_NOMINEE: NomineeInput = { name: "", id_no: "", relationship: "", phone: "", share_percent: "", date_of_birth: "" };

/** A nominee as stored on the lead (CRM side). */
export type LeadNominee = {
  id: string;
  position: number;
  name: string;
  id_no: string | null;
  relationship: string | null;
  phone: string | null;
  share_percent: number | null;
  date_of_birth: string | null;
};

export type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates submitted values against a stage's definitions. Returns the
 * errors keyed by field key; an empty object means valid. Hidden (showIf)
 * fields are skipped. Read-only fields are never validated: they are not
 * accepted from the form at all.
 */
export function validateFormValues(stage: FormStage, values: FormValues, today: string): FieldErrors {
  const errors: FieldErrors = {};
  for (const f of getFormFields(stage)) {
    if (f.readOnly || !isFieldVisible(f, values)) continue;
    const v = (values[f.key] ?? "").trim();

    if (!v) {
      if (f.required) errors[f.key] = `${f.label} is required.`;
      continue;
    }
    if (f.maxLength && v.length > f.maxLength) {
      errors[f.key] = `${f.label} is too long.`;
      continue;
    }
    if (f.options && !f.options.some((o) => o.value === v)) {
      errors[f.key] = `Choose one of the options for ${f.label}.`;
      continue;
    }
    if (f.type === "email" && !EMAIL_RE.test(v)) errors[f.key] = "Enter a valid email address.";
    if (f.type === "date") {
      if (!DATE_RE.test(v) || Number.isNaN(Date.parse(v))) errors[f.key] = "Enter a valid date.";
      else if (v > today) errors[f.key] = "That date can't be in the future.";
      else if (v < "1900-01-01") errors[f.key] = "Enter a valid date.";
    }
    if (f.type === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) errors[f.key] = `${f.label} must be a number.`;
      else if ((f.min != null && n < f.min) || (f.max != null && n > f.max)) {
        errors[f.key] = `${f.label} must be between ${f.min} and ${f.max}.`;
      }
    }
    if ((f.key === "postcode" || f.key === "correspondence_postcode") && !/^\d{5}$/.test(v)) {
      errors[f.key] = "Postcode must be 5 digits.";
    }
    if (f.key === "id_no" && !/^[A-Za-z0-9-]{6,20}$/.test(v)) errors[f.key] = "Enter a valid NRIC / ID number.";
    if (f.key === "bank_account_no" && !/^\d{6,24}$/.test(v.replace(/[\s-]/g, ""))) {
      errors[f.key] = "Enter a valid account number (digits only).";
    }
  }
  return errors;
}

/**
 * Validates the nominee list. Errors are keyed `nominees` (list-level) or
 * `nominees.<index>.<field>`. At least one nominee, at most four, and the
 * shares must add up to 100.
 */
export function validateNominees(nominees: NomineeInput[], today: string): FieldErrors {
  const errors: FieldErrors = {};
  if (nominees.length === 0) {
    errors.nominees = "Add at least one nominee.";
    return errors;
  }
  if (nominees.length > MAX_NOMINEES) {
    errors.nominees = `You can add up to ${MAX_NOMINEES} nominees.`;
    return errors;
  }
  let total = 0;
  nominees.forEach((n, i) => {
    const at = (field: string) => `nominees.${i}.${field}`;
    if (!n.name.trim()) errors[at("name")] = "Name is required.";
    else if (n.name.trim().length > 120) errors[at("name")] = "Name is too long.";
    if (!/^[A-Za-z0-9-]{6,20}$/.test(n.id_no.trim())) errors[at("id_no")] = "Enter a valid NRIC / ID number.";
    if (!n.relationship.trim()) errors[at("relationship")] = "Relationship is required.";
    else if (n.relationship.trim().length > 60) errors[at("relationship")] = "Relationship is too long.";
    if (n.phone.replace(/\D/g, "").length < 9) errors[at("phone")] = "Enter a valid phone number.";
    const share = Number(n.share_percent);
    if (n.share_percent.trim() === "" || !Number.isFinite(share) || share < 0 || share > 100) {
      errors[at("share_percent")] = "Share must be between 0 and 100.";
    } else {
      total += share;
    }
    const dob = (n.date_of_birth ?? "").trim();
    if (dob && (!DATE_RE.test(dob) || Number.isNaN(Date.parse(dob)) || dob > today)) {
      errors[at("date_of_birth")] = "Enter a valid date.";
    }
  });
  if (!Object.keys(errors).some((k) => k.endsWith("share_percent")) && Math.abs(total - 100) > 0.001) {
    errors.nominees = `Nominee shares must add up to 100% (currently ${Math.round(total * 100) / 100}%).`;
  }
  return errors;
}

// ---- Link lifecycle (shared by CRM UI and public page) ----------------------

export type FormLinkStatus = "sent" | "opened" | "in_progress" | "completed";
export type FormLinkEffectiveStatus = FormLinkStatus | "expired" | "revoked";

export const FORM_STATUS_LABEL: Record<FormLinkEffectiveStatus, string> = {
  sent: "Sent",
  opened: "Opened",
  in_progress: "In progress",
  completed: "Completed",
  expired: "Expired",
  revoked: "Revoked",
};

export const FORM_LINK_TTL_DAYS = 7;

/** Revoked wins, then completed (a finished form is not "expired"), then expiry. */
export function effectiveLinkStatus(link: {
  status: FormLinkStatus;
  expires_at: string;
  revoked_at: string | null;
}): FormLinkEffectiveStatus {
  if (link.revoked_at) return "revoked";
  if (link.status === "completed") return "completed";
  if (new Date(link.expires_at).getTime() < Date.now()) return "expired";
  return link.status;
}

/** One row of the CRM's "Form links" list. Never carries the draft. */
export type FormLinkSummary = {
  id: string;
  leadId: string;
  stage: FormStage;
  status: FormLinkEffectiveStatus;
  /** The stored lifecycle status, before expiry/revocation are applied. */
  rawStatus: FormLinkStatus;
  url: string;
  createdAt: string;
  createdByName: string | null;
  expiresAt: string;
  revokedAt: string | null;
  openCount: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  submittedAt: string | null;
};

/** The current signature on a lead, for view / copy / download as PNG. */
export type LeadSignatureView = {
  id: string;
  /** `data:image/png;base64,...` -- usable directly as an <img src> or download href. */
  imageDataUrl: string;
  signedAt: string;
  signerName: string | null;
};

/** What the public page needs, after the server has decided what this visitor may see. */
export type PublicFormData = {
  stage: FormStage;
  status: FormLinkStatus;
  expiresAt: string;
  agentName: string | null;
  /** Field values: the lead's current data with any saved draft laid over it. */
  values: FormValues;
  /** Stage 2 only. Draft nominees, else the lead's saved ones, else empty. */
  nominees: NomineeInput[];
  /** True when a draft was loaded, so the page can say "welcome back". */
  resumed: boolean;
};

export type PublicFormState =
  | { state: "not_found" }
  | { state: "revoked" }
  | { state: "expired" }
  | { state: "completed"; stage: FormStage; agentName: string | null }
  /** Stage 2 before the name + phone check: nothing about the lead is included. */
  | { state: "needs_verification"; stage: FormStage; agentName: string | null }
  | { state: "ready"; form: PublicFormData };
