// ANC that comes from a case, rather than from a quotation.
//
// A quotation is what an agent put in front of a client; a case is what the
// client actually signed. Where both exist the case wins every time, and this
// is the one place that conversion is defined so the pipeline, the dashboard,
// Servicing and Statistics cannot drift apart on it.

import { monthsPerPayment, type PaymentFrequency } from "@/lib/contribution-schedule";
import { MONTHS_PER_YEAR } from "@/lib/lead-anc";

/** Statuses whose contribution is real money the client has committed to. */
export const COUNTED_CASE_STATUSES = ["submitted", "inforce"] as const;

export type AncCase = {
  leadId: string;
  status: string;
  paymentFrequency: PaymentFrequency;
  /** What the client pays each time, not per year. */
  installmentContribution: number | null;
  /** How many of that case's dues have been ticked on the checklist. */
  paidCount: number;
};

/**
 * One case, annualised.
 *
 * A monthly RM77.95 and a yearly RM6,500 are both twelve months of cover, so
 * both have to be expressed over a year before they can be added together --
 * otherwise a yearly payer looks twelve times smaller than they are.
 */
export function caseAnc(c: Pick<AncCase, "paymentFrequency" | "installmentContribution">): number {
  if (c.installmentContribution == null) return 0;
  const paymentsPerYear = MONTHS_PER_YEAR / monthsPerPayment(c.paymentFrequency);
  return c.installmentContribution * paymentsPerYear;
}

/**
 * What a case has actually brought in: the contributions ticked on its
 * checklist, at face value.
 *
 * Deliberately not annualised. This is money collected, and inflating it to a
 * yearly figure would report income that has not arrived.
 */
export function caseCollected(c: Pick<AncCase, "installmentContribution" | "paidCount">): number {
  if (c.installmentContribution == null) return 0;
  return c.installmentContribution * c.paidCount;
}

export type LeadCaseAnc = {
  /** Annualised contribution across this lead's submitted and inforce cases. */
  anc: number;
  /** Of that, the part backed by a certificate already inforce. */
  inforcedAnc: number;
  /** Contributions actually ticked as paid. */
  collected: number;
};

const EMPTY: LeadCaseAnc = { anc: 0, inforcedAnc: 0, collected: 0 };

/** Totals per lead, keyed by lead id. Leads with no counted case are absent. */
export function caseAncByLead(cases: AncCase[]): Map<string, LeadCaseAnc> {
  const out = new Map<string, LeadCaseAnc>();
  for (const c of cases) {
    if (!(COUNTED_CASE_STATUSES as readonly string[]).includes(c.status)) continue;
    const prev = out.get(c.leadId) ?? { ...EMPTY };
    const anc = caseAnc(c);
    out.set(c.leadId, {
      anc: prev.anc + anc,
      inforcedAnc: prev.inforcedAnc + (c.status === "inforce" ? anc : 0),
      // Only an inforce certificate can have collected anything -- a case
      // still with underwriting has no schedule to tick.
      collected: prev.collected + (c.status === "inforce" ? caseCollected(c) : 0),
    });
  }
  return out;
}

export function sumCaseAnc(byLead: Map<string, LeadCaseAnc>, leadIds: Iterable<string>): LeadCaseAnc {
  let anc = 0, inforcedAnc = 0, collected = 0;
  for (const id of leadIds) {
    const v = byLead.get(id);
    if (!v) continue;
    anc += v.anc;
    inforcedAnc += v.inforcedAnc;
    collected += v.collected;
  }
  return { anc, inforcedAnc, collected };
}

/**
 * A case, widened with what a *calendar year* total needs: the date its
 * certificate actually went inforce, and which of its schedule rows have
 * been paid.
 */
export type YearCase = {
  leadId: string;
  status: string;
  paymentFrequency: PaymentFrequency;
  installmentContribution: number | null;
  commencementDate: string | null;
  certificateIssueDate: string | null;
  inforcedAtKey: string | null;
  /** Due dates (YYYY-MM-DD) of this case's schedule rows that are ticked paid. */
  paidDueDates: string[];
};

/**
 * The date a case's certificate is treated as having gone inforce, for
 * "since 1 Jan <year>" purposes.
 *
 * commencementDate wins when it's on file -- that's the date cover actually
 * started. certificateIssueDate is the next best thing. inforced_at (when the
 * row was ticked inforce in this CRM) is last on purpose: a September 2026
 * bulk data-entry pass ticked years of old business inforce in a single
 * afternoon, and using that timestamp would report all of it as September
 * business instead of whenever it actually started.
 */
export function caseInforceDate(c: Pick<YearCase, "commencementDate" | "certificateIssueDate" | "inforcedAtKey">): string | null {
  return c.commencementDate ?? c.certificateIssueDate ?? c.inforcedAtKey;
}

/**
 * ANC inforced since 1 Jan of `year`, and contributions paid that were due
 * in `year`, across inforce cases belonging to a lead in `leadIds`.
 */
export function yearTotals(
  cases: YearCase[],
  leadIds: Set<string>,
  year: string,
): { inforcedAnc: number; collected: number } {
  let inforcedAnc = 0, collected = 0;
  for (const c of cases) {
    if (c.status !== "inforce" || !leadIds.has(c.leadId)) continue;
    if (caseInforceDate(c)?.startsWith(year)) inforcedAnc += caseAnc(c);
    if (c.installmentContribution != null) {
      collected += c.installmentContribution * c.paidDueDates.filter((d) => d.startsWith(year)).length;
    }
  }
  return { inforcedAnc, collected };
}
