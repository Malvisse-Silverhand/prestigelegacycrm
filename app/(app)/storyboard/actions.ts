"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import {
  STORYBOARD_MODULES,
  MODULE_DEFAULTS,
  EMPTY_PROFILE,
  compute,
  headline,
  hydrateInputs,
  hydrateProfile,
  type StoryboardModule,
} from "@/lib/storyboard/modules";
import { UNDERWRITING_FLAGS, STORYBOARD_TEXT, rm, type Lang } from "@/lib/storyboard/i18n";
import { getLeadPrefill } from "./data";

// Presenting a storyboard is a meeting with the prospect, so the lead belongs
// in Appointment -- the same rule saveAppointment applies, and the same
// forward-only list: a lead already at Appointment or beyond is never pulled
// back by a follow-up presentation.
const STAGES_TO_ADVANCE = ["new", "contacted", "follow_up", "quoted"];

function isModule(m: string): m is StoryboardModule {
  return (STORYBOARD_MODULES as readonly string[]).includes(m);
}

export async function createSession(module: string, leadId: string | null) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in.", id: null };
  if (!isModule(module)) return { error: "Unknown module.", id: null };

  let prospect = { ...EMPTY_PROFILE };
  if (leadId) {
    const lead = await getLeadPrefill(leadId);
    if (!lead) return { error: "That lead could not be found.", id: null };
    prospect = lead.profile;
  }

  const inputs = structuredClone(MODULE_DEFAULTS[module]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("storyboard_sessions")
    .insert({
      agent_id: profile.id,
      lead_id: leadId,
      module,
      profile: prospect,
      inputs,
      result: compute(module, inputs),
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    Sentry.captureException(error ?? new Error("storyboard insert returned no row"), { tags: { action: "createSession" } });
    return { error: "Couldn't start the storyboard. Please try again.", id: null };
  }
  revalidatePath("/storyboard");
  return { error: null, id: data.id as string };
}

// Autosave. The result is recomputed here rather than taken from the browser,
// so what insights count is always what the engine says about these inputs.
export async function saveSession(
  id: string,
  patch: { profile: unknown; inputs: unknown; notes: string; riskFlags: string[]; lang: Lang },
) {
  const supabase = await createClient();
  const { data: row } = await supabase.from("storyboard_sessions").select("module").eq("id", id).maybeSingle();
  if (!row || !isModule(row.module as string)) return { error: "Session not found." };
  const module = row.module as StoryboardModule;

  const inputs = hydrateInputs(module, patch.inputs);
  const { error } = await supabase
    .from("storyboard_sessions")
    .update({
      profile: hydrateProfile(patch.profile),
      inputs,
      result: compute(module, inputs),
      notes: patch.notes.slice(0, 4000) || null,
      risk_flags: patch.riskFlags.filter((f) => (UNDERWRITING_FLAGS as readonly string[]).includes(f)),
      lang: patch.lang === "en" ? "en" : "bm",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    Sentry.captureException(error, { tags: { action: "saveSession" } });
    return { error: "Couldn't save. Check your connection." };
  }
  return { error: null };
}

export async function markPresented(id: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in.", movedToAppointment: false };

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("storyboard_sessions")
    .select("id, module, lang, status, presented_at, lead_id, result, leads(id, pipeline_stage)")
    .eq("id", id)
    .maybeSingle();
  if (!session) return { error: "Session not found.", movedToAppointment: false };

  const { error } = await supabase
    .from("storyboard_sessions")
    .update({
      status: session.status === "draft" ? "presented" : session.status,
      presented_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    Sentry.captureException(error, { tags: { action: "markPresented" } });
    return { error: "Couldn't update the session.", movedToAppointment: false };
  }

  let movedToAppointment = false;
  const lead = session.leads as unknown as { id: string; pipeline_stage: string } | null;
  if (lead) {
    const module = session.module as StoryboardModule;
    const name = STORYBOARD_TEXT.en.modules[module].name;
    const gap = headline(module, session.result).gap;
    await supabase.from("lead_activity").insert({
      lead_id: lead.id,
      actor_id: profile.id,
      activity_type: "storyboard",
      content: `Financial Storyboard · ${name} presented — gap ${rm(gap)}`,
    });

    if (STAGES_TO_ADVANCE.includes(lead.pipeline_stage)) {
      const { data: moved } = await supabase
        .from("leads")
        .update({ pipeline_stage: "appointment" })
        .eq("id", lead.id)
        .select("id")
        .maybeSingle();
      if (moved) {
        movedToAppointment = true;
        await supabase.from("lead_activity").insert({
          lead_id: lead.id,
          actor_id: profile.id,
          activity_type: "stage_change",
          content: "Moved to Appointment",
        });
      }
    }
    revalidatePath(`/leads/${lead.id}`);
    revalidatePath("/pipeline");
    revalidatePath("/dashboard");
  }

  revalidatePath("/storyboard");
  revalidatePath(`/storyboard/${id}`);
  return { error: null, movedToAppointment };
}

export async function markShared(id: string, via: "whatsapp") {
  const supabase = await createClient();
  const { data: s } = await supabase.from("storyboard_sessions").select("shared_via").eq("id", id).maybeSingle();
  if (!s) return { error: "Session not found." };
  const shared = new Set([...(s.shared_via as string[]), via]);
  await supabase
    .from("storyboard_sessions")
    .update({ status: "shared", shared_via: [...shared], updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/storyboard");
  return { error: null };
}

export async function attachLead(id: string, leadId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("storyboard_sessions")
    .update({ lead_id: leadId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't save to that lead." };
  revalidatePath("/storyboard");
  revalidatePath(`/storyboard/${id}`);
  revalidatePath(`/leads/${leadId}`);
  return { error: null };
}

export async function deleteSession(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("storyboard_sessions").delete().eq("id", id);
  if (error) return { error: "Couldn't delete this session." };
  revalidatePath("/storyboard");
  return { error: null };
}
