"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { dispatchWebhook } from "@/lib/dispatch-webhook";
import { malaysiaToday } from "@/lib/malaysia-date";
import { stageLabel } from "@/lib/pipeline-stages";
import { buildClientSummary } from "@/lib/storyboard/client-summary";
import { computeModule } from "@/lib/storyboard/engine";
import { OUTCOME_LABEL, planOutcome } from "@/lib/storyboard/outcome";
import { isBuiltModule, MODULE_NAME } from "@/lib/storyboard/modules";
import { markStepSaved, readStepStatus } from "@/lib/storyboard/progress";
import { isMissingSchemaError, STORYBOARD_MISSING_MESSAGE } from "@/lib/storyboard/schema-error";
import {
  readAgentSettings,
  readOrgSettings,
  resolveSettings,
  sanitizeAgentSettings,
  sanitizeOrgSettings,
} from "@/lib/storyboard/settings";
import {
  cleanText,
  defaultStored,
  isModule,
  isOutcome,
  isStep,
  isUuid,
  mergeStored,
  readStored,
  sanitizeNotes,
  sanitizePatch,
} from "@/lib/storyboard/validate";
import type { StoryboardModule, StoryboardOutcome, StoryboardStep } from "@/lib/storyboard/types";

type SaveResult = { error: string | null; savedAt: string | null };

const NOT_YET = "This module isn't available yet.";

function revalidateStoryboard(leadId: string) {
  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/leads/${leadId}/storyboard`, "layout");
  revalidatePath("/storyboards");
}

export async function saveStoryboard(input: {
  leadId: string;
  module: StoryboardModule;
  /** Which step is being saved. Defaults to Fill & Calculate. */
  step?: StoryboardStep;
  /** Fill sends every field; the other steps send only their own (riskChecked, raised). */
  inputs: unknown;
  notes?: string | null;
}): Promise<SaveResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in.", savedAt: null };
  if (!isUuid(input?.leadId)) return { error: "That lead could not be found.", savedAt: null };
  if (!isModule(input.module)) return { error: "Unknown module.", savedAt: null };
  if (!isBuiltModule(input.module)) return { error: NOT_YET, savedAt: null };
  const mod = input.module;
  const step: StoryboardStep = input.step === undefined ? "fill" : input.step;
  if (!isStep(step)) return { error: "Unknown step.", savedAt: null };

  const patch = sanitizePatch(mod, input.inputs);
  if (!patch.ok) return { error: patch.error, savedAt: null };

  const supabase = await createClient();
  const leadId = input.leadId;

  // RLS decides whether this person can see the lead at all.
  const { data: lead, error: leadError } = await supabase.from("leads").select("id").eq("id", leadId).maybeSingle();
  if (leadError || !lead) return { error: "That lead could not be found.", savedAt: null };

  const { data: existing, error: loadError } = await supabase
    .from("storyboards")
    .select("id, inputs, step_status, notes")
    .eq("lead_id", leadId)
    .eq("module", mod)
    .maybeSingle<{ id: string; inputs: unknown; step_status: unknown; notes: string | null }>();
  if (loadError) {
    return { error: isMissingSchemaError(loadError) ? STORYBOARD_MISSING_MESSAGE : "Couldn't save. Please try again.", savedAt: null };
  }
  if (step !== "fill" && !existing) return { error: "Save Step 1 first.", savedAt: null };

  // Step 1 sends the whole form; later steps patch what is stored.
  const base = existing ? readStored(mod, existing.inputs) : defaultStored(mod);
  const merged = mergeStored(mod, base, patch.value);

  // Everything the client sees is recomputed here. Client-sent outputs don't exist.
  const result = computeModule(mod, merged as never);

  const [{ data: settingsRows }, { data: me }] = await Promise.all([
    supabase
      .from("storyboard_settings")
      .select("scope, owner_id, settings")
      .eq("module", mod)
      .returns<{ scope: "org" | "agent"; owner_id: string | null; settings: unknown }[]>(),
    supabase.from("profiles").select("phone").eq("id", profile.id).maybeSingle<{ phone: string | null }>(),
  ]);
  const org = readOrgSettings(settingsRows?.find((r) => r.scope === "org")?.settings, mod);
  const agent = readAgentSettings(settingsRows?.find((r) => r.scope === "agent" && r.owner_id === profile.id)?.settings, mod);
  const resolved = resolveSettings(mod, org, agent);

  // The summary is built from computed outputs and the plan name only. Agent-only
  // inputs (notes, the CI story, claim stories, proofs) are never passed on.
  const clientSummary = buildClientSummary(
    mod,
    merged,
    result as never,
    { firstName: profile.full_name.trim().split(/\s+/)[0] ?? "", wa: me?.phone ?? "" },
    { name: resolved.planName },
  );

  const savedAt = new Date().toISOString();
  const stepStatus = markStepSaved(readStepStatus(existing?.step_status), step);
  const notes = step === "fill" && input.notes !== undefined ? sanitizeNotes(input.notes) : (existing?.notes ?? null);

  const row = {
    inputs: merged,
    outputs: result.out,
    client_summary: clientSummary,
    step_status: stepStatus,
    notes,
    saved_at: savedAt,
    saved_by: profile.id,
  };

  // Select-then-write rather than upsert: the update grant on this table is
  // column-limited (lead_id and module are not updatable), which an upsert's
  // ON CONFLICT DO UPDATE would trip over.
  let writeError: { code?: string } | null = null;
  let written = false;
  if (existing) {
    const { data, error } = await supabase.from("storyboards").update(row).eq("id", existing.id).select("id").maybeSingle();
    writeError = error;
    written = Boolean(data);
  } else {
    const { data, error } = await supabase
      .from("storyboards")
      .insert({ lead_id: leadId, module: mod, ...row })
      .select("id")
      .maybeSingle();
    if (error?.code === "23505") {
      // Two tabs saved at once: the row now exists, so update it instead.
      const retry = await supabase
        .from("storyboards")
        .update(row)
        .eq("lead_id", leadId)
        .eq("module", mod)
        .select("id")
        .maybeSingle();
      writeError = retry.error;
      written = Boolean(retry.data);
    } else {
      writeError = error;
      written = Boolean(data);
    }
  }
  if (writeError) {
    return { error: isMissingSchemaError(writeError) ? STORYBOARD_MISSING_MESSAGE : "Couldn't save. Please try again.", savedAt: null };
  }
  if (!written) {
    return { error: "Only the lead's owner can save changes to this storyboard.", savedAt: null };
  }

  const { error: activityError } = await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: profile.id,
    activity_type: "storyboard",
    content: `Financial Storyboard (${MODULE_NAME[mod]}) saved`,
  });
  if (activityError) console.error("saveStoryboard: lead_activity insert failed", activityError);

  revalidateStoryboard(leadId);
  return { error: null, savedAt };
}

export async function setStoryboardOutcome(input: {
  leadId: string;
  module: StoryboardModule;
  outcome: StoryboardOutcome;
  followUpDate?: string | null;
  reason?: string | null;
}): Promise<{ error: string | null; message: string | null }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in.", message: null };
  if (!isUuid(input?.leadId)) return { error: "That lead could not be found.", message: null };
  if (!isModule(input.module)) return { error: "Unknown module.", message: null };
  if (!isBuiltModule(input.module)) return { error: NOT_YET, message: null };
  if (!isOutcome(input.outcome)) return { error: "Unknown outcome.", message: null };

  const supabase = await createClient();
  const leadId = input.leadId;

  const { data: lead } = await supabase
    .from("leads")
    .select("id, pipeline_stage")
    .eq("id", leadId)
    .maybeSingle<{ id: string; pipeline_stage: string }>();
  if (!lead) return { error: "That lead could not be found.", message: null };

  const { data: row, error: rowError } = await supabase
    .from("storyboards")
    .select("id, step_status")
    .eq("lead_id", leadId)
    .eq("module", input.module)
    .maybeSingle<{ id: string; step_status: unknown }>();
  if (rowError) {
    return { error: isMissingSchemaError(rowError) ? STORYBOARD_MISSING_MESSAGE : "Couldn't record the outcome.", message: null };
  }
  if (!row) return { error: "Save Step 1 first, then record the outcome.", message: null };

  // The existing rule for entering Quoted is "a quotation is on file".
  let hasQuotation = false;
  if (input.outcome === "ready_for_quote") {
    const { count } = await supabase.from("quotations").select("id", { count: "exact", head: true }).eq("lead_id", leadId);
    hasQuotation = (count ?? 0) > 0;
  }

  const plan = planOutcome({
    outcome: input.outcome,
    currentStage: lead.pipeline_stage,
    today: malaysiaToday(),
    followUpDate: input.followUpDate ?? null,
    reason: input.reason ?? null,
    hasQuotation,
  });
  if (!plan.ok) return { error: plan.error, message: null };

  const { data: updated, error: updateError } = await supabase
    .from("storyboards")
    .update({ outcome: input.outcome, step_status: markStepSaved(readStepStatus(row.step_status), "objections") })
    .eq("id", row.id)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) {
    return { error: "Only the lead's owner can record the outcome.", message: null };
  }

  if (Object.keys(plan.patch).length > 0) {
    const { data: leadUpdated, error: leadError } = await supabase
      .from("leads")
      .update(plan.patch)
      .eq("id", leadId)
      .select("id")
      .maybeSingle();
    if (leadError || !leadUpdated) {
      return { error: "The outcome was saved, but the lead couldn't be updated.", message: null };
    }
  }

  const reason = input.outcome === "not_interested" ? cleanText(input.reason, 200) : "";
  const content =
    `Financial Storyboard (${MODULE_NAME[input.module]}): ${OUTCOME_LABEL[input.outcome]}` +
    (reason ? ` - ${reason}` : "") +
    ` (${plan.summary})`;
  const { error: activityError } = await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: profile.id,
    activity_type: "storyboard",
    content,
  });
  if (activityError) console.error("setStoryboardOutcome: lead_activity insert failed", activityError);

  if (plan.stageChanged && plan.patch.pipeline_stage) {
    await dispatchWebhook("lead_stage_changed", {
      id: leadId,
      stage: plan.patch.pipeline_stage,
      stageLabel: stageLabel(plan.patch.pipeline_stage),
      movedBy: profile.full_name,
    });
  }

  revalidateStoryboard(leadId);
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  return { error: null, message: `${OUTCOME_LABEL[input.outcome]} recorded (${plan.summary}).` };
}

/** The agent's own script, objection answers and checklist items. */
export async function saveStoryboardSettings(input: {
  scope: "agent";
  module: StoryboardModule;
  settings: unknown;
}): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  if (input?.scope !== "agent") return { error: "Unknown settings scope." };
  if (!isModule(input.module)) return { error: "Unknown module." };
  if (!isBuiltModule(input.module)) return { error: NOT_YET };

  const parsed = sanitizeAgentSettings(input.settings, input.module);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("storyboard_settings")
    .select("id")
    .eq("scope", "agent")
    .eq("owner_id", profile.id)
    .eq("module", input.module)
    .maybeSingle<{ id: string }>();
  if (loadError) return { error: isMissingSchemaError(loadError) ? STORYBOARD_MISSING_MESSAGE : "Couldn't save your changes." };

  const { error } = existing
    ? await supabase.from("storyboard_settings").update({ settings: parsed.value, updated_by: profile.id }).eq("id", existing.id)
    : await supabase.from("storyboard_settings").insert({
        scope: "agent",
        owner_id: profile.id,
        module: input.module,
        settings: parsed.value,
        updated_by: profile.id,
      });
  if (error) return { error: isMissingSchemaError(error) ? STORYBOARD_MISSING_MESSAGE : "Couldn't save your changes." };

  revalidatePath("/leads", "layout");
  return { error: null };
}

/** Org defaults: plan name, multiples, statistics placeholders. SuperAdmin only. */
export async function saveOrgStoryboardSettings(input: {
  module: StoryboardModule;
  settings: unknown;
}): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  // Checked on the server: hiding the tab is not a permission.
  if (!profile || profile.role !== "superadmin") return { error: "Only a SuperAdmin can change the organisation defaults." };
  if (!isModule(input?.module)) return { error: "Unknown module." };
  if (!isBuiltModule(input.module)) return { error: NOT_YET };

  const parsed = sanitizeOrgSettings(input.settings, input.module);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("storyboard_settings")
    .select("id")
    .eq("scope", "org")
    .is("owner_id", null)
    .eq("module", input.module)
    .maybeSingle<{ id: string }>();
  if (loadError) return { error: isMissingSchemaError(loadError) ? STORYBOARD_MISSING_MESSAGE : "Couldn't save the defaults." };

  const { error } = existing
    ? await supabase.from("storyboard_settings").update({ settings: parsed.value, updated_by: profile.id }).eq("id", existing.id)
    : await supabase.from("storyboard_settings").insert({
        scope: "org",
        owner_id: null,
        module: input.module,
        settings: parsed.value,
        updated_by: profile.id,
      });
  if (error) return { error: isMissingSchemaError(error) ? STORYBOARD_MISSING_MESSAGE : "Couldn't save the defaults." };

  revalidatePath("/settings");
  revalidatePath("/leads", "layout");
  return { error: null };
}
