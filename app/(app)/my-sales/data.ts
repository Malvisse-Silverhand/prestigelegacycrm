import { createClient } from "@/lib/supabase/server";
import { WON_STAGES } from "@/lib/pipeline-stages";
import type { PaymentFrequency } from "@/lib/contribution-schedule";
import type { CaseSubmission, CaseStatus, SubmittableLead } from "./types";

// Every query here leans on the RLS already written for these tables, which
// inherits lead visibility -- so an agent gets their own book, a manager gets
// their team's, and none of that scoping is repeated in this file.

const CASE_SELECT = `
  id, lead_id, agent_id, status, plan_name, plan_type, includes_medical_card,
  payment_frequency, payment_method, installment_contribution, sum_covered,
  proposer_name, person_covered_name, id_no, gender, date_of_birth, religion,
  is_smoker, occupation, certificate_no, commencement_date,
  certificate_issue_date, next_due_date, last_paid_date, lapse_date,
  termination_date, issuing_agent_name, currency, stamp_duty, discount_type,
  certificate_under_trust, notes, submitted_at, inforced_at,
  leads!case_submissions_lead_id_fkey(lead_no, full_name, pipeline_stage),
  profiles!case_submissions_agent_id_fkey(full_name),
  case_nominees(name, relationship, percentage, sort_order),
  case_benefits(benefit, term, sum_covered, installment_contribution, cover_start_date, cover_end_date, contribution_end_date, status, sort_order),
  contribution_schedule(id, seq, due_date, paid, paid_on)
`;

type RawCase = Record<string, unknown>;

function toCase(row: RawCase): CaseSubmission {
  const lead = row.leads as { lead_no: number; full_name: string; pipeline_stage: string } | null;
  const agent = row.profiles as { full_name: string } | null;
  const nominees = (row.case_nominees ?? []) as Record<string, unknown>[];
  const benefits = (row.case_benefits ?? []) as Record<string, unknown>[];
  const schedule = (row.contribution_schedule ?? []) as Record<string, unknown>[];
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    leadNo: lead?.lead_no ?? 0,
    leadName: lead?.full_name ?? "Unknown lead",
    leadStage: lead?.pipeline_stage ?? "",
    agentName: agent?.full_name ?? null,
    status: row.status as CaseStatus,

    planName: row.plan_name as string,
    planType: (row.plan_type as string) ?? null,
    includesMedicalCard: Boolean(row.includes_medical_card),
    paymentFrequency: row.payment_frequency as PaymentFrequency,
    paymentMethod: (row.payment_method as string) ?? null,
    installmentContribution: num(row.installment_contribution),
    sumCovered: num(row.sum_covered),
    proposerName: (row.proposer_name as string) ?? null,
    personCoveredName: (row.person_covered_name as string) ?? null,
    idNo: (row.id_no as string) ?? null,
    gender: (row.gender as string) ?? null,
    dateOfBirth: (row.date_of_birth as string) ?? null,
    religion: (row.religion as string) ?? null,
    isSmoker: row.is_smoker === null || row.is_smoker === undefined ? null : Boolean(row.is_smoker),
    occupation: (row.occupation as string) ?? null,

    certificateNo: (row.certificate_no as string) ?? null,
    commencementDate: (row.commencement_date as string) ?? null,
    certificateIssueDate: (row.certificate_issue_date as string) ?? null,
    nextDueDate: (row.next_due_date as string) ?? null,
    lastPaidDate: (row.last_paid_date as string) ?? null,
    lapseDate: (row.lapse_date as string) ?? null,
    terminationDate: (row.termination_date as string) ?? null,
    issuingAgentName: (row.issuing_agent_name as string) ?? null,
    currency: (row.currency as string) ?? "Ringgit (Malaysia)",
    stampDuty: num(row.stamp_duty),
    discountType: (row.discount_type as string) ?? null,
    certificateUnderTrust: Boolean(row.certificate_under_trust),

    notes: (row.notes as string) ?? null,
    submittedAt: row.submitted_at as string,
    inforcedAt: (row.inforced_at as string) ?? null,

    nominees: nominees
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((n) => ({
        name: n.name as string,
        relationship: (n.relationship as string) ?? null,
        percentage: num(n.percentage),
      })),
    benefits: benefits
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((b) => ({
        benefit: b.benefit as string,
        term: b.term === null || b.term === undefined ? null : Number(b.term),
        sumCovered: num(b.sum_covered),
        installmentContribution: num(b.installment_contribution),
        coverStartDate: (b.cover_start_date as string) ?? null,
        coverEndDate: (b.cover_end_date as string) ?? null,
        contributionEndDate: (b.contribution_end_date as string) ?? null,
        status: (b.status as string) ?? null,
      })),
    schedule: schedule
      .sort((a, b) => Number(a.seq) - Number(b.seq))
      .map((s) => ({
        id: s.id as string,
        seq: Number(s.seq),
        dueDate: s.due_date as string,
        paid: Boolean(s.paid),
        paidOn: (s.paid_on as string) ?? null,
      })),
  };
}

/** Every case in scope, newest first. Powers the Submit Case worklist. */
export async function getCases(): Promise<CaseSubmission[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_submissions")
    .select(CASE_SELECT)
    .order("submitted_at", { ascending: false });
  return (data ?? []).map((r) => toCase(r as RawCase));
}

/** The cases filed against one lead -- what Lead Detail's second tab shows. */
export async function getCasesForLead(leadId: string): Promise<CaseSubmission[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_submissions")
    .select(CASE_SELECT)
    .eq("lead_id", leadId)
    .order("submitted_at", { ascending: false });
  return (data ?? []).map((r) => toCase(r as RawCase));
}

/**
 * Inforce certificates belonging to clients already won. Servicing is about
 * looking after people who bought, so a case still awaiting underwriting has
 * no business here even though its lead may already have moved on.
 */
export async function getServicingCases(): Promise<CaseSubmission[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_submissions")
    .select(CASE_SELECT)
    .eq("status", "inforce")
    .order("commencement_date", { ascending: false });

  return (data ?? [])
    .map((r) => toCase(r as RawCase))
    .filter((c) => WON_STAGES.includes(c.leadStage));
}

/**
 * Leads that can be picked in Submit Case. Every lead is fetchable -- an agent
 * looking for someone shouldn't have to guess which list they are on -- but
 * only those that have reached Submission can actually have a case filed,
 * which `canSubmit` says outright rather than leaving the button to explain.
 */
export async function getSubmittableLeads(): Promise<SubmittableLead[]> {
  const supabase = await createClient();
  const [{ data: leads }, { data: cases }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        // The last four are only here to prefill the case form: the same
        // person's details, already typed once on the lead.
        "id, lead_no, full_name, phone, pipeline_stage, interest, date_of_birth, gender, is_smoker, occupation, profiles!leads_agent_id_fkey(full_name)",
      )
      .order("lead_no", { ascending: false }),
    supabase.from("case_submissions").select("lead_id"),
  ]);

  const caseCounts = new Map<string, number>();
  for (const c of cases ?? []) {
    const id = (c as { lead_id: string }).lead_id;
    caseCounts.set(id, (caseCounts.get(id) ?? 0) + 1);
  }

  return (leads ?? []).map((l) => {
    const row = l as unknown as {
      id: string;
      lead_no: number;
      full_name: string;
      phone: string;
      pipeline_stage: string;
      interest: string | null;
      date_of_birth: string | null;
      gender: string | null;
      is_smoker: boolean | null;
      occupation: string | null;
      profiles: { full_name: string } | null;
    };
    return {
      id: row.id,
      leadNo: row.lead_no,
      fullName: row.full_name,
      phone: row.phone,
      stage: row.pipeline_stage,
      agentName: row.profiles?.full_name ?? null,
      interest: row.interest,
      dateOfBirth: row.date_of_birth,
      gender: row.gender,
      isSmoker: row.is_smoker,
      occupation: row.occupation,
      caseCount: caseCounts.get(row.id) ?? 0,
      // Submission is the gate, and everything past it too: a case recorded
      // late against an already-inforced client is still a legitimate filing.
      canSubmit: ["submission", "closed_won", "servicing"].includes(row.pipeline_stage),
    };
  });
}
