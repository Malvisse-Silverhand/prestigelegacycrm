import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/profile";
import {
  getStatisticsData,
  getScopedMembers,
  getMemberTarget,
  computeTopStats,
  computeProductMix,
  computeResponseBuckets,
  computeStageFunnel,
  computeLeague,
  computePersonalStats,
} from "./data";
import { computeAgentMetrics } from "@/app/(app)/team/metrics";
import { getStaleAfterDays } from "@/lib/staleness-server";
import { StatCard, LeagueTable, ProductMix, ResponseHistogram, StageFunnel, AgentTable } from "./statistics-view";
import { PersonalPanel, MemberCards } from "./personal-view";

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const scope = params.scope ?? "units";

  const [{ leads, activities, quotations, units, unitManagers, agents }, staleAfterDays, members] =
    await Promise.all([getStatisticsData(profile), getStaleAfterDays(), getScopedMembers(profile)]);

  // Drilling into someone else is only possible for people the scoped member
  // list already contains, and that list is profiles RLS -- so an agent
  // passing ?member=<someone else> silently lands back on themselves rather
  // than seeing anything they shouldn't.
  const requested = params.member || null;
  const selected =
    (requested ? members.find((m) => m.id === requested) : undefined) ??
    members.find((m) => m.id === profile.id) ??
    members[0] ??
    null;

  const memberTarget = selected ? await getMemberTarget(selected.id) : null;
  const personalStats = selected
    ? computePersonalStats(selected.id, leads, quotations, activities, staleAfterDays, memberTarget)
    : null;

  // An agent has nobody below them, so the cards, the league and the
  // cross-team charts are all noise -- their page is the personal panel.
  const personalOnly = profile.role === "agent";

  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const top = computeTopStats(leads, quotations, thisMonth, prevMonth);
  const productMix = computeProductMix(leads);
  const responseData = computeResponseBuckets(leads, activities);
  const funnel = computeStageFunnel(leads);

  // Roles that lead one team see their own team's numbers; everyone above
  // that sees the cross-unit league.
  const singleTeamView = profile.role === "unit_manager" || profile.role === "aspirant_unit_manager";

  const league =
    !singleTeamView
      ? computeLeague(
          unitManagers
            .map((um) => {
              const unit = units.find((u) => u.id === um.unit_id);
              return unit ? { id: um.id, name: um.full_name, unitId: unit.id, avatarInitials: um.avatar_initials } : null;
            })
            .filter((x): x is NonNullable<typeof x> => x !== null),
          leads,
          quotations,
          activities,
          staleAfterDays,
        )
      : [];

  const agentMetrics = computeAgentMetrics(leads, activities, staleAfterDays);

  return (
    <div>
      <div className="flex items-center gap-3.5 border-b border-sand bg-white px-5 lg:px-[30px] py-5">
        <div className="flex-1">
          <div className="text-2xl font-extrabold tracking-[-0.025em] text-navy">Statistics</div>
          <div className="mt-0.5 text-[13px] font-medium text-muted">
            {personalOnly
              ? `Your own performance · ${new Date().toLocaleDateString("en-MY", { month: "long", year: "numeric" })}`
              : singleTeamView
                ? `${profile.unit_name ?? "your unit"} · ${new Date().toLocaleDateString("en-MY", { month: "long", year: "numeric" })}`
                : `${units.length} unit${units.length === 1 ? "" : "s"} · ${unitManagers.length} unit manager${unitManagers.length === 1 ? "" : "s"} · ${new Date().toLocaleDateString("en-MY", { month: "long", year: "numeric" })}`}
          </div>
        </div>
        {!singleTeamView && !personalOnly && (
          <div className="flex rounded-[10px] border border-sand-2 bg-cream p-[3px]">
            {[
              { key: "units", label: "Units" },
              { key: "agents", label: "Agents" },
              { key: "products", label: "Products" },
            ].map((tab) => (
              <Link
                key={tab.key}
                href={`/statistics?scope=${tab.key}`}
                className={
                  scope === tab.key
                    ? "rounded-[8px] bg-navy px-3.5 py-[7px] text-xs font-semibold text-white"
                    : "px-3.5 py-[7px] text-xs font-semibold text-muted"
                }
              >
                {tab.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-[18px] px-5 lg:px-[30px] py-[22px] pb-[30px]">
        {/* Whose numbers you are looking at, before the team-wide charts --
            for an agent this is the whole page. */}
        {selected && personalStats && (
          <PersonalPanel member={selected} stats={personalStats} isSelf={selected.id === profile.id} />
        )}

        {!personalOnly && members.length > 1 && (
          <MemberCards
            members={members}
            selectedId={selected?.id ?? profile.id}
            metricsFor={(id) => {
              const m = agentMetrics.get(id);
              const owned = leads.filter((l) => l.agent_id === id);
              return {
                leads: m?.leadCount ?? owned.length,
                closed: Math.round(((m?.convRate ?? 0) / 100) * (m?.leadCount ?? 0)),
                convRate: m?.convRate ?? 0,
              };
            }}
          />
        )}

        {!personalOnly && (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total leads" value={top.totalLeads} delta={top.totalLeadsDelta === null ? null : `${top.totalLeadsDelta > 0 ? "+" : ""}${top.totalLeadsDelta}%`} />
          <StatCard label="Quotations sent" value={top.quotationsSent} delta={top.quotationsSentDelta === null ? null : `${top.quotationsSentDelta > 0 ? "+" : ""}${top.quotationsSentDelta}%`} />
          <StatCard label="Cases closed" value={top.casesClosed} delta={`${top.casesClosedDelta > 0 ? "+" : ""}${top.casesClosedDelta}`} />
          <StatCard label="Group conversion" value={`${top.groupConversion}%`} delta={`${top.groupConversionDelta > 0 ? "+" : ""}${top.groupConversionDelta}pt`} />
          <StatCard label="Monthly contribution" value={`RM ${top.monthlyContribution >= 1000 ? (top.monthlyContribution / 1000).toFixed(1) + "k" : top.monthlyContribution}`} dark />
        </div>
        )}

        {!singleTeamView && !personalOnly && scope === "units" && <LeagueTable rows={league} />}
        {!singleTeamView && !personalOnly && scope === "agents" && (
          <AgentTable metrics={agentMetrics} agents={agents} />
        )}

        {!personalOnly && (
          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-3">
            <ProductMix data={productMix} />
            <ResponseHistogram data={responseData} />
            <StageFunnel stages={funnel} />
          </div>
        )}
      </div>
    </div>
  );
}
