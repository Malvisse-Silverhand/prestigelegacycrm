"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { MALAYSIAN_STATES, LEAD_SOURCES } from "@/lib/lead-constants";
import { INTEREST_OPTIONS } from "@/lib/product-interest";

const STATUS_VALUES = ["hot", "warm", "cold"];

function pickState(v: string) {
  return (MALAYSIAN_STATES as readonly string[]).includes(v) ? v : null;
}
function pickLeadSource(v: string) {
  return (LEAD_SOURCES as readonly string[]).includes(v) ? v : null;
}
function pickInterest(v: string) {
  return INTEREST_OPTIONS.some((o) => o.label === v) ? v : null;
}
function pickStatus(v: string, fallback: string) {
  return STATUS_VALUES.includes(v) ? v : fallback;
}
function pickGender(v: string) {
  return v === "male" || v === "female" ? v : null;
}
function pickSmoker(v: string) {
  return v === "" ? null : v === "true";
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
