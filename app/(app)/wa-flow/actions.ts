"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

function canManageTemplates(role: string) {
  return role === "superadmin" || role === "group_manager";
}

export async function saveTemplate(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageTemplates(profile.role)) return { error: "You don't have permission to manage templates." };

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const language = String(formData.get("language") ?? "BM");
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !category || !body) return { error: "Title, category, and message body are required." };

  const supabase = await createClient();
  const payload = { title, category, language, body, created_by: profile.id, unit_id: profile.unit_id };

  const { data, error } = id
    ? await supabase.from("wa_templates").update(payload).eq("id", id).select("id").maybeSingle()
    : await supabase.from("wa_templates").insert(payload).select("id").maybeSingle();

  if (error || !data) return { error: "Couldn't save this template." };
  revalidatePath("/wa-flow");
  return { error: null };
}

export async function deleteTemplate(id: string) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageTemplates(profile.role)) return { error: "You don't have permission to delete templates." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("wa_templates").delete().eq("id", id).select("id").maybeSingle();
  if (error || !data) return { error: "Couldn't delete this template." };

  revalidatePath("/wa-flow");
  return { error: null };
}

// `wa_templates` write access is manager-only for everything except the
// usage counter -- title/category/body/language still require "managers
// manage templates". Bumping usage_count goes through a SECURITY DEFINER
// function instead of a raw UPDATE so any authenticated user (agents
// included) can increment it on a template they can already see, without
// opening a column-write hole on the table itself.
export async function bumpUsage(id: string) {
  const supabase = await createClient();
  // Best-effort: a missed increment is a wrong analytics number, not a
  // correctness issue for the user's actual action (sending the template
  // already happened client-side regardless of this call).
  const { error } = await supabase.rpc("increment_template_usage", { template_id: id });
  if (error) console.error("bumpUsage: increment_template_usage failed", error);
}
