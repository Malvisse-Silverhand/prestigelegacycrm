"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { dispatchWebhook } from "@/lib/dispatch-webhook";
import { malaysiaToday } from "@/lib/malaysia-date";
import { stageLabel } from "@/lib/pipeline-stages";
import { buildClientSummaryBundle } from "@/lib/storyboard/client-summary";
import { computeModule } from "@/lib/storyboard/engine";
import { getStoryboardLang } from "@/lib/storyboard/i18n/server";
import { parseLang, t, type Lang, type TKey } from "@/lib/storyboard/i18n";
import { OUTCOME_LABEL, outcomeLabel, planOutcome } from "@/lib/storyboard/outcome";
import { isBuiltModule, MODULE_NAME } from "@/lib/storyboard/modules";
import { markStepSaved, readStepStatus } from "@/lib/storyboard/progress";
import { isMissingSchemaError, missingMessage } from "@/lib/storyboard/schema-error";
import {
  mergeAgentSettings,
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
  OPERATOR_MSG,
  readStored,
  sanitizeNotes,
  sanitizePatch,
} from "@/lib/storyboard/validate";
import type { StoryboardModule, StoryboardOutcome, StoryboardStep } from "@/lib/storyboard/types";

type SaveResult = { error: string | null; savedAt: string | null };

function revalidateStoryboard(leadId: string) {
  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/leads/${leadId}/storyboard`, "layout");
  revalidatePath("/storyboards");
}

/**
 * Validators return English text. The one message an agent can actually hit
 * (naming another operator) is translated; anything else means the page sent a
 * payload it could not have built, so BM users get a generic "reload" message.
 */
function localizeValidation(error: string, lang: Lang): string {
  if (lang === "en") return error;
  return error === OPERATOR_MSG ? t("err.operator", lang) : t("err.invalidData", lang);
}

/** The language of an action call: an explicit, validated one from the client, else the cookie. */
async function actionLang(explicit: unknown): Promise<Lang> {
  return parseLang(explicit) ?? (await getStoryboardLang());
}

export async function saveStoryboard(input: {
  leadId: string;
  module: StoryboardModule;
  /** Which step is being saved. Defaults to Fill & Calculate. */
  step?: StoryboardStep;
  /** Fill sends every field; the other steps send only their own (riskChecked, raised). */
  inputs: unknown;
  notes?: string | null;
  /** The language the agent is using; the saved client summary opens in it. */
  lang?: Lang;
}): Promise<SaveResult> {
  const lang = await actionLang(input?.lang);
  const tr = (key: TKey) => t(key, lang);
  const profile = await getCurrentProfile();
  if (!profile) return { error: tr("err.notSignedIn"), savedAt: null };
  if (!isUuid(input?.leadId)) return { error: tr("err.leadNotFound"), savedAt: null };
  if (!isModule(input.module)) return { error: tr("err.unknownModule"), savedAt: null };
  if (!isBuiltModule(input.module)) return { error: tr("err.notYet"), savedAt: null };
  const mod = input.module;
  const step: StoryboardStep = input.step === undefined ? "fill" : input.step;
  if (!isStep(step)) return { error: tr("err.unknownStep"), savedAt: null };

  const patch = sanitizePatch(mod, input.inputs);
  if (!patch.ok) return { error: localizeValidation(patch.error, lang), savedAt: null };

  const supabase = await createClient();
  const leadId = input.leadId;

  // RLS decides whether this person can see the lead at all.
  const { data: lead, error: leadError } = await supabase.from("leads").select("id").eq("id", leadId).maybeSingle();
  if (leadError || !lead) return { error: tr("err.leadNotFound"), savedAt: null };

  const { data: existing, error: loadError } = await supabase
    .from("storyboards")
    .select("id, inputs, step_status, notes")
    .eq("lead_id", leadId)
    .eq("module", mod)
    .maybeSingle<{ id: string; inputs: unknown; step_status: unknown; notes: string | null }>();
  if (loadError) {
    return { error: isMissingSchemaError(loadError) ? missingMessage(lang) : tr("err.saveFailed"), savedAt: null };
  }
  if (step !== "fill" && !existing) return { error: tr("err.saveStep1First"), savedAt: null };

  // Step 1 sends the whole form; later steps patch what is stored.
  const base = existing ? readStored(mod, existing.inputs) : defaultStored(mod);
  const merged = mergeStored(mod, base, patch.value);

  // Everything the client sees is recomputed here. Client-sent outputs don't exist.
  // The stored outputs are the English run: stable whatever language the agent used.
  const result = computeModule(mod, merged as never, "en");

  const [{ data: settingsRows }, { data: me }] = await Promise.all([
    supabase
      .from("storyboard_settings")
      .select("scope, owner_id, settings")
      .eq("module", mod)
      .returns<{ scope: "org" | "agent"; owner_id: string | null; settings: unknown }[]>(),
    supabase.from("profiles").select("phone").eq("id", profile.id).maybeSingle<{ phone: string | null }>(),
  ]);
  const org = readOrgSettings(settingsRows?.find((r) => r.scope === "org")?.settings, mod);
  // Only the plan name feeds the client summary; it is org-level or the language's placeholder.
  const planNames = {
    en: resolveSettings(mod, "en", org).planName,
    bm: resolveSettings(mod, "bm", org).planName,
  };

  // The summary is built from computed outputs and the plan name only, in BOTH
  // languages. Agent-only inputs (notes, the CI story, claim stories, proofs)
  // are never passed on.
  const clientSummary = buildClientSummaryBundle({
    module: mod,
    inputs: merged as unknown as Record<string, unknown>,
    agent: { firstName: profile.full_name.trim().split(/\s+/)[0] ?? "", wa: me?.phone ?? "" },
    plans: { en: { name: planNames.en }, bm: { name: planNames.bm } },
    defaultLang: lang,
  });

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
    return { error: isMissingSchemaError(writeError) ? missingMessage(lang) : tr("err.saveFailed"), savedAt: null };
  }
  if (!written) {
    return { error: tr("err.ownerOnlySave"), savedAt: null };
  }

  // The activity log is an internal record, kept in English for every user.
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
  lang?: Lang;
}): Promise<{ error: string | null; message: string | null }> {
  const lang = await actionLang(input?.lang);
  const tr = (key: TKey) => t(key, lang);
  const profile = await getCurrentProfile();
  if (!profile) return { error: tr("err.notSignedIn"), message: null };
  if (!isUuid(input?.leadId)) return { error: tr("err.leadNotFound"), message: null };
  if (!isModule(input.module)) return { error: tr("err.unknownModule"), message: null };
  if (!isBuiltModule(input.module)) return { error: tr("err.notYet"), message: null };
  if (!isOutcome(input.outcome)) return { error: tr("err.unknownOutcome"), message: null };

  const supabase = await createClient();
  const leadId = input.leadId;

  const { data: lead } = await supabase
    .from("leads")
    .select("id, pipeline_stage")
    .eq("id", leadId)
    .maybeSingle<{ id: string; pipeline_stage: string }>();
  if (!lead) return { error: tr("err.leadNotFound"), message: null };

  const { data: row, error: rowError } = await supabase
    .from("storyboards")
    .select("id, step_status")
    .eq("lead_id", leadId)
    .eq("module", input.module)
    .maybeSingle<{ id: string; step_status: unknown }>();
  if (rowError) {
    return { error: isMissingSchemaError(rowError) ? missingMessage(lang) : tr("err.outcomeFailed"), message: null };
  }
  if (!row) return { error: tr("err.saveStep1Outcome"), message: null };

  // The existing rule for entering Quoted is "a quotation is on file".
  let hasQuotation = false;
  if (input.outcome === "ready_for_quote") {
    const { count } = await supabase.from("quotations").select("id", { count: "exact", head: true }).eq("lead_id", leadId);
    hasQuotation = (count ?? 0) > 0;
  }

  const planInput = {
    outcome: input.outcome,
    currentStage: lead.pipeline_stage,
    today: malaysiaToday(),
    followUpDate: input.followUpDate ?? null,
    reason: input.reason ?? null,
    hasQuotation,
  };
  const plan = planOutcome({ ...planInput, lang });
  if (!plan.ok) return { error: plan.error, message: null };
  // The activity log stays in English whatever the agent's language.
  const logPlan = lang === "en" ? plan : planOutcome(planInput);
  const logSummary = logPlan.ok ? logPlan.summary : plan.summary;

  const { data: updated, error: updateError } = await supabase
    .from("storyboards")
    .update({ outcome: input.outcome, step_status: markStepSaved(readStepStatus(row.step_status), "objections") })
    .eq("id", row.id)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) {
    return { error: tr("err.ownerOnlyOutcome"), message: null };
  }

  if (Object.keys(plan.patch).length > 0) {
    const { data: leadUpdated, error: leadError } = await supabase
      .from("leads")
      .update(plan.patch)
      .eq("id", leadId)
      .select("id")
      .maybeSingle();
    if (leadError || !leadUpdated) {
      return { error: tr("err.leadUpdateFailed"), message: null };
    }
  }

  const reason = input.outcome === "not_interested" ? cleanText(input.reason, 200) : "";
  const content =
    `Financial Storyboard (${MODULE_NAME[input.module]}): ${OUTCOME_LABEL[input.outcome]}` +
    (reason ? ` - ${reason}` : "") +
    ` (${logSummary})`;
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
  return {
    error: null,
    message: t("outcome.recorded", lang, { label: outcomeLabel(input.outcome, lang), summary: plan.summary }),
  };
}

/**
 * The agent's own script, objection answers and checklist items, for ONE
 * language. The other language's overrides are left exactly as they are.
 */
export async function saveStoryboardSettings(input: {
  scope: "agent";
  module: StoryboardModule;
  settings: unknown;
  /** The language the overrides are written in. */
  lang?: Lang;
}): Promise<{ error: string | null }> {
  const lang = await actionLang(input?.lang);
  const tr = (key: TKey) => t(key, lang);
  const profile = await getCurrentProfile();
  if (!profile) return { error: tr("err.notSignedIn") };
  if (input?.scope !== "agent") return { error: tr("err.settingsScope") };
  if (!isModule(input.module)) return { error: tr("err.unknownModule") };
  if (!isBuiltModule(input.module)) return { error: tr("err.notYet") };

  const parsed = sanitizeAgentSettings(input.settings, input.module, lang);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("storyboard_settings")
    .select("id, settings")
    .eq("scope", "agent")
    .eq("owner_id", profile.id)
    .eq("module", input.module)
    .maybeSingle<{ id: string; settings: unknown }>();
  if (loadError) return { error: isMissingSchemaError(loadError) ? missingMessage(lang) : tr("err.settingsSaveFailed") };

  // Per-language merge: this language's keys change, everything else is kept
  // (including the other language and a legacy un-keyed value, which counts as English).
  const merged = mergeAgentSettings(existing?.settings, lang, parsed.value);

  const { error } = existing
    ? await supabase.from("storyboard_settings").update({ settings: merged, updated_by: profile.id }).eq("id", existing.id)
    : await supabase.from("storyboard_settings").insert({
        scope: "agent",
        owner_id: profile.id,
        module: input.module,
        settings: merged,
        updated_by: profile.id,
      });
  if (error) return { error: isMissingSchemaError(error) ? missingMessage(lang) : tr("err.settingsSaveFailed") };

  revalidatePath("/leads", "layout");
  return { error: null };
}

/** Org defaults: plan name, multiples, statistics placeholders. SuperAdmin only. */
export async function saveOrgStoryboardSettings(input: {
  module: StoryboardModule;
  settings: unknown;
  lang?: Lang;
}): Promise<{ error: string | null }> {
  const lang = await actionLang(input?.lang);
  const tr = (key: TKey) => t(key, lang);
  const profile = await getCurrentProfile();
  // Checked on the server: hiding the tab is not a permission.
  if (!profile || profile.role !== "superadmin") return { error: tr("err.orgSuperOnly") };
  if (!isModule(input?.module)) return { error: tr("err.unknownModule") };
  if (!isBuiltModule(input.module)) return { error: tr("err.notYet") };

  const parsed = sanitizeOrgSettings(input.settings, input.module, lang);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("storyboard_settings")
    .select("id")
    .eq("scope", "org")
    .is("owner_id", null)
    .eq("module", input.module)
    .maybeSingle<{ id: string }>();
  if (loadError) return { error: isMissingSchemaError(loadError) ? missingMessage(lang) : tr("err.orgSaveFailed") };

  const { error } = existing
    ? await supabase.from("storyboard_settings").update({ settings: parsed.value, updated_by: profile.id }).eq("id", existing.id)
    : await supabase.from("storyboard_settings").insert({
        scope: "org",
        owner_id: null,
        module: input.module,
        settings: parsed.value,
        updated_by: profile.id,
      });
  if (error) return { error: isMissingSchemaError(error) ? missingMessage(lang) : tr("err.orgSaveFailed") };

  revalidatePath("/settings");
  revalidatePath("/leads", "layout");
  return { error: null };
}
