import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import {
  getStatisticsData,
  computeTopStats,
  computeProductMix,
  computeResponseBuckets,
  computeStageFunnel,
  computeLeague,
} from "./data";
import { computeAgentMetrics } from "@/app/(app)/team/metrics";
import { StatCard, LeagueTable, ProductMix, ResponseHistogram, StageFunnel, AgentTable } from "./statistics-view";

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (profile.role === "agent") redirect("/dashboard");

  const params = await searchParams;
  const scope = params.scope ?? "units";

  const { leads, activities, quotations, units, unitManagers, agents } = await getStatisticsData(profile);

  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const top = computeTopStats(leads, quotations, thisMonth, prevMonth);
  const productMix = computeProductMix(leads);
  const responseData = computeResponseBuckets(leads, activities);
  const funnel = computeStageFunnel(leads);

  const league =
    profile.role !== "unit_manager"
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
        )
      : [];

  const agentMetrics = computeAgentMetrics(leads, activities);

  return (
    <div>
      <div className="flex items-center gap-3.5 border-b border-sand bg-white px-[30px] py-5">
        <div className="flex-1">
          <div className="text-2xl font-extrabold tracking-[-0.025em] text-navy">Statistics</div>
          <div className="mt-0.5 text-[13px] font-medium text-muted">
            {profile.role === "unit_manager"
              ? `${profile.unit_name ?? "your unit"} · ${new Date().toLocaleDateString("en-MY", { month: "long", year: "numeric" })}`
              : `${units.length} unit${units.length === 1 ? "" : "s"} · ${unitManagers.length} unit manager${unitManagers.length === 1 ? "" : "s"} · ${new Date().toLocaleDateString("en-MY", { month: "long", year: "numeric" })}`}
          </div>
        </div>
        {profile.role !== "unit_manager" && (
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

      <div className="flex flex-col gap-[18px] px-[30px] py-[22px] pb-[30px]">
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total leads" value={top.totalLeads} delta={top.totalLeadsDelta === null ? null : `${top.totalLeadsDelta > 0 ? "+" : ""}${top.totalLeadsDelta}%`} />
          <StatCard label="Quotations sent" value={top.quotationsSent} delta={top.quotationsSentDelta === null ? null : `${top.quotationsSentDelta > 0 ? "+" : ""}${top.quotationsSentDelta}%`} />
          <StatCard label="Cases closed" value={top.casesClosed} delta={`${top.casesClosedDelta > 0 ? "+" : ""}${top.casesClosedDelta}`} />
          <StatCard label="Group conversion" value={`${top.groupConversion}%`} delta={`${top.groupConversionDelta > 0 ? "+" : ""}${top.groupConversionDelta}pt`} />
          <StatCard label="Monthly contribution" value={`RM ${top.monthlyContribution >= 1000 ? (top.monthlyContribution / 1000).toFixed(1) + "k" : top.monthlyContribution}`} dark />
        </div>

        {profile.role !== "unit_manager" && scope === "units" && <LeagueTable rows={league} />}
        {profile.role !== "unit_manager" && scope === "agents" && (
          <AgentTable metrics={agentMetrics} agents={agents} />
        )}

        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-3">
          <ProductMix data={productMix} />
          <ResponseHistogram data={responseData} />
          <StageFunnel stages={funnel} />
        </div>
      </div>
    </div>
  );
}
