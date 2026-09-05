"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { pickState, pickLeadSource, pickInterest, pickStatus, pickGender, pickSmoker, pickOccupationClass } from "@/lib/lead-field-validation";
import { getAllLeadsForExport, type LeadFilters } from "./data";

export async function exportLeads(filters: LeadFilters) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You don't have permission to do that.", leads: null };

  const leads = await getAllLeadsForExport(filters);
  return { error: null, leads };
}

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

  const postcode = String(formData.get("postcode") ?? "").trim();
  if (postcode && !/^\d{5}$/.test(postcode)) {
    return { error: "Postcode must be exactly 5 digits." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    full_name,
    phone,
    email: String(formData.get("email") ?? "").trim() || null,
    date_of_birth: String(formData.get("date_of_birth") ?? "").trim() || null,
    gender: pickGender(String(formData.get("gender") ?? "").trim()),
    is_smoker: pickSmoker(String(formData.get("is_smoker") ?? "").trim()),
    state: pickState(String(formData.get("state") ?? "").trim()),
    occupation: String(formData.get("occupation") ?? "").trim() || null,
    occupation_class: pickOccupationClass(String(formData.get("occupation_class") ?? "").trim()),
    address: String(formData.get("address") ?? "").trim() || null,
    postcode: postcode || null,
    lead_source: pickLeadSource(String(formData.get("lead_source") ?? "").trim()),
    interest: pickInterest(String(formData.get("interest") ?? "").trim()),
    status: pickStatus(String(formData.get("status") ?? "").trim(), "warm"),
    agent_remark: String(formData.get("agent_remark") ?? "").trim() || null,
    unit_id: profile.unit_id,
    // A manager creating a lead by hand is the natural first owner --
    // reassignable afterwards from Lead Detail (see updateLeadOwner).
    agent_id: profile.id,
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

  const postcode = String(formData.get("postcode") ?? "").trim();
  if (postcode && !/^\d{5}$/.test(postcode)) {
    return { error: "Postcode must be exactly 5 digits." };
  }

  const supabase = await createClient();

  // Status needs the row's current value as a fallback (so an existing
  // "unassigned"/"closed" status -- outside the hot/warm/cold picker --
  // doesn't get silently overwritten if the field is somehow left blank).
  const { data: existing } = await supabase.from("leads").select("status").eq("id", leadId).maybeSingle();

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
      state: pickState(String(formData.get("state") ?? "").trim()),
      occupation: String(formData.get("occupation") ?? "").trim() || null,
      occupation_class: pickOccupationClass(String(formData.get("occupation_class") ?? "").trim()),
      address: String(formData.get("address") ?? "").trim() || null,
      postcode: postcode || null,
      lead_source: pickLeadSource(String(formData.get("lead_source") ?? "").trim()),
      interest: pickInterest(String(formData.get("interest") ?? "").trim()),
      status: pickStatus(String(formData.get("status") ?? "").trim(), existing?.status ?? "warm"),
      agent_remark: String(formData.get("agent_remark") ?? "").trim() || null,
      gender: pickGender(String(formData.get("gender") ?? "").trim()),
      is_smoker: pickSmoker(String(formData.get("is_smoker") ?? "").trim()),
      budget_indicated: String(formData.get("budget_indicated") ?? "").trim() || null,
      best_time_to_reach: String(formData.get("best_time_to_reach") ?? "").trim() || null,
    })
    .eq("id", leadId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't save these changes. Please try again." };

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { error: null };
}

export async function deleteLead(leadId: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "agent") {
    return { error: "You don't have permission to delete leads." };
  }

  const supabase = await createClient();
  // RLS scopes which row this can actually reach (own unit for a unit
  // manager, own units for a group manager, any for superadmin). No row
  // matching the WHERE means either it doesn't exist or the caller can't
  // touch it -- same "not found vs not allowed" ambiguity as updateLead.
  const { data, error } = await supabase.from("leads").delete().eq("id", leadId).select("id").maybeSingle();

  if (error || !data) return { error: "Couldn't delete this lead. Please try again." };

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { error: null };
}
