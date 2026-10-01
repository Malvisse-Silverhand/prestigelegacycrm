"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import {
  FIELD_ID_RE,
  FIELD_TYPES,
  LIMITS,
  MIGRATION_MESSAGE,
  SLUG_RE,
  UUID_RE,
  isChoiceType,
  parseFields,
  type FeedbackAnswers,
  type FeedbackField,
  type FieldType,
  type FormInput,
} from "./constants";

// --- Feedback forms ----------------------------------------------------------
// SuperAdmins build and manage forms (RLS says the same, this is the second
// wall). Any signed-in user may submit to an open form, as themselves.

type Result = { error: string | null };
type Supabase = Awaited<ReturnType<typeof createClient>>;

const GENERIC_MSG = "Couldn't save the form. Please try again.";

function failure(error: { code?: string }, action: string, friendly = GENERIC_MSG): Result {
  if (error.code === "42P01" || error.code === "42703") return { error: MIGRATION_MESSAGE };
  if (error.code === "23505") return { error: "That link name is already used." };
  Sentry.captureException(error, { tags: { action } });
  return { error: friendly };
}

async function requireSuperAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") return null;
  return profile;
}

async function audit(supabase: Supabase, actorId: string, action: string, metadata: Record<string, unknown>) {
  // target_id references profiles, so form ids go in metadata instead.
  const { error } = await supabase.from("audit_log").insert({ actor_id: actorId, action, metadata });
  if (error) console.error(`${action}: audit_log insert failed`, error);
}

function revalidateForms(id?: string) {
  revalidatePath("/support/feedback");
  if (id) {
    revalidatePath(`/support/feedback/${id}/edit`);
    revalidatePath(`/support/feedback/${id}/submissions`);
  }
}

// Validates and normalises the builder's fields (trims, drops blank options).
function validateFields(input: unknown): { ok: false; error: string } | { ok: true; fields: FeedbackField[] } {
  if (!Array.isArray(input)) return { ok: false, error: "Invalid fields." };
  if (input.length > LIMITS.maxFields) return { ok: false, error: `A form can have at most ${LIMITS.maxFields} questions.` };
  const seen = new Set<string>();
  const fields: FeedbackField[] = [];
  for (let i = 0; i < input.length; i++) {
    const f = input[i] as Record<string, unknown> | null;
    const n = i + 1;
    if (!f || typeof f !== "object") return { ok: false, error: `Question ${n} is invalid.` };
    const id = typeof f.id === "string" ? f.id : "";
    const label = typeof f.label === "string" ? f.label.trim() : "";
    if (!FIELD_ID_RE.test(id)) return { ok: false, error: `Question ${n} has an invalid id.` };
    if (seen.has(id)) return { ok: false, error: `Question ${n} has a duplicate id.` };
    seen.add(id);
    if (label.length < 1 || label.length > LIMITS.label) {
      return { ok: false, error: `Question ${n}: label must be 1-${LIMITS.label} characters.` };
    }
    if (!(FIELD_TYPES as readonly string[]).includes(f.type as string)) return { ok: false, error: `Question ${n}: pick a type.` };
    const type = f.type as FieldType;
    const field: FeedbackField = { id, label, type, required: f.required === true };
    if (isChoiceType(type)) {
      const opts = (Array.isArray(f.options) ? f.options : [])
        .filter((o): o is string => typeof o === "string")
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
      if (opts.length < 1 || opts.length > LIMITS.maxOptions) {
        return { ok: false, error: `Question ${n}: add 1-${LIMITS.maxOptions} options.` };
      }
      if (opts.some((o) => o.length > LIMITS.option)) {
        return { ok: false, error: `Question ${n}: each option must be ${LIMITS.option} characters or fewer.` };
      }
      if (new Set(opts).size !== opts.length) return { ok: false, error: `Question ${n}: options must be different from each other.` };
      field.options = opts;
    }
    fields.push(field);
  }
  return { ok: true, fields };
}

function validateForm(input: FormInput) {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid form." } as const;
  const title = String(input.title ?? "").trim();
  const slug = String(input.slug ?? "").trim();
  const description = String(input.description ?? "").trim();
  if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) {
    return { ok: false, error: `Title must be ${LIMITS.titleMin}-${LIMITS.titleMax} characters.` } as const;
  }
  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: "Link name can only use lowercase letters, numbers and hyphens." } as const;
  }
  if (description.length > LIMITS.description) {
    return { ok: false, error: `Description can be at most ${LIMITS.description} characters.` } as const;
  }
  const f = validateFields(input.fields);
  if (!f.ok) return { ok: false, error: f.error } as const;
  return {
    ok: true,
    value: { title, slug, description: description || null, is_open: input.isOpen === true, fields: f.fields },
  } as const;
}

export async function createForm(input: FormInput): Promise<Result & { id?: string }> {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "Not allowed." };
  const v = validateForm(input);
  if (!v.ok) return { error: v.error };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feedback_forms")
      .insert({ ...v.value, created_by: profile.id })
      .select("id")
      .single();
    if (error || !data) return failure(error ?? {}, "feedback.createForm");
    await audit(supabase, profile.id, "feedback_form_created", {
      form_id: data.id,
      title: v.value.title,
      slug: v.value.slug,
    });
    revalidateForms();
    return { error: null, id: data.id as string };
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "feedback.createForm" } });
    return { error: GENERIC_MSG };
  }
}

export async function updateForm(id: string, input: FormInput): Promise<Result> {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "Not allowed." };
  if (typeof id !== "string" || !UUID_RE.test(id)) return { error: "Form not found." };
  const v = validateForm(input);
  if (!v.ok) return { error: v.error };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feedback_forms")
      .update({ ...v.value, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) return failure(error, "feedback.updateForm");
    if (!data) return { error: "That form no longer exists." };
    await audit(supabase, profile.id, "feedback_form_updated", {
      form_id: id,
      title: v.value.title,
      slug: v.value.slug,
    });
    revalidateForms(id);
    return { error: null };
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "feedback.updateForm" } });
    return { error: GENERIC_MSG };
  }
}

export async function setFormOpen(id: string, open: boolean): Promise<Result> {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "Not allowed." };
  if (typeof id !== "string" || !UUID_RE.test(id)) return { error: "Form not found." };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feedback_forms")
      .update({ is_open: open === true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) return failure(error, "feedback.setFormOpen");
    if (!data) return { error: "That form no longer exists." };
    await audit(supabase, profile.id, "feedback_form_updated", { form_id: id, is_open: open === true });
    revalidateForms(id);
    return { error: null };
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "feedback.setFormOpen" } });
    return { error: GENERIC_MSG };
  }
}

export async function deleteForm(id: string): Promise<Result> {
  const profile = await requireSuperAdmin();
  if (!profile) return { error: "Not allowed." };
  if (typeof id !== "string" || !UUID_RE.test(id)) return { error: "Form not found." };

  try {
    const supabase = await createClient();
    const { data: row, error: readError } = await supabase
      .from("feedback_forms")
      .select("title, slug")
      .eq("id", id)
      .maybeSingle();
    if (readError) return failure(readError, "feedback.deleteForm");
    if (!row) return { error: null };

    const { error } = await supabase.from("feedback_forms").delete().eq("id", id);
    if (error) return failure(error, "feedback.deleteForm");
    await audit(supabase, profile.id, "feedback_form_deleted", { form_id: id, title: row.title, slug: row.slug });
    revalidateForms(id);
    return { error: null };
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "feedback.deleteForm" } });
    return { error: GENERIC_MSG };
  }
}

// --- Submit --------------------------------------------------------------------
// Answers are checked against the form's CURRENT fields on the server; unknown
// keys are dropped and empty optional answers are left out.
function cleanAnswers(
  fields: FeedbackField[],
  raw: unknown,
): { ok: false; error: string } | { ok: true; answers: FeedbackAnswers } {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const answers: FeedbackAnswers = {};
  for (const f of fields) {
    const v = input[f.id];
    const missing = `Please answer: ${f.label}`;
    if (f.type === "short_text" || f.type === "long_text") {
      const text = typeof v === "string" ? v.trim() : "";
      const max = f.type === "short_text" ? LIMITS.shortText : LIMITS.longText;
      if (!text) {
        if (f.required) return { ok: false, error: missing };
        continue;
      }
      if (text.length > max) return { ok: false, error: `"${f.label}" must be ${max} characters or fewer.` };
      answers[f.id] = text;
    } else if (f.type === "dropdown") {
      if (typeof v !== "string" || v === "") {
        if (f.required) return { ok: false, error: missing };
        continue;
      }
      if (!(f.options ?? []).includes(v)) return { ok: false, error: `"${f.label}": pick one of the listed options.` };
      answers[f.id] = v;
    } else if (f.type === "checkboxes") {
      const picked = Array.isArray(v) ? v : [];
      if (picked.length === 0) {
        if (f.required) return { ok: false, error: missing };
        continue;
      }
      const opts = f.options ?? [];
      if (!picked.every((p) => typeof p === "string" && opts.includes(p))) {
        return { ok: false, error: `"${f.label}": pick from the listed options.` };
      }
      answers[f.id] = [...new Set(picked as string[])];
    } else {
      // rating
      if (v === undefined || v === null || v === "") {
        if (f.required) return { ok: false, error: missing };
        continue;
      }
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 5) return { ok: false, error: `"${f.label}": choose a rating from 1 to 5.` };
      answers[f.id] = n;
    }
  }
  return { ok: true, answers };
}

function snippet(text: string) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 120 ? `${flat.slice(0, 117)}...` : flat;
}

export async function submitForm(formId: string, answers: FeedbackAnswers, pageUrl?: string): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  if (typeof formId !== "string" || !UUID_RE.test(formId)) return { error: "Form not found." };
  const page = typeof pageUrl === "string" ? pageUrl.trim() : "";
  if (page.length > LIMITS.pageUrl) return { error: "The page link is too long." };

  try {
    const supabase = await createClient();
    const { data: form, error: readError } = await supabase
      .from("feedback_forms")
      .select("id, title, fields, is_open")
      .eq("id", formId)
      .maybeSingle();
    if (readError) return failure(readError, "feedback.submitForm", "Couldn't send your feedback. Please try again.");
    if (!form) return { error: "This form isn't available." };
    if (!form.is_open) return { error: "This form is closed and no longer accepts answers." };

    const fields = parseFields(form.fields);
    const cleaned = cleanAnswers(fields, answers);
    if (!cleaned.ok) return { error: cleaned.error };
    if (Object.keys(cleaned.answers).length === 0) return { error: "Please fill in the form first." };

    // Through the caller's own session -- RLS re-checks submitter and open state.
    const { error } = await supabase.from("feedback_submissions").insert({
      form_id: form.id,
      submitted_by: profile.id,
      answers: cleaned.answers,
      page_url: page || null,
    });
    if (error) return failure(error, "feedback.submitForm", "Couldn't send your feedback. Please try again.");

    // Best-effort bell notification for SuperAdmins; never fails the submit.
    try {
      const admin = createAdminClient();
      const { data: admins } = await admin.from("profiles").select("id").eq("role", "superadmin").eq("is_active", true);
      const targets = (admins ?? []).map((p) => p.id as string).filter((id) => id !== profile.id);
      if (targets.length > 0) {
        const firstText = fields.find((f) => f.type === "long_text" || f.type === "short_text");
        const preview = firstText ? cleaned.answers[firstText.id] : null;
        const { error: nError } = await admin.from("notifications").insert(
          targets.map((profile_id) => ({
            profile_id,
            kind: "feedback",
            title: `New feedback: ${form.title as string}`,
            body: `${profile.full_name}${typeof preview === "string" ? ` · ${snippet(preview)}` : ""}`,
            href: `/support/feedback/${form.id as string}/submissions`,
          })),
        );
        if (nError) console.error("feedback: notification insert failed", nError);
      }
    } catch (e) {
      console.error("feedback: notification failed", e);
    }

    revalidatePath(`/support/feedback/${form.id as string}/submissions`);
    revalidatePath("/support/feedback");
    return { error: null };
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "feedback.submitForm" } });
    return { error: "Couldn't send your feedback. Please try again." };
  }
}
