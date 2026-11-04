import "server-only";
import * as Sentry from "@sentry/nextjs";
import type { createAdminClient } from "@/lib/supabase/admin";
import { phoneKey, type StagedRow } from "@/lib/lead-import";

// Turns staged upload rows into real leads. Shared by the manual upload flow
// (assignChunk) and the daily distribution job, so both create leads, set the
// receiving agent's unit and write the activity trail in exactly one way.
//
// Callers own the staging rows: nothing here deletes them, so a failed call can
// simply be repeated. Repeating is safe because a row whose phone number already
// exists on ANY non-deleted lead (this batch's earlier attempt, or a lead added
// by someone else while a pooled list was waiting days) is skipped, not doubled.

type Admin = ReturnType<typeof createAdminClient>;

export type InsertedLead = {
  id: string;
  agent_id: string;
  full_name: string;
  interest: string | null;
  lead_source: string | null;
};

export type InsertStagedInput = {
  batch: { id: string; filename: string | null };
  rows: { idx: number; data: StagedRow; agentId: string }[];
  assigner: { id: string; full_name: string; unit_id: string | null };
  // Who may receive leads *right now*; anyone else (or an inactive agent) falls
  // back to the assigner, so a lead is kept rather than lost.
  allowedAgentIds: Set<string>;
};

export type InsertStagedResult = {
  inserted: InsertedLead[];
  fallbacks: number;
  skippedDuplicates: number;
  error?: string;
};

const STAGED_KEYS: (keyof StagedRow)[] = [
  "full_name", "phone", "email", "date_of_birth", "gender", "is_smoker", "occupation", "address",
  "postcode", "state", "lead_source", "interest", "agent_remark", "best_time_to_reach", "budget_indicated",
];

// Every spelling a Malaysian number may be stored under.
function phoneVariants(raw: string): string[] {
  const key = phoneKey(raw);
  const out = new Set<string>([raw]);
  if (key) {
    out.add(key);
    out.add(`0${key}`);
    out.add(`60${key}`);
    out.add(`+60${key}`);
  }
  return [...out];
}

export async function insertStagedRows(admin: Admin, input: InsertStagedInput): Promise<InsertStagedResult> {
  const { batch, rows, assigner, allowedAgentIds } = input;
  if (rows.length === 0) return { inserted: [], fallbacks: 0, skippedDuplicates: 0 };

  const agentIds = [...new Set(rows.map((r) => r.agentId))];
  const { data: profs, error: profError } = await admin
    .from("profiles")
    .select("id, unit_id, is_active")
    .in("id", agentIds);
  if (profError) {
    Sentry.captureException(profError, { tags: { area: "lead-batch-insert", step: "profiles" } });
    return { inserted: [], fallbacks: 0, skippedDuplicates: 0, error: "Couldn't read the receiving agents." };
  }
  const profById = new Map((profs ?? []).map((p) => [p.id as string, p]));

  // Phones that already belong to a live lead anywhere in the CRM.
  const existingKeys = new Set<string>();
  const variantsByRow = rows.map((r) => phoneVariants(r.data.phone));
  const allVariants = [...new Set(variantsByRow.flat())];
  for (let i = 0; i < allVariants.length; i += 400) {
    const { data, error } = await admin
      .from("leads")
      .select("phone")
      .is("deleted_at", null)
      .in("phone", allVariants.slice(i, i + 400));
    if (error) {
      Sentry.captureException(error, { tags: { area: "lead-batch-insert", step: "duplicates" } });
      return { inserted: [], fallbacks: 0, skippedDuplicates: 0, error: "Couldn't check for duplicate leads." };
    }
    for (const l of data ?? []) existingKeys.add(phoneKey(String(l.phone ?? "")));
  }

  let fallbacks = 0;
  let skippedDuplicates = 0;
  const seenInCall = new Set<string>();
  const now = new Date().toISOString();
  const inserts: Record<string, unknown>[] = [];
  for (const r of rows) {
    const key = phoneKey(r.data.phone);
    if (key && (existingKeys.has(key) || seenInCall.has(key))) {
      skippedDuplicates++;
      continue;
    }
    if (key) seenInCall.add(key);

    let agentId = r.agentId;
    const prof = profById.get(agentId);
    if (!allowedAgentIds.has(agentId) || !prof || prof.is_active === false) {
      agentId = assigner.id; // keep it rather than lose it
      fallbacks++;
    }
    const owner = profById.get(agentId);
    const row: Record<string, unknown> = {};
    for (const k of STAGED_KEYS) row[k] = r.data[k] ?? null;
    const tagged = agentId !== assigner.id;
    inserts.push({
      ...row,
      status: "warm",
      agent_id: agentId,
      unit_id: (owner?.unit_id as string | null | undefined) ?? assigner.unit_id,
      import_batch_id: batch.id,
      assigned_by: tagged ? assigner.id : null,
      assigned_at: tagged ? now : null,
    });
  }

  if (inserts.length === 0) return { inserted: [], fallbacks, skippedDuplicates };

  const { data: created, error } = await admin
    .from("leads")
    .insert(inserts)
    .select("id, agent_id, full_name, interest, lead_source");
  if (error) {
    Sentry.captureException(error, { tags: { area: "lead-batch-insert", step: "insert" } });
    return { inserted: [], fallbacks, skippedDuplicates, error: "Couldn't save the leads." };
  }
  const inserted = (created ?? []) as InsertedLead[];

  const label = batch.filename ? ` "${batch.filename}"` : "";
  const { error: activityError } = await admin.from("lead_activity").insert(
    inserted.map((l) => {
      const tagged = l.agent_id !== assigner.id;
      return {
        lead_id: l.id,
        actor_id: assigner.id,
        activity_type: tagged ? "assigned" : "created",
        content: tagged
          ? `Assigned by ${assigner.full_name} (uploaded list${label})`
          : `Imported from an uploaded list${label}`,
      };
    }),
  );
  if (activityError) console.error("insertStagedRows: lead_activity insert failed", activityError);

  return { inserted, fallbacks, skippedDuplicates };
}
