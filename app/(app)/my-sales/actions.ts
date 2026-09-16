"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { buildSchedule, type PaymentFrequency } from "@/lib/contribution-schedule";
import { updateStage } from "@/app/(app)/leads/[id]/actions";
import { createLead } from "@/app/(app)/leads/actions";
import { PORTAL_STATUSES } from "@/lib/client-portal";
import { cleanCategories } from "@/lib/plan-catalogue";
import type { CaseNominee, CaseBenefit } from "./types";

// Stages from which a case may be filed. Submission is the gate the request
// asked for; the two won stages are included because recording a case late,
// against a client already on the books, is a legitimate filing rather than a
// mistake to block.
const SUBMITTABLE_STAGES = ["submission", "closed_won", "servicing"];

/**
 * Regenerates a case's contribution schedule from its commencement date and
 * payment frequency, keeping whatever has already been ticked.
 *
 * Two things can invalidate a schedule: a corrected commencement date, which
 * slides every due date, and a corrected frequency, which changes how many
 * there are. They need different rules for carrying ticks across:
 *
 *  - A due date that still exists keeps its tick. That is the only safe match
 *    when the frequency changed, because "payment #2" means one month in on a
 *    monthly certificate and a whole year in on a yearly one.
 *  - When only the date moved, sequence number is the better match: the client
 *    has paid their first N contributions whatever dates those landed on.
 */
async function rebuildSchedule(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caseId: string,
  commencementDate: string,
  frequency: PaymentFrequency,
  frequencyChanged: boolean,
) {
  const { data: previous } = await supabase
    .from("contribution_schedule")
    .select("seq, due_date, paid, paid_on")
    .eq("submission_id", caseId);

  const ticked = (previous ?? []).filter((p) => p.paid);
  const byDate = new Map(ticked.map((p) => [p.due_date as string, (p.paid_on as string | null) ?? null]));
  const bySeq = new Map(ticked.map((p) => [Number(p.seq), (p.paid_on as string | null) ?? null]));

  await supabase.from("contribution_schedule").delete().eq("submission_id", caseId);

  const rows = buildSchedule(commencementDate, frequency).map((r) => {
    const carried = byDate.has(r.dueDate)
      ? { paid: true, paidOn: byDate.get(r.dueDate) ?? r.dueDate }
      : !frequencyChanged && bySeq.has(r.seq)
        ? { paid: true, paidOn: bySeq.get(r.seq) ?? r.dueDate }
        : { paid: false, paidOn: null };
    return {
      submission_id: caseId,
      seq: r.seq,
      due_date: r.dueDate,
      paid: carried.paid,
      paid_on: carried.paidOn,
    };
  });

  const { error } = await supabase.from("contribution_schedule").insert(rows);
  return { error };
}

export type CaseInput = {
  caseId?: string;
  leadId: string;
  planName: string;
  planType: string | null;
  planCategories: string[];
  paymentFrequency: PaymentFrequency;
  paymentMethod: string | null;
  installmentContribution: number | null;
  sumCovered: number | null;
  proposerName: string | null;
  personCoveredName: string | null;
  idNo: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  religion: string | null;
  isSmoker: boolean | null;
  occupation: string | null;
  notes: string | null;
  nominees: CaseNominee[];
  benefits: CaseBenefit[];
};

function cleanNominees(rows: CaseNominee[]) {
  return rows
    .filter((n) => n.name.trim())
    .map((n, i) => ({
      name: n.name.trim(),
      relationship: n.relationship?.trim() || null,
      phone: n.phone?.trim() || null,
      percentage: n.percentage,
      sort_order: i,
    }));
}

function cleanBenefits(rows: CaseBenefit[]) {
  return rows
    .filter((b) => b.benefit.trim())
    .map((b, i) => ({
      benefit: b.benefit.trim(),
      sum_covered: b.sumCovered,
      installment_contribution: b.installmentContribution,
      cover_start_date: b.coverStartDate || null,
      cover_end_date: b.coverEndDate || null,
      contribution_end_date: b.contributionEndDate || null,
      status: b.status?.trim() || null,
      sort_order: i,
    }));
}

/**
 * Files a new case or edits one already filed. Nominees and benefits are
 * replaced wholesale rather than diffed: they are short lists an agent edits
 * as a block, and a partial sync would be far more code for no visible
 * difference.
 */
export async function saveCase(input: CaseInput) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in.", caseId: null };
  if (!input.planName.trim()) return { error: "Give the plan a name.", caseId: null };

  const supabase = await createClient();

  // RLS would already stop a lead this person can't see, but the stage gate is
  // a business rule and has to be checked here -- the UI disables the button,
  // and a Server Action can be called without it.
  const { data: lead } = await supabase
    .from("leads")
    .select("id, pipeline_stage")
    .eq("id", input.leadId)
    .maybeSingle();
  if (!lead) return { error: "That lead could not be found.", caseId: null };
  if (!SUBMITTABLE_STAGES.includes(lead.pipeline_stage)) {
    return {
      error: "This lead has to reach the Submission stage before a case can be filed against it.",
      caseId: null,
    };
  }

  const row = {
    lead_id: input.leadId,
    plan_name: input.planName.trim(),
    plan_type: input.planType?.trim() || null,
    plan_categories: cleanCategories(input.planCategories),
    payment_frequency: input.paymentFrequency,
    payment_method: input.paymentMethod?.trim() || null,
    installment_contribution: input.installmentContribution,
    sum_covered: input.sumCovered,
    proposer_name: input.proposerName?.trim() || null,
    person_covered_name: input.personCoveredName?.trim() || null,
    id_no: input.idNo?.trim() || null,
    gender: input.gender || null,
    date_of_birth: input.dateOfBirth || null,
    religion: input.religion?.trim() || null,
    is_smoker: input.isSmoker,
    occupation: input.occupation?.trim() || null,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  let caseId = input.caseId ?? null;
  if (caseId) {
    // Read before writing: the schedule has to be rebuilt if the frequency
    // moved, and afterwards there is nothing left to compare against.
    const { data: before } = await supabase
      .from("case_submissions")
      .select("payment_frequency, commencement_date")
      .eq("id", caseId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("case_submissions")
      .update(row)
      .eq("id", caseId)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "Couldn't save this case. Please try again.", caseId: null };

    // A certificate already has its dues laid out. Changing how often the
    // client pays changes every one of them, so the checklist is regenerated
    // rather than left showing a cadence the case no longer has.
    const frequencyChanged = Boolean(before) && before!.payment_frequency !== input.paymentFrequency;
    if (frequencyChanged && before?.commencement_date) {
      const { error: scheduleError } = await rebuildSchedule(
        supabase,
        caseId,
        before.commencement_date as string,
        input.paymentFrequency,
        true,
      );
      if (scheduleError) {
        console.error("saveCase: schedule rebuild failed", scheduleError);
        return {
          error: "The case saved, but its contribution checklist couldn't be rebuilt. Please try again.",
          caseId: null,
        };
      }
    }
  } else {
    const { data, error } = await supabase
      .from("case_submissions")
      .insert({ ...row, agent_id: profile.id })
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "Couldn't file this case. Please try again.", caseId: null };
    caseId = data.id;
  }

  await supabase.from("case_nominees").delete().eq("submission_id", caseId);
  const nominees = cleanNominees(input.nominees);
  if (nominees.length > 0) {
    await supabase.from("case_nominees").insert(nominees.map((n) => ({ ...n, submission_id: caseId })));
  }

  await supabase.from("case_benefits").delete().eq("submission_id", caseId);
  const benefits = cleanBenefits(input.benefits);
  if (benefits.length > 0) {
    await supabase.from("case_benefits").insert(benefits.map((b) => ({ ...b, submission_id: caseId })));
  }

  revalidatePath("/my-sales/submit-case");
  revalidatePath("/my-sales/servicing");
  revalidatePath(`/leads/${input.leadId}`);
  return { error: null, caseId };
}

/**
 * The fresh-case path: a person who isn't in the CRM yet and whose case is
 * being submitted right now.
 *
 * Creates the lead exactly as Lead Manager would -- same action, so the same
 * validation, webhook and ownership rules apply -- and then puts it straight
 * at Submission. That stage move isn't a shortcut: the only reason to use
 * this path is that the case is going to the operator today, and without it
 * saveCase would refuse the very case the agent came here to file.
 */
export async function createLeadForCase(formData: FormData) {
  const result = await createLead(formData);
  if (result.error || !result.lead) {
    return { error: result.error ?? "Couldn't save this lead. Please try again.", lead: null };
  }

  const staged = await updateStage(result.lead.id, "submission", "Submission");
  if (staged.error) {
    // The lead exists and is fine -- say so rather than implying nothing saved.
    return {
      error: `Lead saved, but it couldn't be moved to Submission: ${staged.error}`,
      lead: null,
    };
  }

  revalidatePath("/my-sales/submit-case");
  return { error: null, lead: result.lead };
}

export type CertificateInput = {
  caseId: string;
  certificateNo: string;
  commencementDate: string;
  certificateIssueDate: string | null;
  nextDueDate: string | null;
  lastPaidDate: string | null;
  issuingAgentName: string | null;
  stampDuty: number | null;
  discountType: string | null;
  certificateUnderTrust: boolean;
};

/**
 * The second half of the two-step: underwriting came back, the certificate
 * exists, and the lead becomes a client.
 *
 * Four things happen together and are meant to: the case goes inforce, its
 * contribution schedule is generated from the commencement date the operator
 * actually gave, the lead's closing date is set to that same commencement
 * date, and the lead moves to Servicing. Recording a certificate *is* the
 * close -- leaving the stage to be dragged separately is how a board ends up
 * disagreeing with the certificates behind it.
 *
 * The closing date is the certificate's risk commencement date, not the day
 * this button happened to be clicked -- a case signed weeks ago is very often
 * only entered into the CRM today, and every monthly figure (the dashboard,
 * Statistics, the activity calendar) keys off this date. It is set outright,
 * not just when empty: the certificate is the ground truth once it exists, so
 * a corrected commencement date corrects the closing date with it.
 */
export async function recordCertificate(input: CertificateInput) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  if (!input.certificateNo.trim()) return { error: "Enter the certificate number." };
  if (!input.commencementDate) return { error: "Enter the risk commencement date." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("case_submissions")
    .select("id, lead_id, payment_frequency, status")
    .eq("id", input.caseId)
    .maybeSingle();
  if (!existing) return { error: "That case could not be found." };

  const { data, error } = await supabase
    .from("case_submissions")
    .update({
      status: "inforce",
      certificate_no: input.certificateNo.trim(),
      commencement_date: input.commencementDate,
      certificate_issue_date: input.certificateIssueDate || null,
      next_due_date: input.nextDueDate || null,
      last_paid_date: input.lastPaidDate || null,
      issuing_agent_name: input.issuingAgentName?.trim() || null,
      stamp_duty: input.stampDuty,
      discount_type: input.discountType?.trim() || null,
      certificate_under_trust: input.certificateUnderTrust,
      inforced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.caseId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't record this certificate. Please try again." };

  // The closing date follows the certificate, not the calendar -- the
  // earliest inforce one, since a client can go on to hold more than one
  // certificate and the closing date means when they first became a client,
  // not whichever policy was most recently recorded. Recomputed rather than
  // just written from this certificate so a second, later policy never pushes
  // an existing client's closing date forward, and so correcting a
  // commencement date corrects it too.
  const { data: allCerts } = await supabase
    .from("case_submissions")
    .select("commencement_date")
    .eq("lead_id", existing.lead_id)
    .eq("status", "inforce")
    .not("commencement_date", "is", null);
  const earliestCommencement = (allCerts ?? [])
    .map((c) => c.commencement_date as string)
    .sort()[0];
  if (earliestCommencement) {
    const { error: closedOnError } = await supabase
      .from("leads")
      .update({ closed_on: earliestCommencement })
      .eq("id", existing.lead_id);
    if (closedOnError) {
      console.error("recordCertificate: closed_on update failed", closedOnError);
    }
  }

  // Rebuilt rather than appended to: a corrected commencement date has to move
  // every due date with it, and ticks are keyed by row so regenerating would
  // otherwise silently keep dues that no longer exist.
  const { error: scheduleError } = await rebuildSchedule(
    supabase,
    input.caseId,
    input.commencementDate,
    existing.payment_frequency as PaymentFrequency,
    false,
  );
  if (scheduleError) {
    console.error("recordCertificate: schedule insert failed", scheduleError);
    return { error: "The certificate saved, but its contribution schedule couldn't be built. Please try again." };
  }

  // Straight to Servicing, not Closed Won. A recorded certificate is the
  // moment the job changes from selling to looking after the client, and the
  // Servicing column is what the Servicing page lists -- leaving the lead in
  // Closed Won made the board and that page disagree about the same client.
  // Both stages count as won (WON_STAGES), so no ANC figure moves.
  //
  // Reuses the one stage-change path so the activity log, the "closed" status
  // flag and the outgoing webhook all fire exactly as a manual move would.
  const stageResult = await updateStage(existing.lead_id, "servicing", "Servicing");
  if (stageResult.error) {
    return { error: `Certificate recorded, but the lead couldn't be moved: ${stageResult.error}` };
  }

  revalidatePath("/my-sales/submit-case");
  revalidatePath("/my-sales/servicing");
  revalidatePath(`/leads/${existing.lead_id}`);
  revalidatePath("/pipeline");
  return { error: null };
}

/** Ticks (or unticks) one contribution due. */
export async function setContributionPaid(scheduleId: string, paid: boolean, paidOn: string | null) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contribution_schedule")
    .update({
      paid,
      paid_on: paid ? paidOn : null,
      marked_by: paid ? profile.id : null,
      marked_at: paid ? new Date().toISOString() : null,
    })
    .eq("id", scheduleId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't update that contribution." };

  revalidatePath("/my-sales/servicing");
  return { error: null };
}

export async function setCaseStatus(caseId: string, status: "rejected" | "withdrawn" | "submitted") {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("case_submissions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", caseId)
    .select("id, lead_id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't update this case." };

  revalidatePath("/my-sales/submit-case");
  revalidatePath(`/leads/${data.lead_id}`);
  return { error: null };
}

export async function deleteCase(caseId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  // Nominees, benefits and the schedule all cascade from this row.
  const { data, error } = await supabase
    .from("case_submissions")
    .delete()
    .eq("id", caseId)
    .select("id, lead_id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't delete this case." };

  revalidatePath("/my-sales/submit-case");
  revalidatePath("/my-sales/servicing");
  revalidatePath(`/leads/${data.lead_id}`);
  return { error: null };
}

// --- Client portal links -----------------------------------------------
//
// All three actions go through the caller's own session, not the service
// role, so RLS decides who may touch which link. The policy on
// client_portal_links inherits lead visibility, which means the owning agent
// and every AUM / UM / GM / SuperAdmin above them -- exactly the revoke list
// this was specified with, and not a role list repeated here.

/** Issues a link, replacing any live one on the same case. */
export async function issuePortalLink(submissionId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();

  // A case has at most one live link (a partial unique index enforces it), so
  // re-issuing means closing the old one first. Revoked rather than deleted:
  // "this link was replaced on the 14th" is a question that gets asked.
  await supabase
    .from("client_portal_links")
    .update({ revoked_at: new Date().toISOString(), revoked_by: profile.id })
    .eq("submission_id", submissionId)
    .is("revoked_at", null);

  const { data, error } = await supabase
    .from("client_portal_links")
    .insert({ submission_id: submissionId, created_by: profile.id })
    .select("token")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't create the portal link." };

  revalidatePath("/my-sales/servicing");
  return { error: null, token: data.token as string };
}

/** Closes a link. The client's page becomes the dead end immediately. */
export async function revokePortalLink(linkId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_portal_links")
    .update({ revoked_at: new Date().toISOString(), revoked_by: profile.id })
    .eq("id", linkId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't revoke that link." };

  revalidatePath("/my-sales/servicing");
  return { error: null };
}

/**
 * Sets the status the client sees, or clears the override so it follows the
 * case again. The override exists because a certificate can sit in a state the
 * case record has no word for -- a grace period, a reinstatement in progress --
 * and the person servicing it knows which before the system does.
 */
export async function setPortalStatus(linkId: string, status: string | null) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  if (status !== null && !PORTAL_STATUSES.includes(status as (typeof PORTAL_STATUSES)[number])) {
    return { error: "Unknown status." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_portal_links")
    .update({ display_status: status })
    .eq("id", linkId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't update the status." };

  revalidatePath("/my-sales/servicing");
  return { error: null };
}
