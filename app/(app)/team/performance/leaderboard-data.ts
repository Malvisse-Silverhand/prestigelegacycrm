import { createClient } from "@/lib/supabase/server";
import { caseAnc, caseInforceDate } from "@/lib/case-anc";
import type { PaymentFrequency } from "@/lib/contribution-schedule";
import { malaysiaDayKey, malaysiaToday } from "@/lib/malaysia-date";

export type LeaderboardEntry = {
  agentId: string;
  name: string;
  initials: string;
  anc: number;
  rank: number;
};

// However large the team RLS lets this viewer see -- a whole-agency scope
// can run into the hundreds -- only the top of the board is worth showing.
// Nobody scrolls a ranked list past this.
const LEADERBOARD_LIMIT = 25;

type CaseRow = {
  agent_id: string | null;
  status: string;
  payment_frequency: PaymentFrequency;
  installment_contribution: number | string | null;
  commencement_date: string | null;
  certificate_issue_date: string | null;
  inforced_at: string | null;
  profiles: { full_name: string; avatar_initials: string | null } | null;
};

/**
 * This calendar year's annualised inforced ANC per agent, ranked descending.
 *
 * Scoped by the same "cases follow lead visibility" RLS the rest of Team
 * Performance already relies on (see getDashboardStats({ teamWide: true })):
 * a Unit Manager or Aspirant UM only ever gets back their own downline's
 * cases, a Group Manager or SuperAdmin the whole group/agency, with no role
 * check repeated here.
 *
 * The date rule (commencement_date, then certificate_issue_date, then
 * inforced_at) and the annualisation are exactly lib/case-anc's
 * caseInforceDate/caseAnc -- the same ones the dashboard's own "Total ANC
 * Inforced [year]" figure uses, so this board can't disagree with it about
 * what counts as this year's business.
 */
export async function getTeamLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const year = malaysiaToday().slice(0, 4);

  const { data } = await supabase
    .from("case_submissions")
    .select(
      "agent_id, status, payment_frequency, installment_contribution, commencement_date, certificate_issue_date, inforced_at, profiles!case_submissions_agent_id_fkey(full_name, avatar_initials)",
    )
    .eq("status", "inforce");

  const totals = new Map<string, { name: string; initials: string; anc: number }>();
  for (const raw of (data ?? []) as unknown[]) {
    const row = raw as CaseRow;
    if (!row.agent_id) continue;

    const inforceDate = caseInforceDate({
      commencementDate: row.commencement_date,
      certificateIssueDate: row.certificate_issue_date,
      inforcedAtKey: row.inforced_at ? malaysiaDayKey(row.inforced_at) : null,
    });
    if (!inforceDate?.startsWith(year)) continue;

    const anc = caseAnc({
      paymentFrequency: row.payment_frequency,
      installmentContribution:
        row.installment_contribution == null ? null : Number(row.installment_contribution),
    });
    if (anc <= 0) continue;

    const name = row.profiles?.full_name ?? "Unknown agent";
    const prev = totals.get(row.agent_id) ?? {
      name,
      initials: row.profiles?.avatar_initials || name.slice(0, 2).toUpperCase(),
      anc: 0,
    };
    prev.anc += anc;
    totals.set(row.agent_id, prev);
  }

  return [...totals.entries()]
    .map(([agentId, v]) => ({ agentId, name: v.name, initials: v.initials, anc: v.anc }))
    .sort((a, b) => b.anc - a.anc)
    .slice(0, LEADERBOARD_LIMIT)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}
