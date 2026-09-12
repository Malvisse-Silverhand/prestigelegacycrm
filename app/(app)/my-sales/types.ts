import type { PaymentFrequency } from "@/lib/contribution-schedule";

export type CaseStatus = "submitted" | "inforce" | "rejected" | "withdrawn";

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  submitted: "Awaiting underwriting",
  inforce: "Inforce",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const CASE_STATUS_TONE: Record<CaseStatus, string> = {
  submitted: "bg-warn-gold-bg text-warn-gold-text",
  inforce: "bg-success-bg text-green",
  rejected: "bg-alert-red-bg text-alert-red",
  withdrawn: "bg-sand-2 text-taupe-2",
};

export type CaseNominee = {
  name: string;
  relationship: string | null;
  percentage: number | null;
};

export type CaseBenefit = {
  benefit: string;
  term: number | null;
  sumCovered: number | null;
  installmentContribution: number | null;
  coverStartDate: string | null;
  coverEndDate: string | null;
  contributionEndDate: string | null;
  status: string | null;
};

export type ScheduleEntry = {
  id: string;
  seq: number;
  dueDate: string;
  paid: boolean;
  paidOn: string | null;
};

export type CaseSubmission = {
  id: string;
  leadId: string;
  leadNo: number;
  leadName: string;
  leadStage: string;
  agentName: string | null;
  status: CaseStatus;

  // Filed at submission
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

  // Filled when underwriting returns
  certificateNo: string | null;
  commencementDate: string | null;
  certificateIssueDate: string | null;
  nextDueDate: string | null;
  lastPaidDate: string | null;
  lapseDate: string | null;
  terminationDate: string | null;
  issuingAgentName: string | null;
  currency: string;
  stampDuty: number | null;
  discountType: string | null;
  certificateUnderTrust: boolean;

  notes: string | null;
  submittedAt: string;
  inforcedAt: string | null;

  nominees: CaseNominee[];
  benefits: CaseBenefit[];
  schedule: ScheduleEntry[];
};

/** A lead as it appears in the Submit Case picker. */
export type SubmittableLead = {
  id: string;
  leadNo: number;
  fullName: string;
  phone: string;
  stage: string;
  agentName: string | null;
  interest: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  isSmoker: boolean | null;
  occupation: string | null;
  caseCount: number;
  /** Only leads that have reached Submission can have a case filed. */
  canSubmit: boolean;
};

// Age at entry is derived, never stored: it is a function of two dates the
// certificate already carries, and storing it would let the two disagree.
export function ageAtEntry(dateOfBirth: string | null, commencementDate: string | null): number | null {
  if (!dateOfBirth || !commencementDate) return null;
  const [by, bm, bd] = dateOfBirth.split("-").map(Number);
  const [cy, cm, cd] = commencementDate.split("-").map(Number);
  let age = cy - by;
  if (cm < bm || (cm === bm && cd < bd)) age--;
  return age >= 0 ? age : null;
}
