import "server-only";
import * as Sentry from "@sentry/nextjs";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { toWaNumber } from "@/lib/landing-public";
import { malaysiaToday } from "@/lib/malaysia-date";
import { appOrigin } from "@/lib/app-url";
import { leadFormSubmittedEmail, sendEmail } from "@/lib/email";
import {
  createFormSessionToken,
  formSessionCookieName,
  FORM_SESSION_MAX_AGE,
  FORM_SESSION_PATH,
  verifyFormSessionToken,
} from "@/lib/lead-form-session";
import {
  FORM_STAGES,
  MAX_NOMINEES,
  effectiveLinkStatus,
  formFieldKeys,
  getFormFields,
  isFieldVisible,
  validateFormValues,
  validateNominees,
  type FieldErrors,
  type FormField,
  type FormLinkStatus,
  type FormStage,
  type FormValues,
  type NomineeInput,
  type PublicFormState,
} from "@/lib/lead-form-fields";

// Server side of the lead form links: resolving a token, the Stage 2 identity
// gate, save-progress, and submit. Everything here runs through the service
// role because the visitor has no session; the token (plus, for Stage 2, the
// verified-browser cookie) is the only credential, and it is re-checked on
// every call so a revoke or expiry takes effect immediately.
//
// Client-safe pieces (field definitions, validation, types) live in
// lib/lead-form-fields.ts.

export type FormLinkRow = {
  id: string;
  lead_id: string;
  stage: FormStage;
  token: string;
  status: FormLinkStatus;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  open_count: number;
  draft: { values?: FormValues; nominees?: NomineeInput[] } | null;
  submitted_at: string | null;
};

const LINK_COLUMNS = "id, lead_id, stage, token, status, created_at, expires_at, revoked_at, open_count, draft, submitted_at";

// bump_portal_open's token shape: 32 hex characters. Anything else cannot be a
// real link, so it is rejected without a query.
const TOKEN_RE = /^[0-9a-f]{32}$/;

/** `new_portal_token()` in the database is the generator; this is only for tests / seeding. */
export function isWellFormedFormToken(token: string): boolean {
  return TOKEN_RE.test(token);
}

export type ResolvedLink =
  | { ok: true; link: FormLinkRow }
  | { ok: false; reason: "not_found" | "revoked" | "expired" };

/** Looks a link up by token. A completed link still resolves (it renders the thank-you page). */
export async function resolveFormLink(token: string): Promise<ResolvedLink> {
  if (!TOKEN_RE.test(token)) return { ok: false, reason: "not_found" };
  const admin = createAdminClient();
  const { data } = await admin.from("lead_form_links").select(LINK_COLUMNS).eq("token", token).maybeSingle();
  if (!data) return { ok: false, reason: "not_found" };
  const link = data as unknown as FormLinkRow;

  const status = effectiveLinkStatus(link);
  if (status === "revoked") return { ok: false, reason: "revoked" };
  if (status === "expired") return { ok: false, reason: "expired" };
  return { ok: true, link };
}

async function recordFormOpen(linkId: string) {
  try {
    await createAdminClient().rpc("bump_form_open", { link_id: linkId });
  } catch (error) {
    Sentry.captureException(error);
  }
}

// ---- value <-> column conversion -------------------------------------------

function toFormString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function toColumnValue(field: FormField, raw: string): string | number | boolean | null {
  const v = raw.trim();
  if (v === "") return null;
  if (field.boolean) return v === "true";
  if (field.type === "number") return Number(v);
  return v;
}

function sameValue(field: FormField, current: unknown, next: string): boolean {
  const a = toFormString(current).trim();
  const b = next.trim();
  if (field.type === "number" && a !== "" && b !== "") return Number(a) === Number(b);
  return a === b;
}

function displayValue(field: FormField, raw: string): string {
  const v = raw.trim();
  if (!v) return "—";
  const option = field.options?.find((o) => o.value === v);
  return option ? option.label : v;
}

function agentLoad(agentId: string | null) {
  if (!agentId) return Promise.resolve(null);
  return createAdminClient()
    .from("profiles")
    .select("full_name, email, is_active")
    .eq("id", agentId)
    .maybeSingle()
    .then(({ data }) => data as { full_name: string; email: string | null; is_active: boolean | null } | null);
}

async function loadLeadForForm(leadId: string, stage: FormStage) {
  const admin = createAdminClient();
  const columns = ["id", "lead_no", "full_name", "phone", "agent_id", ...formFieldKeys(stage)];
  const { data } = await admin.from("leads").select(Array.from(new Set(columns)).join(", ")).eq("id", leadId).maybeSingle();
  return (data as unknown as Record<string, unknown> | null) ?? null;
}

async function loadLeadNominees(leadId: string): Promise<NomineeInput[]> {
  const { data } = await createAdminClient()
    .from("lead_nominees")
    .select("name, id_no, relationship, phone, share_percent, date_of_birth")
    .eq("lead_id", leadId)
    .order("position", { ascending: true });
  return (data ?? []).map((n) => ({
    name: toFormString(n.name),
    id_no: toFormString(n.id_no),
    relationship: toFormString(n.relationship),
    phone: toFormString(n.phone),
    share_percent: toFormString(n.share_percent),
    date_of_birth: toFormString(n.date_of_birth),
  }));
}

// ---- Stage 2 identity gate ---------------------------------------------------

/** Case-insensitive, whitespace-collapsed, punctuation-light comparison of names. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[.,'’`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Digits only, local 0 -> 60, so "012-345 6789" matches "+60 12 345 6789". */
export function normalizePhone(phone: string): string {
  return toWaNumber(phone);
}

async function hasVerifiedSession(link: FormLinkRow): Promise<boolean> {
  if (link.stage !== 2) return true;
  const jar = await cookies();
  return verifyFormSessionToken(jar.get(formSessionCookieName(link.id))?.value, link.id);
}

/**
 * Stage 2 gate: full name + phone must match the lead. On success a signed
 * cookie scoped to this link is set. Rate-limited per token+IP, and again per
 * link across all IPs so a spread-out guesser still hits a ceiling.
 */
export async function verifyFormIdentity(token: string, fullName: string, phone: string): Promise<{ error: string | null }> {
  const ip = await clientIp();
  const allowed = await checkRateLimit(`form-verify:${token}`, ip, 5, 15 * 60);
  if (!allowed) return { error: "Too many attempts. Please wait a few minutes and try again." };

  const resolved = await resolveFormLink(token);
  if (!resolved.ok) return { error: "This link is no longer active." };
  const { link } = resolved;
  if (link.stage !== 2) return { error: null };

  const overall = await checkRateLimit(`form-verify-link:${link.id}`, "all", 20, 60 * 60);
  if (!overall) return { error: "Too many attempts. Please wait a while, or ask your agent for help." };

  const lead = await loadLeadForForm(link.lead_id, 2);
  if (!lead) return { error: "This link is no longer active." };

  const nameOk = normalizeName(fullName) !== "" && normalizeName(fullName) === normalizeName(String(lead.full_name ?? ""));
  const typedPhone = normalizePhone(phone);
  const phoneOk = typedPhone !== "" && typedPhone === normalizePhone(String(lead.phone ?? ""));
  if (!nameOk || !phoneOk) return { error: "Those details don't match our records. Please check and try again." };

  const jar = await cookies();
  jar.set(formSessionCookieName(link.id), createFormSessionToken(link.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: FORM_SESSION_PATH,
    maxAge: FORM_SESSION_MAX_AGE,
  });
  return { error: null };
}

// ---- Public page state -------------------------------------------------------

/**
 * Everything the public page needs, decided on the server. Counts an open.
 * Before verification a Stage 2 link reveals nothing about the lead.
 */
export async function loadPublicFormState(token: string): Promise<PublicFormState> {
  const resolved = await resolveFormLink(token);
  if (!resolved.ok) return { state: resolved.reason };
  const { link } = resolved;

  const lead = await loadLeadForForm(link.lead_id, link.stage);
  if (!lead) return { state: "not_found" };
  const agent = await agentLoad((lead.agent_id as string | null) ?? null);
  const agentName = agent?.full_name ?? null;

  void recordFormOpen(link.id);

  if (link.status === "completed") return { state: "completed", stage: link.stage, agentName };
  if (!(await hasVerifiedSession(link))) return { state: "needs_verification", stage: link.stage, agentName };

  const values: FormValues = {};
  for (const f of getFormFields(link.stage)) values[f.key] = toFormString(lead[f.key]).trim();

  const draftValues = link.draft?.values ?? {};
  for (const f of getFormFields(link.stage)) {
    if (f.readOnly) continue;
    if (typeof draftValues[f.key] === "string") values[f.key] = draftValues[f.key];
  }

  let nominees: NomineeInput[] = [];
  if (link.stage === 2) {
    nominees = Array.isArray(link.draft?.nominees) ? link.draft!.nominees! : await loadLeadNominees(link.lead_id);
  }

  return {
    state: "ready",
    form: {
      stage: link.stage,
      status: link.status,
      expiresAt: link.expires_at,
      agentName,
      values,
      nominees,
      resumed: link.draft != null,
    },
  };
}

// ---- Shared write guard -------------------------------------------------------

async function requireWritableLink(token: string): Promise<{ link: FormLinkRow } | { error: string }> {
  const resolved = await resolveFormLink(token);
  if (!resolved.ok) return { error: "This link is no longer active." };
  const { link } = resolved;
  if (link.status === "completed") {
    return { error: "This form has already been submitted. Ask your agent if you need to change something." };
  }
  if (!(await hasVerifiedSession(link))) return { error: "Please verify your details first." };
  return { link };
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Only known, editable keys survive, as bounded strings. */
function sanitizeValues(stage: FormStage, input: unknown): FormValues {
  const out: FormValues = {};
  if (!input || typeof input !== "object") return out;
  const raw = input as Record<string, unknown>;
  for (const f of getFormFields(stage)) {
    if (f.readOnly) continue;
    if (raw[f.key] !== undefined) out[f.key] = str(raw[f.key], f.maxLength ?? 100);
  }
  return out;
}

function sanitizeNominees(input: unknown): NomineeInput[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, MAX_NOMINEES).map((n) => {
    const r = (n && typeof n === "object" ? n : {}) as Record<string, unknown>;
    return {
      name: str(r.name, 120),
      id_no: str(r.id_no, 20),
      relationship: str(r.relationship, 60),
      phone: str(r.phone, 20),
      share_percent: str(r.share_percent, 6),
      date_of_birth: str(r.date_of_birth, 10),
    };
  });
}

// ---- Save progress ------------------------------------------------------------

export async function saveFormDraft(
  token: string,
  input: { values: FormValues; nominees?: NomineeInput[] },
): Promise<{ error: string | null; savedAt: string | null }> {
  const ip = await clientIp();
  if (!(await checkRateLimit(`form-save:${token}`, ip, 100, 60 * 60))) {
    return { error: "Too many saves. Please wait a moment.", savedAt: null };
  }

  const guard = await requireWritableLink(token);
  if ("error" in guard) return { error: guard.error, savedAt: null };
  const { link } = guard;

  const draft = {
    values: sanitizeValues(link.stage, input.values),
    ...(link.stage === 2 ? { nominees: sanitizeNominees(input.nominees) } : {}),
  };
  const savedAt = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("lead_form_links")
    .update({ draft, draft_saved_at: savedAt, status: "in_progress" })
    .eq("id", link.id);
  if (error) return { error: "Couldn't save your progress. Please try again.", savedAt: null };
  return { error: null, savedAt };
}

// ---- Submit ---------------------------------------------------------------------

// The pad exports a cropped PNG of at most 480x160 (a few KB); anything far
// bigger was not produced by it.
const MAX_SIGNATURE_CHARS = 200_000;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isValidPngDataUrl(dataUrl: string): boolean {
  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix) || dataUrl.length > MAX_SIGNATURE_CHARS) return false;
  const bytes = Buffer.from(dataUrl.slice(prefix.length), "base64");
  return bytes.length > 100 && PNG_MAGIC.every((b, i) => bytes[i] === b);
}

function nomineeSummary(list: { name: string; relationship: string; share_percent: string }[]): string {
  if (list.length === 0) return "—";
  return list
    .map((n) => `${n.name}${n.relationship ? ` (${n.relationship})` : ""} ${Number(n.share_percent)}%`)
    .join(", ");
}

export type SubmitFormResult = { error: string | null; fieldErrors?: FieldErrors };

/**
 * Validates and applies a submission: overwrites the lead's columns, logs ONE
 * lead_activity row listing every changed field as "Field: old → new",
 * replaces the lead's nominees and stores the signature (Stage 2), marks the
 * link completed, and emails the assigned agent. The email is best effort.
 *
 * Not one transaction (PostgREST has none): the order is lead, nominees,
 * signature, activity, link -- so a failure part-way leaves the link open and
 * the prospect can simply submit again.
 */
export async function submitLeadForm(
  token: string,
  input: { values: FormValues; nominees?: NomineeInput[]; signature?: string; consent?: boolean },
): Promise<SubmitFormResult> {
  const ip = await clientIp();
  if (!(await checkRateLimit(`form-submit:${token}`, ip, 10, 60 * 60))) {
    return { error: "Too many attempts. Please wait a while and try again." };
  }

  const guard = await requireWritableLink(token);
  if ("error" in guard) return { error: guard.error };
  const { link } = guard;
  const stage = link.stage;

  const values = sanitizeValues(stage, input.values);
  const today = malaysiaToday();
  const fieldErrors = validateFormValues(stage, values, today);

  let nominees: NomineeInput[] = [];
  if (stage === 2) {
    nominees = sanitizeNominees(input.nominees);
    Object.assign(fieldErrors, validateNominees(nominees, today));
    if (!input.consent) fieldErrors.consent = "Please tick the box to give your consent.";
    if (!input.signature || !isValidPngDataUrl(input.signature)) fieldErrors.signature = "Please sign in the box.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please check the highlighted fields.", fieldErrors };
  }

  const admin = createAdminClient();
  const lead = await loadLeadForForm(link.lead_id, stage);
  if (!lead) return { error: "This link is no longer active." };

  // Build the patch and the old -> new log from the fields that actually differ.
  const patch: Record<string, string | number | boolean | null> = {};
  const changes: string[] = [];
  for (const f of getFormFields(stage)) {
    if (f.readOnly) continue;
    // A field the answers have hidden (e.g. correspondence address once
    // "same as residential" is chosen) is cleared rather than left stale.
    const next = isFieldVisible(f, values) ? (values[f.key] ?? "") : "";
    if (sameValue(f, lead[f.key], next)) continue;
    patch[f.key] = toColumnValue(f, next);
    changes.push(`${f.label}: ${displayValue(f, toFormString(lead[f.key]))} → ${displayValue(f, next)}`);
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("leads").update(patch).eq("id", link.lead_id);
    if (error) {
      Sentry.captureException(error, { tags: { area: "lead_form", step: "update_lead" } });
      return { error: "Couldn't save your answers. Please try again." };
    }
  }

  if (stage === 2) {
    const before = await loadLeadNominees(link.lead_id);
    const rows = nominees.map((n, i) => ({
      lead_id: link.lead_id,
      position: i + 1,
      name: n.name,
      id_no: n.id_no || null,
      relationship: n.relationship || null,
      phone: n.phone || null,
      share_percent: Number(n.share_percent),
      date_of_birth: n.date_of_birth || null,
      updated_at: new Date().toISOString(),
    }));
    // Upsert then trim, never delete-then-insert: a failure in between must
    // not leave the lead with no nominees at all.
    const { error: upsertError } = await admin.from("lead_nominees").upsert(rows, { onConflict: "lead_id,position" });
    if (upsertError) {
      Sentry.captureException(upsertError, { tags: { area: "lead_form", step: "nominees" } });
      return { error: "Couldn't save your nominees. Please try again." };
    }
    await admin.from("lead_nominees").delete().eq("lead_id", link.lead_id).gt("position", rows.length);

    const beforeText = nomineeSummary(before);
    const afterText = nomineeSummary(nominees);
    if (beforeText !== afterText) changes.push(`Nominees: ${beforeText} → ${afterText}`);

    const h = await headers();
    const { error: sigError } = await admin.from("lead_signatures").insert({
      lead_id: link.lead_id,
      link_id: link.id,
      image_data: input.signature,
      signer_name: String(lead.full_name ?? ""),
      consent: true,
      ip,
      user_agent: (h.get("user-agent") ?? "").slice(0, 300),
    });
    if (sigError) {
      Sentry.captureException(sigError, { tags: { area: "lead_form", step: "signature" } });
      return { error: "Couldn't save your signature. Please try again." };
    }
    changes.push("Signature captured");
  }

  const stageLabel = FORM_STAGES[stage].label;
  const { error: activityError } = await admin.from("lead_activity").insert({
    lead_id: link.lead_id,
    actor_id: null,
    activity_type: "form_submitted",
    content:
      `Lead submitted the ${stageLabel} form` +
      (changes.length > 0 ? `\n${changes.join("\n")}` : " (no changes to existing details)"),
  });
  if (activityError) console.error("submitLeadForm: lead_activity insert failed", activityError);

  const { error: linkError } = await admin
    .from("lead_form_links")
    .update({ status: "completed", submitted_at: new Date().toISOString(), draft: null })
    .eq("id", link.id);
  if (linkError) {
    Sentry.captureException(linkError, { tags: { area: "lead_form", step: "complete_link" } });
    return { error: "Your answers were saved, but we couldn't finish. Please submit once more." };
  }

  await emailAgentFormSubmitted({
    agentId: (lead.agent_id as string | null) ?? null,
    leadId: link.lead_id,
    leadNo: lead.lead_no == null ? null : Number(lead.lead_no),
    leadName: String(lead.full_name ?? ""),
    stageLabel,
  });

  revalidatePath(`/leads/${link.lead_id}`);
  return { error: null };
}

// Best effort, like emailAgentLeadsAssigned: the submission is already saved,
// so this never throws and never blocks it. Failures go to Sentry.
async function emailAgentFormSubmitted(input: {
  agentId: string | null;
  leadId: string;
  leadNo: number | null;
  leadName: string;
  stageLabel: string;
}): Promise<void> {
  try {
    const agent = await agentLoad(input.agentId);
    if (!agent?.email || agent.is_active === false) return;
    // The agent's own opt-out (Settings > My Profile). Read on its own so a
    // database without that column yet still sends, as before.
    const { data: prefs } = await createAdminClient()
      .from("profiles")
      .select("notify_lead_form_email")
      .eq("id", input.agentId!)
      .maybeSingle();
    if (prefs?.notify_lead_form_email === false) return;

    const mail = leadFormSubmittedEmail({
      agentName: agent.full_name,
      leadId: input.leadId,
      leadNo: input.leadNo,
      leadName: input.leadName,
      stageLabel: input.stageLabel,
      origin: await appOrigin(),
    });
    const result = await sendEmail({ to: agent.email, ...mail });
    if (!result.sent) {
      Sentry.captureMessage(`Lead form submitted email not sent: ${result.error ?? "unknown"}`, {
        level: "warning",
        tags: { area: "email", kind: "lead_form_submitted" },
        extra: { leadId: input.leadId },
      });
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "email", kind: "lead_form_submitted" } });
  }
}
