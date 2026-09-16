import { createClient } from "@/lib/supabase/server";
import { WON_STAGES } from "@/lib/pipeline-stages";
import { cleanCategories } from "@/lib/plan-catalogue";
import type { PaymentFrequency } from "@/lib/contribution-schedule";
import type { CaseSubmission, CaseStatus, SubmittableLead, BenefitOption, PortalLink } from "./types";

// Every query here leans on the RLS already written for these tables, which
// inherits lead visibility -- so an agent gets their own book, a manager gets
// their team's, and none of that scoping is repeated in this file.

const CASE_SELECT = `
  id, lead_id, agent_id, status, plan_name, plan_type, plan_categories,
  payment_frequency, payment_method, installment_contribution, sum_covered,
  proposer_name, person_covered_name, id_no, gender, date_of_birth, religion,
  is_smoker, occupation, certificate_no, commencement_date,
  certificate_issue_date, next_due_date, last_paid_date, lapse_date,
  termination_date, issuing_agent_name, currency, stamp_duty, discount_type,
  certificate_under_trust, notes, submitted_at, inforced_at,
  leads!case_submissions_lead_id_fkey(lead_no, full_name, phone, email, pipeline_stage),
  profiles!case_submissions_agent_id_fkey(full_name),
  case_nominees(name, relationship, phone, percentage, sort_order),
  case_benefits(benefit, sum_covered, installment_contribution, cover_start_date, cover_end_date, contribution_end_date, status, sort_order),
  contribution_schedule(id, seq, due_date, paid, paid_on),
  client_portal_links(id, token, display_status, created_at, first_opened_at, last_opened_at, open_count, revoked_at)
`;

type RawCase = Record<string, unknown>;

function toPortalLink(row: Record<string, unknown>): PortalLink {
  return {
    id: row.id as string,
    token: row.token as string,
    displayStatus: (row.display_status as string) ?? null,
    createdAt: row.created_at as string,
    firstOpenedAt: (row.first_opened_at as string) ?? null,
    lastOpenedAt: (row.last_opened_at as string) ?? null,
    openCount: Number(row.open_count ?? 0),
  };
}

function toCase(row: RawCase): CaseSubmission {
  const lead = row.leads as { lead_no: number; full_name: string; phone: string; email: string | null; pipeline_stage: string } | null;
  const agent = row.profiles as { full_name: string } | null;
  const nominees = (row.case_nominees ?? []) as Record<string, unknown>[];
  const benefits = (row.case_benefits ?? []) as Record<string, unknown>[];
  const schedule = (row.contribution_schedule ?? []) as Record<string, unknown>[];
  // A case has at most one live link; revoked rows are kept for the audit
  // trail, so the live one is the row with no revoked_at.
  const portal = ((row.client_portal_links ?? []) as Record<string, unknown>[]).find((l) => !l.revoked_at);
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    leadNo: lead?.lead_no ?? 0,
    leadName: lead?.full_name ?? "Unknown lead",
    leadPhone: lead?.phone ?? null,
    leadEmail: lead?.email ?? null,
    leadStage: lead?.pipeline_stage ?? "",
    agentName: agent?.full_name ?? null,
    status: row.status as CaseStatus,

    planName: row.plan_name as string,
    planType: (row.plan_type as string) ?? null,
    planCategories: cleanCategories(row.plan_categories as string[] | null),
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

    portalLink: portal ? toPortalLink(portal) : null,

    nominees: nominees
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((n) => ({
        name: n.name as string,
        relationship: (n.relationship as string) ?? null,
        phone: (n.phone as string) ?? null,
        percentage: num(n.percentage),
      })),
    benefits: benefits
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((b) => ({
        benefit: b.benefit as string,
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
    supabase.from("case_submissions").select("lead_id, status"),
  ]);

  const caseCounts = new Map<string, number>();
  // A lead whose case came back inforce is finished with this page: the
  // submission succeeded and the work moves to Servicing.
  const settled = new Set<string>();
  for (const c of cases ?? []) {
    const row = c as { lead_id: string; status: string };
    caseCounts.set(row.lead_id, (caseCounts.get(row.lead_id) ?? 0) + 1);
    if (row.status === "inforce") settled.add(row.lead_id);
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
      inforced: settled.has(row.id),
      // Submission is the gate, and everything past it too: a case recorded
      // late against an already-inforced client is still a legitimate filing.
      // Once one of those cases is inforce the submission has succeeded, and
      // the lead belongs to Servicing rather than this queue.
      canSubmit:
        ["submission", "closed_won", "servicing"].includes(row.pipeline_stage) && !settled.has(row.id),
    };
  });
}

/**
 * The benefits offered in the case form's dropdown, newest configuration
 * first-class: this is maintained in Settings, not in code.
 *
 * `activeOnly` is the default because the form should only offer what is
 * currently sold; Settings asks for everything so a retired benefit can be
 * brought back rather than retyped.
 */
export async function getBenefitOptions(activeOnly = true): Promise<BenefitOption[]> {
  const supabase = await createClient();
  let query = supabase
    .from("benefit_catalogue")
    .select("id, name, default_sum_covered, description, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (activeOnly) query = query.eq("is_active", true);

  const { data } = await query;
  return (data ?? []).map((b) => ({
    id: b.id as string,
    name: b.name as string,
    defaultSumCovered: b.default_sum_covered == null ? null : Number(b.default_sum_covered),
    description: (b.description as string) ?? null,
    isActive: b.is_active as boolean,
    sortOrder: Number(b.sort_order),
  }));
}
