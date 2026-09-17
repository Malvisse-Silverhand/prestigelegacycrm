import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { toWaNumber } from "@/lib/landing-public";
import { waitingPeriodsFor, type WaitingPeriodStatus } from "@/lib/waiting-periods";
import { hasMedicalBenefit, guideKeysFor, statusFromCase, planCategoryFor, type PortalGuideKey, type PortalStatus, type PlanCategory } from "@/lib/portal-copy";
import { cleanCategories } from "@/lib/plan-catalogue";
import { contestableStatus, type ContestableStatus } from "@/lib/portal-guides";

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
  /** Null for a certificate the agent has not issued a link for yet -- it is
   *  still this client's certificate, and still theirs to see. */
  linkId: string | null;
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
  /** Every contribution already due and still unticked, oldest first. Empty
   *  means nothing is outstanding -- the portal says so in as many words. */
  amountsDue: PortalDue[];
  /** What those rows add up to. 0 when the list is empty. */
  totalDue: number;
  nominees: PortalNominee[];
  /** Empty unless the certificate carries a medical benefit. */
  waitingPeriods: WaitingPeriodStatus[];
  hasMedical: boolean;
  /** Life/hibah cover, which is what makes the contestable window apply. */
  isLife: boolean;
  /** Null unless this is life/hibah cover with a commencement date. */
  contestable: ContestableStatus | null;
  /** What the agent tagged this certificate as carrying, where they have. */
  planCategories: string[];
  guideKeys: PortalGuideKey[];
  agent: { name: string; initials: string; waNumber: string };
};

export type PortalBenefit = {
  name: string;
  sumCovered: number | null;
  /** True for the first benefit on the certificate: the one that names the plan. */
  isBase: boolean;
};

/** One contribution that has fallen due and has not been ticked off. */
export type PortalDue = { dueDate: string; amount: number | null };

/** Name and share only. No phone number, no IC -- see the note above. */
export type PortalNominee = {
  name: string;
  relationship: string | null;
  percentage: number | null;
};

const CASE_SELECT = `id, status, plan_name, payment_frequency, installment_contribution, certificate_no,
       plan_categories, commencement_date, next_due_date, person_covered_name, id_no,
       leads!case_submissions_lead_id_fkey(full_name, email, phone),
       profiles!case_submissions_agent_id_fkey(full_name, phone),
       case_nominees(name, relationship, percentage, sort_order),
       case_benefits(benefit, sum_covered, sort_order),
       contribution_schedule(seq, due_date, paid)`;

/**
 * The same columns with `leads` joined INNER.
 *
 * This distinction is load-bearing, not cosmetic. PostgREST treats a filter
 * on an embedded column as a filter on the EMBED unless the embed is
 * `!inner` -- so with a plain embed, `leads.email=eq.x` returns every parent
 * row and merely nulls the lead on the ones that do not match. That is
 * exactly how one client came to see four clients' certificates. Any query
 * that filters on a `leads.*` column must use this select.
 */
const CASE_SELECT_INNER = CASE_SELECT.replace(
  "leads!case_submissions_lead_id_fkey(",
  "leads!case_submissions_lead_id_fkey!inner(",
);

type CaseRow = {
  id: string;
  status: string;
  plan_name: string | null;
  payment_frequency: string;
  installment_contribution: number | null;
  certificate_no: string | null;
  plan_categories: string[] | null;
  commencement_date: string | null;
  next_due_date: string | null;
  person_covered_name: string | null;
  id_no: string | null;
  leads: { full_name: string; email: string | null; phone: string | null } | null;
  profiles: { full_name: string; phone: string | null } | null;
  case_nominees: { name: string; relationship: string | null; percentage: number | null; sort_order: number }[];
  case_benefits: { benefit: string; sum_covered: number | null; sort_order: number }[];
  contribution_schedule: { seq: number; due_date: string; paid: boolean }[];
};

type LinkRow = { id: string; display_status: string | null; revoked_at: string | null };

function buildPayload(row: CaseRow, link: LinkRow | null, today: string): PortalPayload {
  const lead = row.leads;
  const agent = row.profiles;

  const benefitRows = (row.case_benefits ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const benefitNames = benefitRows.map((b) => b.benefit);
  const baseBenefit = benefitRows[0]?.benefit ?? null;

  // One name for the per-contribution figure: the card shows it, and every
  // outstanding row is a multiple of it.
  const installment = row.installment_contribution === null ? null : Number(row.installment_contribution);

  // Two sources, and either is enough. `plan_categories` is what the agent
  // said THIS certificate carries; the benefit-name mapping is what a plan
  // usually is, and covers every case filed before the tags existed. The
  // Servicing page keys its own waiting-period panel off the same tags, so
  // the two screens cannot disagree about what a certificate is.
  const tagged = cleanCategories(row.plan_categories);
  const medical = tagged.includes("medical_card") || hasMedicalBenefit(benefitNames);
  const isLife = tagged.includes("hibah") || planCategoryFor(baseBenefit) === "hibah";

  const nominees = (row.case_nominees ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((n) => ({ name: n.name, relationship: n.relationship, percentage: n.percentage === null ? null : Number(n.percentage) }));

  const amountsDue = (row.contribution_schedule ?? [])
    .filter((r) => !r.paid && r.due_date <= today)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .map((r) => ({ dueDate: r.due_date, amount: installment }));
  const totalDue = amountsDue.reduce((sum, d) => sum + (d.amount ?? 0), 0);

  const agentName = agent?.full_name ?? "";

  return {
    caseId: row.id,
    linkId: link?.id ?? null,
    status: (link?.display_status as PortalStatus | null) ?? statusFromCase(row.status),
    // The person covered is who the certificate is about; the lead name is the
    // fallback for older cases filed before that field existed.
    clientName: row.person_covered_name || lead?.full_name || "",
    certificateNo: row.certificate_no,
    planName: baseBenefit ?? row.plan_name,
    // The badge follows the agent's tags where they exist, and the base
    // benefit only where they do not.
    planCategory: tagged.includes("medical_card")
      ? "medical"
      : tagged.includes("hibah")
        ? "hibah"
        : planCategoryFor(baseBenefit),
    planCategories: tagged,
    benefits: benefitRows.map((b, i) => ({
      name: b.benefit,
      sumCovered: b.sum_covered === null ? null : Number(b.sum_covered),
      isBase: i === 0,
    })),
    contribution: installment,
    frequency: row.payment_frequency,
    commencementDate: row.commencement_date,
    nextDueDate: row.next_due_date,
    amountsDue,
    totalDue,
    nominees,
    // Waiting periods only mean something where there is a medical benefit,
    // and they need a commencement date to count from.
    waitingPeriods: medical && row.commencement_date ? waitingPeriodsFor(row.commencement_date, today) : [],
    hasMedical: medical,
    guideKeys: guideKeysFor(benefitNames, medical),
    isLife,
    // The one date in the guides that is personal: when this certificate
    // stops being contestable. Resolved here, server-side, against the same
    // `today` every other date on the page is.
    contestable: isLife && row.commencement_date ? contestableStatus(row.commencement_date, today) : null,
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
 * Every certificate belonging to the identity that just logged in.
 *
 * ONE key decides the grouping, never a union of two:
 *
 *   * the NRIC, whenever the certificate they logged in against has one --
 *     it is the only identifier that actually identifies a person; or
 *   * the lead's email, but ONLY as a fallback for a certificate filed with
 *     no NRIC on it at all.
 *
 * It used to run both and merge the results, which leaked: `leads` is a
 * LEFT-JOIN embed, so `leads.email=eq.x` never restricted which parent rows
 * came back -- it only nulled out the embedded lead on the rows that did not
 * match. The email branch therefore returned every case with a live portal
 * link, belonging to anyone. Both queries here now filter on a column of
 * `case_submissions` itself, or on an embed marked `!inner`, which is what
 * makes a filter on an embedded column actually exclude parent rows.
 *
 * Revoking a link still takes effect on the very next render: access was
 * never encoded in the session, only identity was.
 */
export async function getPortalCertificates(
  identity: { idNo: string; email: string | null },
  today: string,
): Promise<PortalPayload[]> {
  const admin = createAdminClient();

  const idNo = identity.idNo?.trim() ?? "";
  const email = identity.email?.trim() ?? "";

  // Neither identifier: nothing to group by, so nothing is returned. Better
  // an empty portal than somebody else's certificates.
  if (!idNo && !email) return [];

  // The link embed is deliberately NOT `!inner` here. Once someone has proved
  // who they are, every certificate that is theirs belongs on the page --
  // including one the agent never got round to issuing a link for. The link
  // is the way in and the revocation switch, not a per-certificate paywall.
  let query = admin
    .from("case_submissions")
    .select(
      `${idNo ? CASE_SELECT : CASE_SELECT_INNER}, client_portal_links(id, display_status, revoked_at)`,
    );

  if (idNo) {
    // NRIC first, and alone. A certificate carrying an NRIC is grouped by it
    // and by nothing else, so two people sharing a household email never see
    // each other's cover.
    query = query.eq("id_no", idNo);
  } else {
    // No NRIC on the certificate they proved themselves against, so the email
    // is all there is. Restricted to cases that ALSO have no NRIC: a case
    // that has one belongs to whoever that NRIC identifies, not to whoever
    // happens to share an address with them.
    query = query.filter("leads.email", "eq", email).is("id_no", null);
  }

  const { data, error } = await query.order("commencement_date", {
    ascending: false,
    nullsFirst: false,
  });

  if (error || !data) {
    if (error) Sentry.captureException(error, { tags: { fn: "getPortalCertificates" } });
    return [];
  }

  const rows = data as unknown as (CaseRow & { client_portal_links: LinkRow[] })[];

  return rows
    .map((row) => {
      const links = row.client_portal_links ?? [];
      const live = links.find((l) => !l.revoked_at) ?? null;
      // A link that was issued and then revoked is a deliberate act: that
      // certificate stays hidden. A certificate that never had one is simply
      // one the agent has not shared yet, and is still theirs to see.
      const deliberatelyRevoked = links.length > 0 && !live;
      return deliberatelyRevoked ? null : buildPayload(row, live, today);
    })
    .filter((p): p is PortalPayload => p !== null);
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
