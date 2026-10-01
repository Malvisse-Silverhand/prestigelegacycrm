import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABEL, type Role } from "@/lib/profile-types";
import { parseFields, UUID_RE, type FeedbackAnswers, type FormRow } from "./constants";

// 42P01 = table missing, 42703 = column missing: the migration hasn't been run.
function isMissingSchema(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "42703";
}

type RawForm = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  fields: unknown;
  is_open: boolean;
  created_at: string;
};

const FORM_COLUMNS = "id, slug, title, description, fields, is_open, created_at";

function toForm(f: RawForm, submissionCount: number | null): FormRow {
  return {
    id: f.id,
    slug: f.slug,
    title: f.title,
    description: f.description,
    fields: parseFields(f.fields),
    isOpen: f.is_open,
    createdAt: f.created_at,
    submissionCount,
  };
}

export type FormListResult = { setup: false; forms: [] } | { setup: true; forms: FormRow[] };

// RLS scopes this: agents get open forms only, SuperAdmins get everything.
// `canSeeSubmissions` only decides whether to ask for counts (RLS would return
// zero rows to anyone else, which would read as "0 submissions").
export async function getForms(canSeeSubmissions: boolean): Promise<FormListResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback_forms")
    .select(FORM_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    if (isMissingSchema(error)) return { setup: false, forms: [] };
    Sentry.captureException(error, { tags: { action: "feedback.getForms" } });
    return { setup: true, forms: [] };
  }

  const rows = (data ?? []) as RawForm[];
  const counts = new Map<string, number>();
  if (canSeeSubmissions && rows.length > 0) {
    await Promise.all(
      rows.map(async (f) => {
        const { count } = await supabase
          .from("feedback_submissions")
          .select("id", { count: "exact", head: true })
          .eq("form_id", f.id);
        counts.set(f.id, count ?? 0);
      }),
    );
  }
  return {
    setup: true,
    forms: rows.map((f) => toForm(f, canSeeSubmissions ? (counts.get(f.id) ?? 0) : null)),
  };
}

export type FormResult = { state: "not_setup" } | { state: "not_found" } | { state: "ok"; form: FormRow };

export async function getFormById(id: string): Promise<FormResult> {
  if (!UUID_RE.test(id)) return { state: "not_found" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("feedback_forms").select(FORM_COLUMNS).eq("id", id).maybeSingle();
  if (error) {
    if (isMissingSchema(error)) return { state: "not_setup" };
    Sentry.captureException(error, { tags: { action: "feedback.getFormById" } });
    return { state: "not_found" };
  }
  if (!data) return { state: "not_found" };
  return { state: "ok", form: toForm(data as RawForm, null) };
}

export async function getFormBySlug(slug: string): Promise<FormResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("feedback_forms").select(FORM_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) {
    if (isMissingSchema(error)) return { state: "not_setup" };
    Sentry.captureException(error, { tags: { action: "feedback.getFormBySlug" } });
    return { state: "not_found" };
  }
  if (!data) return { state: "not_found" };
  return { state: "ok", form: toForm(data as RawForm, null) };
}

export type SubmissionRow = {
  id: string;
  submittedBy: string;
  name: string;
  roleLabel: string;
  createdAt: string;
  pageUrl: string | null;
  answers: FeedbackAnswers;
};

type RawSubmission = {
  id: string;
  submitted_by: string;
  answers: unknown;
  page_url: string | null;
  created_at: string;
};

export const SUBMISSION_LIMIT = 2000;

// Submissions come through the caller's own session (RLS: SuperAdmin / Group
// Manager / Unit Manager only). Submitter names are then resolved with the
// service role, but ONLY for ids that session-scoped query already returned,
// because a Unit Manager's profiles RLS may not include every submitter.
export async function getSubmissions(
  formId: string,
): Promise<{ setup: boolean; rows: SubmissionRow[]; truncated: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback_submissions")
    .select("id, submitted_by, answers, page_url, created_at")
    .eq("form_id", formId)
    .order("created_at", { ascending: false })
    .limit(SUBMISSION_LIMIT);
  if (error) {
    if (isMissingSchema(error)) return { setup: false, rows: [], truncated: false };
    Sentry.captureException(error, { tags: { action: "feedback.getSubmissions" } });
    return { setup: true, rows: [], truncated: false };
  }

  const raw = (data ?? []) as RawSubmission[];
  const ids = [...new Set(raw.map((s) => s.submitted_by))];
  const names = new Map<string, { name: string; roleLabel: string }>();
  if (ids.length > 0) {
    const admin = createAdminClient();
    const { data: profs } = await admin.from("profiles").select("id, full_name, role").in("id", ids);
    for (const p of profs ?? []) {
      names.set(p.id as string, {
        name: p.full_name as string,
        roleLabel: ROLE_LABEL[p.role as Role] ?? "Agent",
      });
    }
  }

  const rows: SubmissionRow[] = raw.map((s) => {
    const who = names.get(s.submitted_by);
    const answers =
      s.answers && typeof s.answers === "object" && !Array.isArray(s.answers) ? (s.answers as FeedbackAnswers) : {};
    return {
      id: s.id,
      submittedBy: s.submitted_by,
      name: who?.name ?? "Unknown",
      roleLabel: who?.roleLabel ?? "",
      createdAt: s.created_at,
      pageUrl: s.page_url,
      answers,
    };
  });
  return { setup: true, rows, truncated: raw.length >= SUBMISSION_LIMIT };
}
