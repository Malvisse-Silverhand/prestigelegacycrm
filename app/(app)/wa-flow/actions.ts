"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

export async function saveTemplate(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "agent") return { error: "You don't have permission to manage templates." };

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const language = String(formData.get("language") ?? "BM");
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !category || !body) return { error: "Title, category, and message body are required." };

  const supabase = await createClient();
  const payload = { title, category, language, body, created_by: profile.id, unit_id: profile.unit_id };

  const { error } = id
    ? await supabase.from("wa_templates").update(payload).eq("id", id)
    : await supabase.from("wa_templates").insert(payload);

  if (error) return { error: "Couldn't save this template." };
  revalidatePath("/wa-flow");
  return { error: null };
}

export async function deleteTemplate(id: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "agent") return { error: "You don't have permission to delete templates." };

  const supabase = await createClient();
  const { error } = await supabase.from("wa_templates").delete().eq("id", id);
  if (error) return { error: "Couldn't delete this template." };

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
  await supabase.rpc("increment_template_usage", { template_id: id });
}
