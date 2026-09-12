"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { buildSchedule, type PaymentFrequency } from "@/lib/contribution-schedule";
import { updateStage } from "@/app/(app)/leads/[id]/actions";
import type { CaseNominee, CaseBenefit } from "./types";

// Stages from which a case may be filed. Submission is the gate the request
// asked for; the two won stages are included because recording a case late,
// against a client already on the books, is a legitimate filing rather than a
// mistake to block.
const SUBMITTABLE_STAGES = ["submission", "closed_won", "servicing"];

export type CaseInput = {
  caseId?: string;
  leadId: string;
  planName: string;
  planType: string | null;
  includesMedicalCard: boolean;
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
      percentage: n.percentage,
      sort_order: i,
    }));
}

function cleanBenefits(rows: CaseBenefit[]) {
  return rows
    .filter((b) => b.benefit.trim())
    .map((b, i) => ({
      benefit: b.benefit.trim(),
      term: b.term,
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
    includes_medical_card: input.includesMedicalCard,
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
    const { data, error } = await supabase
      .from("case_submissions")
      .update(row)
      .eq("id", caseId)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "Couldn't save this case. Please try again.", caseId: null };
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
 * Three things happen together and are meant to: the case goes inforce, its
 * contribution schedule is generated from the commencement date the operator
 * actually gave, and the lead moves to Closed Won/Policy Inforced. Recording
 * a certificate *is* the close -- leaving the stage to be dragged separately
 * is how a board ends up disagreeing with the certificates behind it.
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

  // Rebuilt rather than appended to: a corrected commencement date has to move
  // every due date with it, and ticks are keyed by row so regenerating would
  // otherwise silently keep dues that no longer exist. Existing ticks are
  // carried across by sequence number, which is stable under a date change.
  const { data: previous } = await supabase
    .from("contribution_schedule")
    .select("seq, paid, paid_on")
    .eq("submission_id", input.caseId);
  const wasPaid = new Map(
    (previous ?? []).map((p) => [Number(p.seq), { paid: Boolean(p.paid), paidOn: p.paid_on as string | null }]),
  );

  await supabase.from("contribution_schedule").delete().eq("submission_id", input.caseId);
  const rows = buildSchedule(input.commencementDate, existing.payment_frequency as PaymentFrequency).map((r) => ({
    submission_id: input.caseId,
    seq: r.seq,
    due_date: r.dueDate,
    paid: wasPaid.get(r.seq)?.paid ?? false,
    paid_on: wasPaid.get(r.seq)?.paidOn ?? null,
  }));
  const { error: scheduleError } = await supabase.from("contribution_schedule").insert(rows);
  if (scheduleError) {
    console.error("recordCertificate: schedule insert failed", scheduleError);
    return { error: "The certificate saved, but its contribution schedule couldn't be built. Please try again." };
  }

  // Reuses the one stage-change path so the activity log, the "closed" status
  // flag and the outgoing webhook all fire exactly as a manual move would.
  const stageResult = await updateStage(existing.lead_id, "closed_won", "Closed Won/Policy Inforced");
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
