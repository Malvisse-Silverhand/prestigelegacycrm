"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { csvToObjects } from "@/lib/csv-parse";
import {
  TARGET_FIELDS,
  MAX_UPLOAD_ROWS,
  autoMap,
  buildImportRow,
  phoneKey,
  type ImportMapping,
  type RowDefaults,
  type StagedRow,
} from "@/lib/lead-import";
import { planAssignments, type PlanMember } from "@/lib/lead-assignment-plan";
import type { RebalanceMode } from "@/lib/rebalance-targets";
import { checkRateLimit } from "@/lib/rate-limit";
import { queueBulkAssignmentEmails, type BulkRecipient } from "@/lib/bulk-assignment-email";
import { getAssignableTeam } from "./data";

// A manager uploads a lead database -> it is staged server-side -> the manager
// chooses how to split it -> leads are created in chunks -> each receiving agent
// gets one bell notification and one (rate-limited) email.
//
// Everything runs through the service role *after* explicit checks here (the
// batch belongs to the caller; recipients are inside the caller's team), because
// the staging tables have no RLS policies and because inserting a lead on behalf
// of another agent is not something RLS validates for managers.

type Result = { error: string | null };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAGE_CHUNK_MAX = 500;
const ASSIGN_CHUNK = 300;
const PAGE = 1000;
const MAX_LEAD_PAGES = 300; // phones read when de-duplicating: 300k leads
const STALE_DAYS = 7;

// Postgres says 42P01 / 42703 for a missing table / column; PostgREST (what the
// Supabase client talks to) says PGRST205 / PGRST204 instead -- all four mean the
// lead-batches migration has not been run yet.
const MIGRATION_CODES = new Set(["42P01", "42703", "PGRST205", "PGRST204"]);

function fail(error: { code?: string; message?: string } | null, step: string, fallback: string): string {
  if (error?.code && MIGRATION_CODES.has(error.code)) {
    return "Lead uploads need a one-time database update first. Ask your administrator to run the latest database migration.";
  }
  Sentry.captureException(error ?? new Error(`lead upload: ${step}`), { tags: { area: "lead-upload", step } });
  return fallback;
}

type Batch = {
  id: string;
  created_by: string;
  filename: string | null;
  status: "staged" | "assigning" | "done" | "cancelled";
  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  invalid_rows: number;
  inserted_rows: number;
  mode: string;
};

async function loadBatch(batchId: string, profileId: string): Promise<Batch | null> {
  if (typeof batchId !== "string" || !UUID_RE.test(batchId)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("lead_import_batches")
    .select("id, created_by, filename, status, total_rows, valid_rows, duplicate_rows, invalid_rows, inserted_rows, mode")
    .eq("id", batchId)
    .maybeSingle();
  if (!data || data.created_by !== profileId) return null;
  return data as Batch;
}

function sanitizeMapping(input: unknown): ImportMapping | null {
  if (!input || typeof input !== "object") return null;
  const { fields, notes } = input as { fields?: unknown; notes?: unknown };
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return null;
  const out: ImportMapping = { fields: {}, notes: [] };
  const allowed = new Set<string>(TARGET_FIELDS);
  for (const [k, v] of Object.entries(fields as Record<string, unknown>)) {
    if (!allowed.has(k) || typeof v !== "string" || v.length === 0 || v.length > 200) return null;
    out.fields[k as (typeof TARGET_FIELDS)[number]] = v;
  }
  if (notes !== undefined) {
    if (!Array.isArray(notes) || notes.length > 40) return null;
    for (const n of notes) {
      if (typeof n !== "string" || n.length > 200) return null;
      out.notes.push(n);
    }
  }
  if (!out.fields.full_name || !out.fields.phone) return null;
  return out;
}

function sanitizeDefaults(input: unknown): RowDefaults {
  const d = (input ?? {}) as { interest?: unknown; leadSource?: unknown };
  return {
    interest: typeof d.interest === "string" && d.interest.length <= 60 ? d.interest || null : null,
    leadSource: typeof d.leadSource === "string" && d.leadSource.length <= 60 ? d.leadSource || null : null,
  };
}

// -- Reading a Google Sheet -------------------------------------------------

// Accepts a "Publish to web" CSV link, or an ordinary share link
// (docs.google.com/spreadsheets/d/<id>/edit...) for a sheet shared with
// "Anyone with the link", which is converted to Google's CSV export URL. Only
// Google's own host is ever fetched.
function sheetCsvUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname !== "docs.google.com") return null;
  if (u.pathname.includes("/pub")) return u.toString();
  const m = u.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  const gid = u.searchParams.get("gid") ?? u.hash.match(/gid=(\d+)/)?.[1];
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid && /^\d+$/.test(gid) ? `&gid=${gid}` : ""}`;
}

export async function loadSheet(url: string): Promise<
  | { error: string }
  | { error: null; headers: string[]; rows: Record<string, string>[]; totalRows: number; truncated: boolean }
> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const csvUrl = typeof url === "string" ? sheetCsvUrl(url) : null;
  if (!csvUrl) return { error: "That doesn't look like a Google Sheets link. Paste the sheet's share link." };

  try {
    const res = await fetch(csvUrl, { cache: "no-store" });
    if (!res.ok) {
      return { error: `Couldn't open that sheet (HTTP ${res.status}). Make sure it is shared with "Anyone with the link".` };
    }
    // A sheet that isn't shared answers with Google's sign-in page, not a CSV.
    if ((res.headers.get("content-type") ?? "").includes("text/html")) {
      return { error: 'That sheet is private. In Google Sheets choose Share → General access → "Anyone with the link" (Viewer), then try again.' };
    }
    const text = await res.text();
    if (text.length > 15_000_000) return { error: "That sheet is too large. Split it into smaller files." };
    const { headers, rows } = csvToObjects(text);
    if (headers.length === 0) return { error: "That sheet appears to be empty." };
    return {
      error: null,
      headers,
      rows: rows.slice(0, MAX_UPLOAD_ROWS),
      totalRows: rows.length,
      truncated: rows.length > MAX_UPLOAD_ROWS,
    };
  } catch (e) {
    Sentry.captureException(e, { tags: { area: "lead-upload", step: "loadSheet" } });
    return { error: "Couldn't read that sheet. Check the link and try again." };
  }
}

// Re-run on the server so the wizard never trusts a mapping the browser made up.
export async function suggestMapping(headers: string[]): Promise<ImportMapping> {
  const safe = Array.isArray(headers) ? headers.filter((h) => typeof h === "string").slice(0, 200) : [];
  return autoMap(safe);
}

// -- Staging ----------------------------------------------------------------

export async function startBatch(input: {
  source: "csv" | "sheet";
  filename: string;
  totalRows: number;
}): Promise<Result & { batchId?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  if (input.source !== "csv" && input.source !== "sheet") return { error: "Invalid request." };
  const total = Math.floor(Number(input.totalRows));
  if (!Number.isFinite(total) || total < 1) return { error: "That file has no rows." };
  if (total > MAX_UPLOAD_ROWS) return { error: `Upload at most ${MAX_UPLOAD_ROWS.toLocaleString()} leads at a time.` };

  if (!(await checkRateLimit("lead-batch-start", profile.id, 20, 3600))) {
    return { error: "You've started a lot of uploads in the last hour. Please try again a little later." };
  }

  const admin = createAdminClient();

  // No cron in this deployment: clear out abandoned uploads (and their staged
  // rows, by cascade) whenever a new one starts.
  const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
  await admin
    .from("lead_import_batches")
    .delete()
    .lt("created_at", cutoff)
    .in("status", ["staged", "assigning", "cancelled"]);

  const { data, error } = await admin
    .from("lead_import_batches")
    .insert({
      created_by: profile.id,
      source: input.source,
      filename: typeof input.filename === "string" ? input.filename.slice(0, 200) : null,
      total_rows: total,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: fail(error, "startBatch", "Couldn't start the upload. Please try again.") };
  return { error: null, batchId: data.id as string };
}

export async function stageChunk(input: {
  batchId: string;
  offset: number;
  rows: Record<string, string>[];
  mapping: ImportMapping;
  defaults?: RowDefaults;
}): Promise<Result & { staged?: number; invalid?: { row: number; reason: string }[] }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  const batch = await loadBatch(input.batchId, profile.id);
  if (!batch) return { error: "Upload not found." };
  if (batch.status !== "staged") return { error: "This upload has already been assigned." };

  const mapping = sanitizeMapping(input.mapping);
  if (!mapping) return { error: "Full Name and Phone Number must be mapped to a column." };
  const defaults = sanitizeDefaults(input.defaults);
  const offset = Math.floor(Number(input.offset));
  if (!Number.isFinite(offset) || offset < 0 || offset >= MAX_UPLOAD_ROWS) return { error: "Invalid request." };
  if (!Array.isArray(input.rows) || input.rows.length === 0 || input.rows.length > STAGE_CHUNK_MAX) {
    return { error: "Invalid request." };
  }

  const toStage: { batch_id: string; idx: number; data: StagedRow }[] = [];
  const invalid: { row: number; reason: string }[] = [];
  input.rows.forEach((rawRow, i) => {
    // Clamp whatever the browser sent: plain string -> string, bounded size.
    const clean: Record<string, string> = {};
    if (rawRow && typeof rawRow === "object") {
      for (const [k, v] of Object.entries(rawRow).slice(0, 200)) {
        clean[k.slice(0, 200)] = typeof v === "string" ? v.slice(0, 1000) : "";
      }
    }
    const { row, reason } = buildImportRow(clean, mapping, defaults);
    // Row number as the spreadsheet shows it: header is row 1.
    if (!row) invalid.push({ row: offset + i + 2, reason: reason ?? "invalid row" });
    else toStage.push({ batch_id: batch.id, idx: offset + i, data: row });
  });

  if (toStage.length > 0) {
    const admin = createAdminClient();
    // Upsert: re-sending a chunk after a dropped connection is harmless.
    const { error } = await admin.from("lead_import_rows").upsert(toStage, { onConflict: "batch_id,idx" });
    if (error) return { error: fail(error, "stageChunk", "Couldn't save part of the upload. Please try again.") };
  }
  return { error: null, staged: toStage.length, invalid };
}

type StagedRowRecord = { idx: number; data: StagedRow; agent_id: string | null };

async function readStaged(batchId: string, columns: string): Promise<StagedRowRecord[]> {
  const admin = createAdminClient();
  const out: StagedRowRecord[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("lead_import_rows")
      .select(columns)
      .eq("batch_id", batchId)
      .order("idx")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as StagedRowRecord[];
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}

async function deleteStaged(batchId: string, idxs: number[]) {
  const admin = createAdminClient();
  for (let i = 0; i < idxs.length; i += 500) {
    await admin.from("lead_import_rows").delete().eq("batch_id", batchId).in("idx", idxs.slice(i, i + 500));
  }
}

// After every chunk is staged: drop duplicates (the same number twice in the
// file, or a number already on any lead in the CRM) and report the counts.
// Compared across the whole organisation -- not just what the manager can see --
// so one person is never in the CRM twice; who owns a duplicate is never shown.
export async function finishStaging(
  batchId: string,
): Promise<Result & { valid?: number; duplicates?: number; invalid?: number }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  const batch = await loadBatch(batchId, profile.id);
  if (!batch) return { error: "Upload not found." };
  if (batch.status !== "staged") return { error: "This upload has already been assigned." };

  try {
    const admin = createAdminClient();
    const staged = await readStaged(batch.id, "idx, data");

    const drop = new Set<number>();
    const seen = new Set<string>();
    const stagedKeys = new Map<number, string>();
    for (const r of staged) {
      const key = phoneKey(r.data.phone);
      stagedKeys.set(r.idx, key);
      if (!key || seen.has(key)) drop.add(r.idx);
      else seen.add(key);
    }

    const { count } = await admin.from("leads").select("id", { count: "exact", head: true }).is("deleted_at", null);
    const pages = Math.min(Math.ceil((count ?? 0) / PAGE), MAX_LEAD_PAGES);
    const existing = new Set<string>();
    for (let p = 0; p < pages; p += 5) {
      await Promise.all(
        Array.from({ length: Math.min(5, pages - p) }, async (_, k) => {
          const from = (p + k) * PAGE;
          const { data } = await admin
            .from("leads")
            .select("phone")
            .is("deleted_at", null)
            .order("id")
            .range(from, from + PAGE - 1);
          for (const l of data ?? []) existing.add(phoneKey(String(l.phone ?? "")));
        }),
      );
    }
    for (const r of staged) {
      if (!drop.has(r.idx) && existing.has(stagedKeys.get(r.idx) ?? "")) drop.add(r.idx);
    }

    await deleteStaged(batch.id, [...drop]);

    const valid = staged.length - drop.size;
    const invalid = Math.max(0, batch.total_rows - staged.length);
    await admin
      .from("lead_import_batches")
      .update({ valid_rows: valid, duplicate_rows: drop.size, invalid_rows: invalid })
      .eq("id", batch.id);
    return { error: null, valid, duplicates: drop.size, invalid };
  } catch (e) {
    return { error: fail(e as { code?: string }, "finishStaging", "Couldn't check the upload for duplicates. Please try again.") };
  }
}

// One page of staged leads for the per-lead assignment table.
export async function getStagedPage(
  batchId: string,
  page: number,
): Promise<Result & { rows?: { idx: number; name: string; phone: string }[]; total?: number }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  const batch = await loadBatch(batchId, profile.id);
  if (!batch) return { error: "Upload not found." };
  const p = Math.max(0, Math.floor(Number(page)) || 0);
  const size = 100;

  const admin = createAdminClient();
  const { data, error, count } = await admin
    .from("lead_import_rows")
    .select("idx, data", { count: "exact" })
    .eq("batch_id", batch.id)
    .order("idx")
    .range(p * size, p * size + size - 1);
  if (error) return { error: fail(error, "getStagedPage", "Couldn't load the leads.") };
  return {
    error: null,
    total: count ?? 0,
    rows: (data ?? []).map((r) => {
      const d = r.data as StagedRow;
      return { idx: r.idx as number, name: d.full_name, phone: d.phone };
    }),
  };
}

// -- Assignment plan --------------------------------------------------------

export type PlanRequest =
  | { mode: "self" }
  | {
      mode: RebalanceMode;
      // Agents receiving leads (must all be inside the caller's team).
      recipients: string[];
      values?: Record<string, number>;
      // Staged-row idx -> agent id: leads the manager pinned by hand.
      overrides?: Record<string, string>;
    };

export type PlanResult = Result & { counts?: { agentId: string; name: string; count: number }[] };

export async function saveAssignmentPlan(batchId: string, request: PlanRequest): Promise<PlanResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  const batch = await loadBatch(batchId, profile.id);
  if (!batch) return { error: "Upload not found." };
  if (batch.status !== "staged" && batch.status !== "assigning") return { error: "This upload is already finished." };

  try {
    const admin = createAdminClient();
    const staged = await readStaged(batch.id, "idx");
    if (staged.length === 0) return { error: "There are no leads left to assign." };
    const idxList = staged.map((r) => r.idx);

    // Agents, and anyone who chose "keep all": everything goes to the uploader.
    if (profile.role === "agent" || request?.mode === "self") {
      for (let i = 0; i < idxList.length; i += 500) {
        await admin
          .from("lead_import_rows")
          .update({ agent_id: profile.id })
          .eq("batch_id", batch.id)
          .in("idx", idxList.slice(i, i + 500));
      }
      await admin.from("lead_import_batches").update({ mode: "self", plan: null }).eq("id", batch.id);
      return { error: null, counts: [{ agentId: profile.id, name: profile.full_name, count: idxList.length }] };
    }

    if (!request || !["even", "percent", "count"].includes(request.mode)) return { error: "Invalid request." };
    const team = await getAssignableTeam(profile, { withLoad: true });
    const teamById = new Map(team.map((m) => [m.id, m]));
    const recipients = [...new Set(Array.isArray(request.recipients) ? request.recipients : [])];
    if (recipients.length === 0) return { error: "Choose at least one agent to receive the leads." };
    if (recipients.some((id) => typeof id !== "string" || !teamById.has(id))) {
      return { error: "One of the people you chose isn't on your team." };
    }
    const members: PlanMember[] = recipients.map((id) => {
      const m = teamById.get(id)!;
      return { id, name: m.name, load: m.load };
    });

    // The wizard pins rows by their staged idx; the planner works on position.
    const positionOf = new Map(idxList.map((idx, pos) => [idx, pos]));
    const overrides: Record<number, string> = {};
    for (const [k, agentId] of Object.entries(request.overrides ?? {})) {
      const pos = positionOf.get(Number(k));
      if (pos === undefined) continue; // row was dropped as a duplicate meanwhile
      if (typeof agentId !== "string") return { error: "Invalid request." };
      overrides[pos] = agentId;
    }

    const plan = planAssignments(idxList.length, members, {
      mode: request.mode,
      values: request.values,
      overrides,
    });
    if (plan.error !== undefined) return { error: plan.error };

    // Write the owner onto every staged row, one update per agent.
    const idxByAgent = new Map<string, number[]>();
    plan.agentByRow.forEach((agentId, pos) => {
      const list = idxByAgent.get(agentId);
      if (list) list.push(idxList[pos]);
      else idxByAgent.set(agentId, [idxList[pos]]);
    });
    for (const [agentId, idxs] of idxByAgent) {
      for (let i = 0; i < idxs.length; i += 500) {
        const { error } = await admin
          .from("lead_import_rows")
          .update({ agent_id: agentId })
          .eq("batch_id", batch.id)
          .in("idx", idxs.slice(i, i + 500));
        if (error) return { error: fail(error, "saveAssignmentPlan", "Couldn't save the assignment. Please try again.") };
      }
    }

    const counts = [...plan.counts.entries()]
      .map(([agentId, count]) => ({ agentId, name: teamById.get(agentId)?.name ?? "Agent", count }))
      .sort((a, b) => b.count - a.count);
    await admin
      .from("lead_import_batches")
      .update({
        mode: Object.keys(overrides).length > 0 ? "manual" : request.mode,
        plan: { counts, pinned: Object.keys(overrides).length },
      })
      .eq("id", batch.id);
    return { error: null, counts };
  } catch (e) {
    return { error: fail(e as { code?: string }, "saveAssignmentPlan", "Couldn't save the assignment. Please try again.") };
  }
}

// -- Creating the leads -----------------------------------------------------

const STAGED_KEYS: (keyof StagedRow)[] = [
  "full_name", "phone", "email", "date_of_birth", "gender", "is_smoker", "occupation", "address",
  "postcode", "state", "lead_source", "interest", "agent_remark", "best_time_to_reach", "budget_indicated",
];

// Creates the next chunk of leads. Safe to call again after a failure: rows are
// only removed from staging once their leads exist, and a lead already created
// by this batch is never created twice.
export async function assignChunk(
  batchId: string,
): Promise<Result & { inserted?: number; remaining?: number; fallbacks?: number }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  const batch = await loadBatch(batchId, profile.id);
  if (!batch) return { error: "Upload not found." };
  if (batch.status === "done" || batch.status === "cancelled") return { error: "This upload is already finished." };

  try {
    const admin = createAdminClient();
    const { data: rows, error: readError } = await admin
      .from("lead_import_rows")
      .select("idx, data, agent_id")
      .eq("batch_id", batch.id)
      .order("idx")
      .limit(ASSIGN_CHUNK);
    if (readError) return { error: fail(readError, "assignChunk.read", "Couldn't read the upload. Please try again.") };
    if (!rows || rows.length === 0) return { error: null, inserted: 0, remaining: 0, fallbacks: 0 };
    if (rows.some((r) => !r.agent_id)) return { error: "Choose how to assign these leads first." };

    // Who may receive leads *right now*: re-checked every chunk, because an
    // agent can be deactivated, or moved out of the team, mid-upload.
    const allowedIds =
      profile.role === "agent"
        ? new Set([profile.id])
        : new Set((await getAssignableTeam(profile)).map((m) => m.id));
    allowedIds.add(profile.id);

    const agentIds = [...new Set(rows.map((r) => r.agent_id as string))];
    const { data: profs } = await admin.from("profiles").select("id, unit_id, is_active").in("id", agentIds);
    const profById = new Map((profs ?? []).map((p) => [p.id as string, p]));

    // Retry safety: leads this batch has already created.
    const phones = rows.map((r) => (r.data as StagedRow).phone);
    const { data: already } = await admin
      .from("leads")
      .select("phone")
      .eq("import_batch_id", batch.id)
      .in("phone", phones);
    const alreadyPhones = new Set((already ?? []).map((l) => String(l.phone)));

    let fallbacks = 0;
    const now = new Date().toISOString();
    const inserts: Record<string, unknown>[] = [];
    for (const r of rows) {
      const data = r.data as StagedRow;
      if (alreadyPhones.has(data.phone)) continue;
      let agentId = r.agent_id as string;
      const prof = profById.get(agentId);
      if (!allowedIds.has(agentId) || !prof || prof.is_active === false) {
        agentId = profile.id; // keep it rather than lose it
        fallbacks++;
      }
      const owner = profById.get(agentId);
      const row: Record<string, unknown> = {};
      for (const k of STAGED_KEYS) row[k] = data[k] ?? null;
      const tagged = agentId !== profile.id;
      inserts.push({
        ...row,
        status: "warm",
        agent_id: agentId,
        unit_id: (owner?.unit_id as string | null | undefined) ?? profile.unit_id,
        import_batch_id: batch.id,
        assigned_by: tagged ? profile.id : null,
        assigned_at: tagged ? now : null,
      });
    }

    let inserted = 0;
    if (inserts.length > 0) {
      const { data: created, error } = await admin.from("leads").insert(inserts).select("id, agent_id");
      if (error) return { error: fail(error, "assignChunk.insert", "Couldn't save part of this upload. Press retry to continue.") };
      inserted = created?.length ?? 0;

      const label = batch.filename ? ` "${batch.filename}"` : "";
      const { error: activityError } = await admin.from("lead_activity").insert(
        (created ?? []).map((l) => {
          const tagged = l.agent_id !== profile.id;
          return {
            lead_id: l.id as string,
            actor_id: profile.id,
            activity_type: tagged ? "assigned" : "created",
            content: tagged
              ? `Assigned by ${profile.full_name} (uploaded list${label})`
              : `Imported from an uploaded list${label}`,
          };
        }),
      );
      if (activityError) console.error("assignChunk: lead_activity insert failed", activityError);
    }

    await deleteStaged(batch.id, rows.map((r) => r.idx as number));
    await admin
      .from("lead_import_batches")
      .update({ status: "assigning", inserted_rows: batch.inserted_rows + inserted })
      .eq("id", batch.id);

    const { count: remaining } = await admin
      .from("lead_import_rows")
      .select("idx", { count: "exact", head: true })
      .eq("batch_id", batch.id);
    return { error: null, inserted, remaining: remaining ?? 0, fallbacks };
  } catch (e) {
    return { error: fail(e as { code?: string }, "assignChunk", "Couldn't save part of this upload. Press retry to continue.") };
  }
}

export type FinalizeResult = Result & {
  inserted?: number;
  perAgent?: { agentId: string; name: string; count: number }[];
  notified?: number;
  duplicates?: number;
  invalid?: number;
};

// Closes the batch and tells people. Only one caller can win the close, so a
// double-click or a retry never notifies anyone twice.
export async function finalizeBatch(batchId: string): Promise<FinalizeResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  const batch = await loadBatch(batchId, profile.id);
  if (!batch) return { error: "Upload not found." };

  try {
    const admin = createAdminClient();
    const { count: remaining } = await admin
      .from("lead_import_rows")
      .select("idx", { count: "exact", head: true })
      .eq("batch_id", batch.id);
    if ((remaining ?? 0) > 0) return { error: "Some leads haven't been created yet. Press retry to continue." };

    const { data: won } = await admin
      .from("lead_import_batches")
      .update({ status: "done", finished_at: new Date().toISOString() })
      .eq("id", batch.id)
      .in("status", ["staged", "assigning"])
      .select("id")
      .maybeSingle();

    // Everything this batch created, by owner (names for the email sample).
    const created: { id: string; full_name: string; interest: string | null; lead_source: string | null; agent_id: string; assigned_by: string | null }[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data } = await admin
        .from("leads")
        .select("id, full_name, interest, lead_source, agent_id, assigned_by")
        .eq("import_batch_id", batch.id)
        .order("lead_no")
        .range(from, from + PAGE - 1);
      const page = (data ?? []) as typeof created;
      created.push(...page);
      if (page.length < PAGE) break;
    }

    const byAgent = new Map<string, typeof created>();
    for (const l of created) {
      const list = byAgent.get(l.agent_id);
      if (list) list.push(l);
      else byAgent.set(l.agent_id, [l]);
    }
    const agentIds = [...byAgent.keys()];
    const { data: names } = agentIds.length
      ? await admin.from("profiles").select("id, full_name").in("id", agentIds)
      : { data: [] as { id: string; full_name: string }[] };
    const nameOf = new Map((names ?? []).map((p) => [p.id as string, p.full_name as string]));
    const perAgent = agentIds
      .map((agentId) => ({ agentId, name: nameOf.get(agentId) ?? "Agent", count: byAgent.get(agentId)!.length }))
      .sort((a, b) => b.count - a.count);

    const summary: FinalizeResult = {
      error: null,
      inserted: created.length,
      perAgent,
      duplicates: batch.duplicate_rows,
      invalid: batch.invalid_rows,
    };
    // Already closed by an earlier call: report, but notify nobody again.
    if (!won) return { ...summary, notified: 0 };

    // Other people only -- the uploader needs no bell or email about their own.
    const receivers = perAgent.filter((a) => a.agentId !== profile.id);
    if (receivers.length > 0) {
      const label = batch.filename ? ` · ${batch.filename}` : "";
      const { error: bellError } = await admin.from("notifications").insert(
        receivers.map((a) => ({
          profile_id: a.agentId,
          kind: "leads_assigned",
          title: `${a.count} new lead${a.count === 1 ? "" : "s"} assigned to you`,
          body: `Assigned by ${profile.full_name}${label}`,
          href: `/leads?batch=${batch.id}`,
        })),
      );
      if (bellError) Sentry.captureException(bellError, { tags: { area: "lead-upload", step: "notify" } });

      const recipients: BulkRecipient[] = receivers.map((a) => ({
        agentId: a.agentId,
        total: a.count,
        sample: byAgent.get(a.agentId)!.slice(0, 5).map((l) => ({
          id: l.id,
          name: l.full_name,
          interest: l.interest,
          source: l.lead_source,
        })),
      }));
      const emailAllowed = await checkRateLimit("lead-email-batch", profile.id, 5, 3600);
      await queueBulkAssignmentEmails({
        batchId: batch.id,
        byName: profile.full_name,
        recipients,
        allowed: emailAllowed,
      });
    }

    // Best-effort audit trail; batch detail goes in metadata (target_id must be a profile).
    const { error: auditError } = await admin.from("audit_log").insert({
      actor_id: profile.id,
      action: "lead_batch_assigned",
      metadata: {
        batch_id: batch.id,
        filename: batch.filename,
        inserted: created.length,
        duplicates: batch.duplicate_rows,
        invalid: batch.invalid_rows,
        per_agent: perAgent.map((a) => ({ agent_id: a.agentId, count: a.count })),
      },
    });
    if (auditError) console.error("finalizeBatch: audit_log insert failed", auditError);

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    revalidatePath("/pipeline");
    return { ...summary, notified: receivers.length };
  } catch (e) {
    return { error: fail(e as { code?: string }, "finalizeBatch", "Couldn't finish the upload. Please try again.") };
  }
}

// Stops an unfinished upload. Leads already created from it stay where they are.
export async function cancelBatch(batchId: string): Promise<Result & { keptLeads?: number }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  const batch = await loadBatch(batchId, profile.id);
  if (!batch) return { error: "Upload not found." };
  if (batch.status === "done" || batch.status === "cancelled") return { error: "This upload is already finished." };

  const admin = createAdminClient();
  await admin.from("lead_import_rows").delete().eq("batch_id", batch.id);
  const { error } = await admin
    .from("lead_import_batches")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("id", batch.id);
  if (error) return { error: fail(error, "cancelBatch", "Couldn't cancel the upload. Please try again.") };
  revalidatePath("/leads");
  return { error: null, keptLeads: batch.inserted_rows };
}
