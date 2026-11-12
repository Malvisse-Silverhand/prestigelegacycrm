"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getStoryboardLang } from "@/lib/storyboard/i18n/server";
import { parseLang, t, type Lang, type TKey } from "@/lib/storyboard/i18n";
import { isBuiltModule } from "@/lib/storyboard/modules";
import { attachErrorKey, mapAttachResult, sanitizeTitle } from "@/lib/storyboard/practice";
import { isMissingSchemaError, missingMessage } from "@/lib/storyboard/schema-error";
import { isModule, isUuid } from "@/lib/storyboard/validate";
import type { StoryboardModule } from "@/lib/storyboard/types";

/** Most practice sessions one person can keep at once (they also expire after 30 days). */
const MAX_PRACTICE = 50;

async function actionLang(explicit: unknown): Promise<Lang> {
  return parseLang(explicit) ?? (await getStoryboardLang());
}

function revalidateHub() {
  revalidatePath("/storyboards", "layout");
}

/** "function not found" from PostgREST / Postgres, i.e. the migration is not applied. */
function isMissingFunction(error: { code?: string } | null | undefined): boolean {
  return Boolean(error?.code === "PGRST202" || error?.code === "42883");
}

export async function createPracticeStoryboard(input: {
  module: StoryboardModule;
  title?: string | null;
  lang?: Lang;
}): Promise<{ error: string | null; id: string | null }> {
  const lang = await actionLang(input?.lang);
  const tr = (key: TKey) => t(key, lang);
  const profile = await getCurrentProfile();
  if (!profile) return { error: tr("err.notSignedIn"), id: null };
  if (!isModule(input?.module)) return { error: tr("err.unknownModule"), id: null };
  if (!isBuiltModule(input.module)) return { error: tr("err.notYet"), id: null };

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("storyboards")
    .select("id", { count: "exact", head: true })
    .is("lead_id", null)
    .eq("owner_id", profile.id);
  if (countError) {
    return { error: isMissingSchemaError(countError) ? missingMessage(lang) : tr("practice.err.createFailed"), id: null };
  }
  if ((count ?? 0) >= MAX_PRACTICE) return { error: t("practice.err.limit", lang, { max: MAX_PRACTICE }), id: null };

  const { data, error } = await supabase
    .from("storyboards")
    .insert({ module: input.module, owner_id: profile.id, title: sanitizeTitle(input.title) })
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !data) {
    return { error: isMissingSchemaError(error) ? missingMessage(lang) : tr("practice.err.createFailed"), id: null };
  }
  revalidateHub();
  return { error: null, id: data.id };
}

export async function deletePracticeStoryboard(input: { id: string; lang?: Lang }): Promise<{ error: string | null }> {
  const lang = await actionLang(input?.lang);
  const tr = (key: TKey) => t(key, lang);
  const profile = await getCurrentProfile();
  if (!profile) return { error: tr("err.notSignedIn") };
  if (!isUuid(input?.id)) return { error: tr("practice.err.notFound") };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("storyboards")
    .delete()
    .eq("id", input.id)
    .is("lead_id", null)
    .eq("owner_id", profile.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: isMissingSchemaError(error) ? missingMessage(lang) : tr("practice.err.deleteFailed") };
  if (!data) return { error: tr("practice.err.notFound") };
  revalidateHub();
  return { error: null };
}

export async function renamePracticeStoryboard(input: {
  id: string;
  title: string | null;
  lang?: Lang;
}): Promise<{ error: string | null }> {
  const lang = await actionLang(input?.lang);
  const tr = (key: TKey) => t(key, lang);
  const profile = await getCurrentProfile();
  if (!profile) return { error: tr("err.notSignedIn") };
  if (!isUuid(input?.id)) return { error: tr("practice.err.notFound") };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("storyboards")
    .update({ title: sanitizeTitle(input.title) })
    .eq("id", input.id)
    .is("lead_id", null)
    .eq("owner_id", profile.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: isMissingSchemaError(error) ? missingMessage(lang) : tr("practice.err.renameFailed") };
  if (!data) return { error: tr("practice.err.notFound") };
  revalidateHub();
  return { error: null };
}

/**
 * Moves a practice session onto one of the agent's own leads through the
 * database function (which re-checks ownership of both). Returns the lead's
 * storyboard URL on success.
 */
export async function attachPracticeStoryboard(input: {
  id: string;
  leadId: string;
  lang?: Lang;
}): Promise<{ error: string | null; url: string | null }> {
  const lang = await actionLang(input?.lang);
  const tr = (key: TKey) => t(key, lang);
  const profile = await getCurrentProfile();
  if (!profile) return { error: tr("err.notSignedIn"), url: null };
  if (!isUuid(input?.id)) return { error: tr("practice.err.attachNotFound"), url: null };
  if (!isUuid(input?.leadId)) return { error: tr("practice.err.attachNotAllowed"), url: null };

  const supabase = await createClient();
  // The module decides the URL we send the agent to.
  const { data: row, error: rowError } = await supabase
    .from("storyboards")
    .select("module")
    .eq("id", input.id)
    .is("lead_id", null)
    .eq("owner_id", profile.id)
    .maybeSingle<{ module: StoryboardModule }>();
  if (rowError) return { error: isMissingSchemaError(rowError) ? missingMessage(lang) : tr("practice.err.attachFailed"), url: null };
  if (!row) return { error: tr("practice.err.attachNotFound"), url: null };

  const { data, error } = await supabase.rpc("attach_practice_storyboard", { p_id: input.id, p_lead_id: input.leadId });
  if (error) {
    return { error: isMissingSchemaError(error) || isMissingFunction(error) ? missingMessage(lang) : tr("practice.err.attachFailed"), url: null };
  }
  const outcome = mapAttachResult(data);
  if (outcome !== "ok") return { error: tr(attachErrorKey(outcome)), url: null };

  revalidateHub();
  revalidatePath(`/leads/${input.leadId}`);
  revalidatePath(`/leads/${input.leadId}/storyboard`, "layout");
  return { error: null, url: `/leads/${input.leadId}/storyboard/${row.module}/fill` };
}

export type OwnLead = { id: string; leadNo: number | null; name: string };

/** The signed-in agent's own live leads matching `q` (name or phone), for the "attach to lead" picker. */
export async function searchOwnLeads(input: { q?: string }): Promise<{ error: string | null; leads: OwnLead[] }> {
  const lang = await actionLang(undefined);
  const profile = await getCurrentProfile();
  if (!profile) return { error: t("err.notSignedIn", lang), leads: [] };

  // Strip characters that mean something in a PostgREST filter value.
  const q = (typeof input?.q === "string" ? input.q : "").replace(/[%,()*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("id, lead_no, full_name")
    .eq("agent_id", profile.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data, error } = await query.returns<{ id: string; lead_no: number | null; full_name: string }[]>();
  if (error) return { error: t("practice.err.leadSearchFailed", lang), leads: [] };
  return { error: null, leads: (data ?? []).map((l) => ({ id: l.id, leadNo: l.lead_no, name: l.full_name })) };
}
