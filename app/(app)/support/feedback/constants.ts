// Shared by the server actions, the data helpers and the client views. The
// limits mirror the CHECK constraints in
// supabase/migrations/20261001100000_feedback_forms.sql.

export const FIELD_TYPES = ["short_text", "long_text", "dropdown", "checkboxes", "rating"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  short_text: "Short answer",
  long_text: "Long answer",
  dropdown: "Dropdown",
  checkboxes: "Checkboxes",
  rating: "Rating (1-5)",
};

export type FeedbackField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
};

export type FeedbackAnswer = string | string[] | number;
export type FeedbackAnswers = Record<string, FeedbackAnswer>;

export type FormRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  fields: FeedbackField[];
  isOpen: boolean;
  createdAt: string;
  // null when the viewer isn't allowed to see submissions (agents).
  submissionCount: number | null;
};

export type FormInput = {
  title: string;
  slug: string;
  description: string;
  isOpen: boolean;
  fields: FeedbackField[];
};

export const LIMITS = {
  titleMin: 2,
  titleMax: 140,
  description: 2000,
  slugMax: 60,
  maxFields: 40,
  label: 200,
  maxOptions: 50,
  option: 120,
  shortText: 300,
  longText: 5000,
  pageUrl: 500,
} as const;

export const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$/;
export const FIELD_ID_RE = /^[a-z0-9_]{1,40}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MIGRATION_MESSAGE = "Run the latest database migration first.";

export function isChoiceType(type: FieldType) {
  return type === "dropdown" || type === "checkboxes";
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITS.slugMax)
    .replace(/-+$/g, "");
}

export function randomSuffix() {
  return Math.random().toString(36).slice(2, 6).padEnd(4, "0");
}

// Stable-ish field id: slugified label plus a short suffix, e.g. "your_feedback_k3x9".
export function makeFieldId(label: string, suffix: string) {
  const base = slugify(label).replace(/-/g, "_").slice(0, 28).replace(/^_+|_+$/g, "");
  return `${base || "q"}_${suffix}`;
}

// Tolerant reader for the jsonb column -- never trusts the shape.
export function parseFields(raw: unknown): FeedbackField[] {
  if (!Array.isArray(raw)) return [];
  const out: FeedbackField[] = [];
  for (const f of raw) {
    if (!f || typeof f !== "object") continue;
    const r = f as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.label !== "string") continue;
    if (!(FIELD_TYPES as readonly string[]).includes(r.type as string)) continue;
    const type = r.type as FieldType;
    const field: FeedbackField = { id: r.id, label: r.label, type, required: r.required === true };
    if (isChoiceType(type)) {
      field.options = Array.isArray(r.options) ? r.options.filter((o): o is string => typeof o === "string") : [];
    }
    out.push(field);
  }
  return out;
}
