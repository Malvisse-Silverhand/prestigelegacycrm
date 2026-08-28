"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

export async function createLead(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "agent") {
    return { error: "You don't have permission to add leads." };
  }

  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!full_name || !phone) {
    return { error: "Name and phone are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    full_name,
    phone,
    email: String(formData.get("email") ?? "").trim() || null,
    state: String(formData.get("state") ?? "").trim() || null,
    occupation: String(formData.get("occupation") ?? "").trim() || null,
    lead_source: String(formData.get("lead_source") ?? "").trim() || null,
    interest: String(formData.get("interest") ?? "").trim() || null,
    unit_id: profile.unit_id,
  });

  if (error) {
    return { error: "Couldn't save this lead. Please try again." };
  }

  revalidatePath("/leads");
  return { error: null };
}

export async function updateLead(leadId: string, formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You don't have permission to do that." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!full_name || !phone) {
    return { error: "Name and phone are required." };
  }

  const supabase = await createClient();
  // RLS already scopes which rows this UPDATE can actually reach (own leads
  // for an agent, unit leads for a unit manager, etc.) -- no row matching the
  // WHERE means either it doesn't exist or the caller can't touch it.
  const { data, error } = await supabase
    .from("leads")
    .update({
      full_name,
      phone,
      email: String(formData.get("email") ?? "").trim() || null,
      date_of_birth: String(formData.get("date_of_birth") ?? "").trim() || null,
      state: String(formData.get("state") ?? "").trim() || null,
      occupation: String(formData.get("occupation") ?? "").trim() || null,
      lead_source: String(formData.get("lead_source") ?? "").trim() || null,
      interest: String(formData.get("interest") ?? "").trim() || null,
    })
    .eq("id", leadId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't save these changes. Please try again." };

  revalidatePath("/leads");
  return { error: null };
}
