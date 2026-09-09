"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { pickState, pickLeadSource, pickInterest, pickStatus, pickGender, pickSmoker, pickOccupationClass } from "@/lib/lead-field-validation";
import { RELATIONSHIPS, type Relationship } from "@/lib/lead-constants";
import { getAllLeadsForExport, type LeadFilters } from "./data";
import { dispatchWebhook } from "@/lib/dispatch-webhook";

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
  const { data: created, error } = await supabase.from("leads").insert({
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
  })
    .select("id, full_name, phone, email, lead_source, interest, status, created_at")
    .maybeSingle();

  if (error) {
    return { error: "Couldn't save this lead. Please try again." };
  }

  // Never blocks the save: dispatchWebhook swallows its own failures.
  if (created) await dispatchWebhook("lead_created", { ...created, source: "manual" });

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

// A soft delete. The lead drops out of every screen -- the RLS select policy
// hides a row with deleted_at set from everyone below SuperAdmin, so the
// pipeline, dashboard counts, statistics and its own quotations/appointments
// all follow without each query having to remember. The row itself stays, and
// a SuperAdmin can find it under Leads Manager → Deleted and restore it.
//
// Deletion is the one destructive action available this far down the
// hierarchy, and a lead carries a real person's contact details, so it is
// recoverable by design rather than gone.
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
  const { data, error } = await supabase
    .from("leads")
    .update({ deleted_at: new Date().toISOString(), deleted_by: profile.id })
    .eq("id", leadId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't delete this lead. Please try again." };

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
  return { error: null };
}

// SuperAdmin only, from the Deleted list: puts the lead back exactly where it
// was -- stage, owner and history are untouched by a soft delete.
export async function restoreLead(leadId: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") {
    return { error: "Only a SuperAdmin can restore a deleted lead." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", leadId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't restore this lead." };

  revalidatePath("/leads");
  revalidatePath("/pipeline");
  return { error: null };
}

// The only way a lead actually leaves the database. SuperAdmin only, and only
// for something already in the Deleted list -- so it always takes two
// deliberate steps by two different levels of authority.
export async function purgeLead(leadId: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") {
    return { error: "Only a SuperAdmin can permanently delete a lead." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .not("deleted_at", "is", null);

  if (error) return { error: "Couldn't permanently delete this lead." };

  revalidatePath("/leads");
  return { error: null };
}

// ===== Family & relatives =====

function pickRelationship(v: string): Relationship | null {
  return (RELATIONSHIPS as readonly string[]).includes(v) ? (v as Relationship) : null;
}

// Adds a family member of an existing lead. The relative is an ordinary lead
// in their own right -- their own DOB, occupation class and quotations -- that
// points back at the person they came from.
//
// Ownership follows the parent rather than the caller: a manager adding the
// spouse of an agent's client is handing that agent a lead, not taking one.
export async function addRelative(parentLeadId: string, formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You don't have permission to do that." };

  const relationship = pickRelationship(String(formData.get("relationship") ?? "").trim());
  if (!relationship) return { error: "Choose how this person is related." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!full_name || !phone) return { error: "Name and phone are required." };

  const postcode = String(formData.get("postcode") ?? "").trim();
  if (postcode && !/^\d{5}$/.test(postcode)) return { error: "Postcode must be exactly 5 digits." };

  const supabase = await createClient();
  // RLS decides whether this person may add a relative here; reading the
  // parent first is what makes the new lead inherit the right owner and unit,
  // and it fails closed if the parent isn't visible to them.
  const { data: parent } = await supabase
    .from("leads")
    .select("id, agent_id, unit_id, address, state, postcode")
    .eq("id", parentLeadId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!parent) return { error: "That lead no longer exists." };

  const { data: created, error } = await supabase
    .from("leads")
    .insert({
      full_name,
      phone,
      email: String(formData.get("email") ?? "").trim() || null,
      date_of_birth: String(formData.get("date_of_birth") ?? "").trim() || null,
      gender: pickGender(String(formData.get("gender") ?? "").trim()),
      is_smoker: pickSmoker(String(formData.get("is_smoker") ?? "").trim()),
      state: pickState(String(formData.get("state") ?? "").trim()),
      occupation: String(formData.get("occupation") ?? "").trim() || null,
      occupation_class: pickOccupationClass(String(formData.get("occupation_class") ?? "").trim()),
      // A relative usually lives at the same address, so the parent's is the
      // sensible default -- but only when the form left it blank.
      address: String(formData.get("address") ?? "").trim() || parent.address,
      postcode: postcode || parent.postcode,
      lead_source: pickLeadSource(String(formData.get("lead_source") ?? "").trim()),
      interest: pickInterest(String(formData.get("interest") ?? "").trim()),
      status: pickStatus(String(formData.get("status") ?? "").trim(), "warm"),
      agent_remark: String(formData.get("agent_remark") ?? "").trim() || null,
      parent_lead_id: parentLeadId,
      relationship,
      unit_id: parent.unit_id,
      agent_id: parent.agent_id,
    })
    .select("id, lead_no, full_name, phone, email, lead_source, interest, status, created_at")
    .maybeSingle();

  if (error) {
    // The narrow "agent adds relative of own lead" policy is the usual reason
    // an insert is refused here, so say which rule was hit.
    return {
      error:
        error.code === "42501"
          ? "You can only add family members to leads assigned to you."
          : "Couldn't save this family member. Please try again.",
    };
  }

  if (created) await dispatchWebhook("lead_created", { ...created, source: "relative" });

  revalidatePath("/leads");
  revalidatePath(`/leads/${parentLeadId}`);
  return { error: null, id: created?.id ?? null };
}

// Changes how an existing relative is related, or detaches them entirely.
export async function updateRelationship(leadId: string, value: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You don't have permission to do that." };

  const relationship = pickRelationship(value.trim());
  if (!relationship) return { error: "That isn't a relationship we recognise." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ relationship })
    // The constraint requires a parent for a relationship to mean anything,
    // so this can only ever touch a lead that already has one.
    .eq("id", leadId)
    .not("parent_lead_id", "is", null)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't update the relationship. Please try again." };

  revalidatePath(`/leads/${leadId}`);
  return { error: null };
}
