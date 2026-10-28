"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { appOrigin } from "@/lib/app-url";
import {
  FORM_LINK_TTL_DAYS,
  FORM_STAGES,
  MAX_NOMINEES,
  effectiveLinkStatus,
  validateNominees,
  type FormLinkStatus,
  type FormLinkSummary,
  type FormStage,
  type LeadNominee,
  type LeadSignatureView,
  type NomineeInput,
} from "@/lib/lead-form-fields";
import { malaysiaToday } from "@/lib/malaysia-date";

// CRM side of the lead form links: generate, reopen, revoke and list links,
// edit the lead's nominees, and read back the signature. Visibility is the
// lead's own RLS -- every read here goes through the signed-in user's client,
// so anyone who can see the lead can manage its links, and nobody else can.
// The one write that needs the service role (reopening a completed link
// resets a column the user is not granted) is done only after that same
// RLS-scoped read has proven the link is theirs.

const LINK_SELECT =
  "id, lead_id, stage, token, status, created_at, expires_at, revoked_at, first_opened_at, last_opened_at, open_count, submitted_at, profiles!lead_form_links_created_by_fkey(full_name)";

type LinkRow = {
  id: string;
  lead_id: string;
  stage: FormStage;
  token: string;
  status: FormLinkStatus;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  first_opened_at: string | null;
  last_opened_at: string | null;
  open_count: number;
  submitted_at: string | null;
  profiles: { full_name: string } | null;
};

function toSummary(row: LinkRow, origin: string): FormLinkSummary {
  return {
    id: row.id,
    leadId: row.lead_id,
    stage: row.stage,
    status: effectiveLinkStatus(row),
    rawStatus: row.status,
    url: `${origin}/f/${row.token}`,
    createdAt: row.created_at,
    createdByName: row.profiles?.full_name ?? null,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    openCount: row.open_count,
    firstOpenedAt: row.first_opened_at,
    lastOpenedAt: row.last_opened_at,
    submittedAt: row.submitted_at,
  };
}

async function logActivity(leadId: string, actorId: string, content: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: actorId,
    activity_type: "form_link",
    content,
  });
  if (error) console.error("form link: lead_activity insert failed", error);
}

/** Generates a link for the stage. Any still-open link for the same stage is revoked first. */
export async function createFormLink(leadId: string, stage: FormStage) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in.", link: null };
  if (stage !== 1 && stage !== 2) return { error: "Pick a form stage.", link: null };

  const supabase = await createClient();
  // RLS-scoped: null both when the lead doesn't exist and when it isn't theirs.
  const { data: lead } = await supabase.from("leads").select("id").eq("id", leadId).maybeSingle();
  if (!lead) return { error: "That lead could not be found.", link: null };

  // One live link per lead and stage: a second one would leave the first
  // out in a WhatsApp thread with no way to tell which the agent meant.
  const { data: open } = await supabase
    .from("lead_form_links")
    .select("id")
    .eq("lead_id", leadId)
    .eq("stage", stage)
    .is("revoked_at", null)
    .neq("status", "completed");
  if (open && open.length > 0) {
    await supabase
      .from("lead_form_links")
      .update({ revoked_at: new Date().toISOString(), revoked_by: profile.id })
      .in("id", open.map((l) => l.id as string));
  }

  const { data, error } = await supabase
    .from("lead_form_links")
    .insert({ lead_id: leadId, stage, created_by: profile.id })
    .select(LINK_SELECT)
    .single();
  if (error || !data) return { error: "Couldn't create the link.", link: null };

  await logActivity(leadId, profile.id, `Created ${FORM_STAGES[stage].label} form link`);
  revalidatePath(`/leads/${leadId}`);
  return { error: null, link: toSummary(data as unknown as LinkRow, await appOrigin()) };
}

async function loadVisibleLink(linkId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("lead_form_links").select(LINK_SELECT).eq("id", linkId).maybeSingle();
  return (data as unknown as LinkRow | null) ?? null;
}

/**
 * Extends a link by 7 days from now and clears a revocation. A completed link
 * goes back to an editable state so the prospect can amend their answers.
 */
export async function reopenFormLink(linkId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in.", link: null };

  const existing = await loadVisibleLink(linkId);
  if (!existing) return { error: "That link could not be found.", link: null };

  const expiresAt = new Date(Date.now() + FORM_LINK_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const patch: Record<string, unknown> = { expires_at: expiresAt, revoked_at: null, revoked_by: null };
  if (existing.status === "completed") patch.status = existing.open_count > 0 ? "opened" : "sent";

  const { error } = await createAdminClient().from("lead_form_links").update(patch).eq("id", linkId);
  if (error) return { error: "Couldn't reopen the link.", link: null };

  await logActivity(existing.lead_id, profile.id, `Reopened ${FORM_STAGES[existing.stage].label} form link for ${FORM_LINK_TTL_DAYS} days`);
  revalidatePath(`/leads/${existing.lead_id}`);
  const fresh = await loadVisibleLink(linkId);
  return { error: null, link: fresh ? toSummary(fresh, await appOrigin()) : null };
}

export async function revokeFormLink(linkId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const existing = await loadVisibleLink(linkId);
  if (!existing) return { error: "That link could not be found." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_form_links")
    .update({ revoked_at: new Date().toISOString(), revoked_by: profile.id })
    .eq("id", linkId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't revoke the link." };

  await logActivity(existing.lead_id, profile.id, `Revoked ${FORM_STAGES[existing.stage].label} form link`);
  revalidatePath(`/leads/${existing.lead_id}`);
  return { error: null };
}

/** Newest first. Includes revoked / expired / completed so the agent sees the whole history. */
export async function listFormLinks(leadId: string): Promise<FormLinkSummary[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_form_links")
    .select(LINK_SELECT)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  const origin = await appOrigin();
  return ((data ?? []) as unknown as LinkRow[]).map((row) => toSummary(row, origin));
}

// ---- Nominees ---------------------------------------------------------------

const NOMINEE_SELECT = "id, position, name, id_no, relationship, phone, share_percent, date_of_birth";

export async function getLeadNominees(leadId: string): Promise<LeadNominee[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_nominees")
    .select(NOMINEE_SELECT)
    .eq("lead_id", leadId)
    .order("position", { ascending: true });
  return (data ?? []).map((n) => ({
    ...(n as unknown as LeadNominee),
    share_percent: n.share_percent == null ? null : Number(n.share_percent),
  }));
}

/**
 * Adds or replaces the nominee in a slot (1-4). Per-nominee validation only:
 * the shares-add-up-to-100 rule is enforced on the prospect's submission, and
 * an agent is allowed to be part-way through entering a set.
 */
export async function upsertLeadNominee(leadId: string, position: number, nominee: NomineeInput) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  if (!Number.isInteger(position) || position < 1 || position > MAX_NOMINEES) {
    return { error: `A lead can have up to ${MAX_NOMINEES} nominees.` };
  }

  const errors = validateNominees([nominee], malaysiaToday());
  // The single-nominee share check would demand 100%; only field errors apply here.
  const fieldError = Object.entries(errors).find(([k]) => k.startsWith("nominees."));
  if (fieldError) return { error: fieldError[1] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_nominees")
    .upsert(
      {
        lead_id: leadId,
        position,
        name: nominee.name.trim(),
        id_no: nominee.id_no.trim() || null,
        relationship: nominee.relationship.trim() || null,
        phone: nominee.phone.trim() || null,
        share_percent: Number(nominee.share_percent),
        date_of_birth: nominee.date_of_birth?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_id,position" },
    )
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't save that nominee." };

  revalidatePath(`/leads/${leadId}`);
  return { error: null };
}

export async function deleteLeadNominee(leadId: string, nomineeId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_nominees")
    .delete()
    .eq("id", nomineeId)
    .eq("lead_id", leadId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't remove that nominee." };

  revalidatePath(`/leads/${leadId}`);
  return { error: null };
}

// ---- Signature --------------------------------------------------------------

/** The newest signature on the lead, or null. `imageDataUrl` is a PNG data URL. */
export async function getLeadSignature(leadId: string): Promise<LeadSignatureView | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_signatures")
    .select("id, image_data, signed_at, signer_name")
    .eq("lead_id", leadId)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    imageDataUrl: data.image_data as string,
    signedAt: data.signed_at as string,
    signerName: (data.signer_name as string | null) ?? null,
  };
}
