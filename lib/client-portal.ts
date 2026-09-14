import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { toWaNumber } from "@/lib/landing-public";
import { waitingPeriodsFor, type WaitingPeriodStatus } from "@/lib/waiting-periods";
import {
  hasMedicalBenefit,
  guideKeysFor,
  statusFromCase,
  type PortalGuideKey,
  type PortalStatus,
} from "@/lib/portal-copy";

// Re-exported so server callers can reach them from here, but they are defined
// in portal-copy: the client view needs them too, and that module has no
// server-only import to drag into the browser bundle.
export { PORTAL_STATUSES, PORTAL_STATUS_COPY, statusFromCase, type PortalStatus } from "@/lib/portal-copy";

/**
 * What the client's browser is allowed to know.
 *
 * The token in the URL is the only credential, and links get forwarded, so the
 * payload is built by listing what goes IN rather than by stripping fields out
 * of a case record. Deliberately absent, and to stay absent: IC / ID number,
 * underwriting notes, nominee phone numbers, the agent's own commission or ANC
 * figures, and every other client.
 */
export type PortalPayload = {
  linkId: string;
  status: PortalStatus;
  clientName: string;
  certificateNo: string | null;
  /** The base benefit names the plan -- there is no hardcoded plan label. */
  planName: string | null;
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

/** A revoked link is gone: no payload, no hint about whether it ever existed. */
export async function getPortalPayload(token: string, today: string): Promise<PortalPayload | null> {
  // Service role on purpose: the visitor has no session, and an anon-readable
  // policy on case_submissions would be a far bigger hole than this one query.
  const admin = createAdminClient();

  const { data: link } = await admin
    .from("client_portal_links")
    .select("id, submission_id, display_status, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!link || link.revoked_at) return null;

  const { data: row } = await admin
    .from("case_submissions")
    .select(
      `id, status, plan_name, payment_frequency, installment_contribution, certificate_no, includes_medical_card,
       commencement_date, next_due_date, person_covered_name,
       leads!case_submissions_lead_id_fkey(full_name),
       profiles!case_submissions_agent_id_fkey(full_name, phone),
       case_nominees(name, relationship, percentage, sort_order),
       case_benefits(benefit, sum_covered, sort_order)`,
    )
    .eq("id", link.submission_id)
    .maybeSingle();

  if (!row) return null;

  const lead = row.leads as unknown as { full_name: string } | null;
  const agent = row.profiles as unknown as { full_name: string; phone: string | null } | null;

  const benefitRows = ((row.case_benefits ?? []) as { benefit: string; sum_covered: number | null; sort_order: number }[])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  const benefitNames = benefitRows.map((b) => b.benefit);

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

  const nominees = ((row.case_nominees ?? []) as { name: string; relationship: string | null; percentage: number | null; sort_order: number }[])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((n) => ({ name: n.name, relationship: n.relationship, percentage: n.percentage === null ? null : Number(n.percentage) }));

  const agentName = agent?.full_name ?? "";

  return {
    linkId: link.id,
    status: (link.display_status as PortalStatus | null) ?? statusFromCase(row.status as string),
    // The person covered is who the certificate is about; the lead name is the
    // fallback for older cases filed before that field existed.
    clientName: (row.person_covered_name as string) || lead?.full_name || "",
    certificateNo: (row.certificate_no as string) ?? null,
    planName: benefitRows[0]?.benefit ?? (row.plan_name as string) ?? null,
    benefits: benefitRows.map((b, i) => ({
      name: b.benefit,
      sumCovered: b.sum_covered === null ? null : Number(b.sum_covered),
      isBase: i === 0,
    })),
    contribution: row.installment_contribution === null ? null : Number(row.installment_contribution),
    frequency: row.payment_frequency as string,
    commencementDate: (row.commencement_date as string) ?? null,
    nextDueDate: (row.next_due_date as string) ?? null,
    nominees,
    // Waiting periods only mean something where there is a medical benefit,
    // and they need a commencement date to count from.
    waitingPeriods: medical && row.commencement_date ? waitingPeriodsFor(row.commencement_date as string, today) : [],
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
 * Counts an open. Fire-and-forget from the page: a view counter must never
 * delay the client's page or fail it, and it records nothing identifying --
 * no IP, no user agent. It answers one servicing question, "did they ever
 * look", and nothing else.
 */
export async function recordPortalOpen(linkId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.rpc("bump_portal_open", { link_id: linkId });
  } catch (error) {
    Sentry.captureException(error);
  }
}
