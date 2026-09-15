import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { toWaNumber } from "@/lib/landing-public";
import { waitingPeriodsFor, type WaitingPeriodStatus } from "@/lib/waiting-periods";
import { hasMedicalBenefit, guideKeysFor, statusFromCase, planCategoryFor, type PortalGuideKey, type PortalStatus, type PlanCategory } from "@/lib/portal-copy";

// Re-exported so server callers can reach them from here, but they are defined
// in portal-copy: the client view needs them too, and that module has no
// server-only import to drag into the browser bundle.
export { PORTAL_STATUSES, PORTAL_STATUS_COPY, statusFromCase, type PortalStatus } from "@/lib/portal-copy";

/**
 * What the client's browser is allowed to know about ONE certificate.
 *
 * A logged-in session is the only credential now, but the same rule that
 * governed the old bearer token still applies: the payload is built by
 * listing what goes IN rather than by stripping fields out of a case record.
 * Deliberately absent, and to stay absent: IC / ID number, underwriting
 * notes, nominee phone numbers, the agent's own commission or ANC figures,
 * and every other client -- including every other client who happens to
 * share this one's NRIC.
 */
export type PortalPayload = {
  caseId: string;
  linkId: string;
  status: PortalStatus;
  clientName: string;
  certificateNo: string | null;
  /** The base benefit names the plan -- there is no hardcoded plan label. */
  planName: string | null;
  /** Read off the same base benefit that names the plan, so the two can never disagree. */
  planCategory: PlanCategory;
  benefits: PortalBenefit[];
  contribution: number | null;
  frequency: string;
  commencementDate: string | null;
  nextDueDate: string | null;
  nominees: PortalNominee[];
  /** Empty unless the certificate carries a medical benefit. */
  waitingPeriods: WaitingPeriodStatus[];
  hasMedical: boolean;
  guideKeys: PortalGuideKey[];
  agent: { name: string; initials: string; waNumber: string };
};

export type PortalBenefit = {
  name: string;
  sumCovered: number | null;
  /** True for the first benefit on the certificate: the one that names the plan. */
  isBase: boolean;
};

/** Name and share only. No phone number, no IC -- see the note above. */
export type PortalNominee = {
  name: string;
  relationship: string | null;
  percentage: number | null;
};

const CASE_SELECT = `id, status, plan_name, payment_frequency, installment_contribution, certificate_no,
       includes_medical_card, commencement_date, next_due_date, person_covered_name, id_no,
       leads!case_submissions_lead_id_fkey(full_name, email, phone),
       profiles!case_submissions_agent_id_fkey(full_name, phone),
       case_nominees(name, relationship, percentage, sort_order),
       case_benefits(benefit, sum_covered, sort_order)`;

type CaseRow = {
  id: string;
  status: string;
  plan_name: string | null;
  payment_frequency: string;
  installment_contribution: number | null;
  certificate_no: string | null;
  includes_medical_card: boolean | null;
  commencement_date: string | null;
  next_due_date: string | null;
  person_covered_name: string | null;
  id_no: string | null;
  leads: { full_name: string; email: string | null; phone: string | null } | null;
  profiles: { full_name: string; phone: string | null } | null;
  case_nominees: { name: string; relationship: string | null; percentage: number | null; sort_order: number }[];
  case_benefits: { benefit: string; sum_covered: number | null; sort_order: number }[];
};

type LinkRow = { id: string; display_status: string | null; revoked_at: string | null };

function buildPayload(row: CaseRow, link: LinkRow, today: string): PortalPayload {
  const lead = row.leads;
  const agent = row.profiles;

  const benefitRows = (row.case_benefits ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const benefitNames = benefitRows.map((b) => b.benefit);
  const baseBenefit = benefitRows[0]?.benefit ?? null;

  // Two ways a certificate counts as medical, and either is enough:
  //
  //   * it carries a catalogue benefit named in MEDICAL_BENEFITS, or
  //   * the agent ticked "includes medical card cover" on the case.
  //
  // The flag is what the Servicing page already keys its own waiting-period
  // panel off, so honouring it here keeps the two screens from disagreeing --
  // and it is the escape hatch for a medical product nobody has added to the
  // mapping yet.
  const medical = hasMedicalBenefit(benefitNames) || Boolean(row.includes_medical_card);

  const nominees = (row.case_nominees ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((n) => ({ name: n.name, relationship: n.relationship, percentage: n.percentage === null ? null : Number(n.percentage) }));

  const agentName = agent?.full_name ?? "";

  return {
    caseId: row.id,
    linkId: link.id,
    status: (link.display_status as PortalStatus | null) ?? statusFromCase(row.status),
    // The person covered is who the certificate is about; the lead name is the
    // fallback for older cases filed before that field existed.
    clientName: row.person_covered_name || lead?.full_name || "",
    certificateNo: row.certificate_no,
    planName: baseBenefit ?? row.plan_name,
    planCategory: planCategoryFor(baseBenefit),
    benefits: benefitRows.map((b, i) => ({
      name: b.benefit,
      sumCovered: b.sum_covered === null ? null : Number(b.sum_covered),
      isBase: i === 0,
    })),
    contribution: row.installment_contribution === null ? null : Number(row.installment_contribution),
    frequency: row.payment_frequency,
    commencementDate: row.commencement_date,
    nextDueDate: row.next_due_date,
    nominees,
    // Waiting periods only mean something where there is a medical benefit,
    // and they need a commencement date to count from.
    waitingPeriods: medical && row.commencement_date ? waitingPeriodsFor(row.commencement_date, today) : [],
    hasMedical: medical,
    guideKeys: guideKeysFor(benefitNames, medical),
    agent: {
      name: agentName,
      initials: initialsOf(agentName),
      waNumber: toWaNumber(agent?.phone ?? null),
    },
  };
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PL";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Everything the login step needs about the one certificate a link points to,
 * and nothing that goes further than that: what the visitor has to prove
 * (last 4 of the NRIC, plus the lead's own email or phone) to be let in.
 */
export type PortalAnchor = {
  linkId: string;
  caseId: string;
  idNo: string | null;
  leadEmail: string | null;
  leadPhone: string | null;
};

/** A revoked or unknown token resolves to nothing -- no hint either way. */
export async function resolvePortalAnchor(token: string): Promise<PortalAnchor | null> {
  const admin = createAdminClient();

  const { data: link } = await admin
    .from("client_portal_links")
    .select("id, submission_id, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!link || link.revoked_at) return null;

  const { data: row } = await admin
    .from("case_submissions")
    .select("id, id_no, leads!case_submissions_lead_id_fkey(email, phone)")
    .eq("id", link.submission_id)
    .maybeSingle();

  if (!row) return null;
  const lead = row.leads as unknown as { email: string | null; phone: string | null } | null;

  return {
    linkId: link.id,
    caseId: row.id as string,
    idNo: (row.id_no as string) || null,
    leadEmail: lead?.email ?? null,
    leadPhone: lead?.phone ?? null,
  };
}

/**
 * Does what the visitor typed prove they are this certificate's client?
 *
 * Checked against the ONE certificate the link points to, never against a
 * system-wide search: the token already scopes who could possibly be asking,
 * so there is no "try this NRIC against every case" step for an attacker to
 * lean on. A match here is what earns the session -- every OTHER certificate
 * sharing the same full NRIC is looked up afterwards, from the database, not
 * from anything the browser supplied.
 */
export function matchesIdentity(anchor: PortalAnchor, emailOrPhone: string, last4: string): boolean {
  const nricDigits = (anchor.idNo ?? "").replace(/\D/g, "");
  const typedLast4 = last4.trim();
  if (nricDigits.length < 4 || typedLast4.length !== 4 || nricDigits.slice(-4) !== typedLast4) return false;

  const typed = emailOrPhone.trim().toLowerCase();
  if (!typed) return false;

  if (anchor.leadEmail && typed === anchor.leadEmail.trim().toLowerCase()) return true;

  const typedPhone = toWaNumber(emailOrPhone);
  const leadPhone = toWaNumber(anchor.leadPhone);
  if (typedPhone && leadPhone && typedPhone === leadPhone) return true;

  return false;
}

/**
 * Every certificate presently visible to a verified NRIC: every case sharing
 * that exact id_no with a live (non-revoked) portal link. Revoking any one of
 * them takes effect the moment this next runs -- there is no cached list and
 * no per-certificate re-authentication, because access was never encoded in
 * the session, only identity was.
 */
export async function getPortalCertificates(idNo: string, today: string): Promise<PortalPayload[]> {
  const admin = createAdminClient();

  // `!inner` plus a filter on the embedded table's own column turns this into
  // a real inner join: a case with no live link, or none at all, drops out of
  // the result entirely rather than coming back with a null link.
  const { data, error } = await admin
    .from("case_submissions")
    .select(`${CASE_SELECT}, client_portal_links!inner(id, display_status, revoked_at)`)
    .eq("id_no", idNo)
    .filter("client_portal_links.revoked_at", "is", null)
    .order("commencement_date", { ascending: false, nullsFirst: false });

  if (error || !data) {
    if (error) Sentry.captureException(error, { tags: { fn: "getPortalCertificates" } });
    return [];
  }

  return (data as unknown as (CaseRow & { client_portal_links: LinkRow[] })[]).map((row) =>
    buildPayload(row, row.client_portal_links[0], today),
  );
}

/**
 * Counts an open, once per certificate shown. Fire-and-forget: a view counter
 * must never delay or break the client's page, and it records nothing
 * identifying -- no IP, no user agent. It answers one servicing question,
 * "did they ever look", and nothing else.
 */
export async function recordPortalOpens(linkIds: string[]): Promise<void> {
  if (linkIds.length === 0) return;
  try {
    const admin = createAdminClient();
    await Promise.all(linkIds.map((linkId) => admin.rpc("bump_portal_open", { link_id: linkId })));
  } catch (error) {
    Sentry.captureException(error);
  }
}
