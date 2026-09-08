import Link from "next/link";
import type { LeagueNode } from "./data";
import { computeAgentMetrics, emptyMetrics, type MinimalLead, type MinimalActivity } from "./metrics";
import { daysSinceLastActivity } from "@/lib/staleness";
import { WON_STAGES } from "@/lib/pipeline-stages";
import { ChevronDownIcon, ShieldIcon } from "@/components/icons";
import { EmptyState } from "@/components/empty-state";
import { TeamIcon } from "@/components/icons";
import { StopPropagationLink } from "./stop-propagation-link";
import { ActiveToggle } from "./active-toggle";

const COLS = "grid-cols-[1.6fr_.9fr_.8fr_.9fr_.9fr_.9fr_1.1fr]";

function initialsOf(name: string, given: string | null) {
  return given || name.split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

function staleBadgeStyle(count: number) {
  if (count === 0) return "bg-success-bg text-green";
  if (count <= 4) return "bg-warn-gold-bg text-warn-gold-text";
  return "bg-alert-red-bg text-alert-red";
}

type RowStats = {
  headcount: number;
  leadCount: number;
  convRate: number;
  avgResponse: number | null;
  staleCount: number;
};

// Rolled up from the people in the subtree rather than from a unit id: most
// agents here have no unit, so a unit-keyed roll-up counted almost nothing.
function statsFor(
  node: LeagueNode,
  leads: MinimalLead[],
  activities: MinimalActivity[],
  staleAfterDays: number,
): RowStats {
  const ids = new Set(node.memberIds);
  const nodeLeads = leads.filter(
    (l) =>
      (l.agent_id && ids.has(l.agent_id)) ||
      // A unit's unassigned pool belongs to whoever runs the unit, so it still
      // counts against them -- same as before.
      (!l.agent_id && node.unitId !== null && l.unit_id === node.unitId),
  );
  const leadIds = new Set(nodeLeads.map((l) => l.id));
  const nodeActivities = activities.filter((a) => leadIds.has(a.lead_id));

  const closedWon = nodeLeads.filter((l) => WON_STAGES.includes(l.pipeline_stage)).length;
  const perAgent = computeAgentMetrics(nodeLeads, nodeActivities, staleAfterDays);
  const responseValues = [...perAgent.values()]
    .map((m) => m.avgResponseHours)
    .filter((v): v is number => v !== null);

  const timestampsByLead = new Map<string, string[]>();
  for (const a of nodeActivities) {
    (timestampsByLead.get(a.lead_id) ?? timestampsByLead.set(a.lead_id, []).get(a.lead_id)!).push(a.created_at);
  }

  return {
    // The manager isn't part of their own headcount.
    headcount: node.memberIds.length - (node.manager ? 1 : 0),
    leadCount: nodeLeads.length,
    convRate: nodeLeads.length > 0 ? Math.round((closedWon / nodeLeads.length) * 1000) / 10 : 0,
    avgResponse:
      responseValues.length > 0 ? responseValues.reduce((a, b) => a + b, 0) / responseValues.length : null,
    staleCount: nodeLeads.filter(
      (l) => daysSinceLastActivity(l.created_at, timestampsByLead.get(l.id) ?? []) >= staleAfterDays,
    ).length,
  };
}

function AgentCard({
  agent,
  metrics,
}: {
  agent: LeagueNode["agents"][number];
  metrics: ReturnType<typeof emptyMetrics>;
}) {
  return (
    <div
      className={
        metrics.staleCount > 0
          ? "rounded-xl border-[1.5px] border-[#f6d5cf] bg-white p-[11px]"
          : "rounded-xl border border-sand-2 bg-white p-[11px]"
      }
    >
      <Link href={`/dashboard?monitor=${agent.id}`} className="block">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-navy text-[9.5px] font-bold text-gold">
            {initialsOf(agent.full_name, agent.avatar_initials)}
          </span>
          <span className="truncate text-xs font-bold text-navy">{agent.full_name}</span>
        </div>
        <div className="mt-[9px] flex items-center gap-2.5 text-[11px] font-semibold text-muted-2">
          <span>{metrics.leadCount} leads</span>
          <span className={metrics.convRate < 20 ? "text-[#b06d1c]" : "text-green"}>{metrics.convRate}%</span>
          {agent.role === "aspirant_unit_manager" && (
            <span className="rounded-[5px] bg-warn-gold-bg px-[5px] py-[1px] text-[8.5px] font-bold text-warn-gold-text">
              AUM
            </span>
          )}
        </div>
      </Link>
      <div className="mt-2 border-t border-sand-3 pt-2">
        <ActiveToggle memberId={agent.id} initialActive={agent.is_active} compact />
      </div>
    </div>
  );
}

function NodeRow({
  node,
  depth,
  leads,
  activities,
  staleAfterDays,
  agentMetrics,
}: {
  node: LeagueNode;
  depth: number;
  leads: MinimalLead[];
  activities: MinimalActivity[];
  staleAfterDays: number;
  agentMetrics: Map<string, ReturnType<typeof emptyMetrics>>;
}) {
  const stats = statsFor(node, leads, activities, staleAfterDays);
  // Only the top level starts open. Expanding everything at once on a large
  // org would bury the summary rows the page is here to give you.
  const open = depth === 0;

  return (
    <details className="group border-b border-sand-3 last:border-b-0" open={open}>
      <summary
        className={`grid cursor-pointer ${COLS} items-center py-[15px] pr-[22px] [&::-webkit-details-marker]:hidden ${
          depth > 0 ? "bg-cream/60" : ""
        }`}
        style={{ paddingLeft: 22 + depth * 26 }}
      >
        <div className="flex items-center gap-[11px]">
          <div
            className={`flex h-9 w-9 flex-none items-center justify-center rounded-[11px] text-xs font-bold ${
              node.manager ? "bg-navy text-gold" : "border border-dashed border-sand-2 bg-cream text-taupe"
            }`}
          >
            {node.manager ? initialsOf(node.manager.full_name, node.manager.avatar_initials) : "—"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-bold text-navy">{node.title}</div>
            <div className="truncate text-[11px] font-medium text-taupe">{node.subtitle}</div>
          </div>
          <ChevronDownIcon
            width={14}
            height={14}
            className="ml-1 flex-none text-taupe transition-transform group-open:rotate-180"
          />
        </div>
        <div className="text-[13.5px] font-bold text-navy">{stats.headcount}</div>
        <div className="text-[13.5px] font-bold text-navy">{stats.leadCount}</div>
        <div className="text-[13.5px] font-bold text-green">{stats.convRate}%</div>
        <div className="text-[13.5px] font-semibold text-navy">
          {stats.avgResponse !== null ? `${stats.avgResponse.toFixed(1)}h` : "—"}
        </div>
        <div>
          <span className={`rounded-[7px] px-[9px] py-1 text-[11px] font-bold ${staleBadgeStyle(stats.staleCount)}`}>
            {stats.staleCount}
          </span>
        </div>
        <div className="flex items-center justify-end gap-2">
          {node.manager && (
            <>
              {/* ActiveToggle stops the click itself -- this sits inside a
                  <summary>, which would otherwise also toggle the row. */}
              <ActiveToggle memberId={node.manager.id} initialActive={node.manager.is_active} compact />
              <StopPropagationLink
                href={`/dashboard?monitor=${node.manager.id}`}
                className="rounded-[9px] border border-sand-2 bg-cream px-3.5 py-2 text-xs font-semibold text-navy"
              >
                Open Dashboard
              </StopPropagationLink>
            </>
          )}
        </div>
      </summary>

      {node.children.map((child) => (
        <NodeRow
          key={child.key}
          node={child}
          depth={depth + 1}
          leads={leads}
          activities={activities}
          staleAfterDays={staleAfterDays}
          agentMetrics={agentMetrics}
        />
      ))}

      {node.agents.length > 0 && (
        <div className="bg-cream py-3.5 pr-[22px]" style={{ paddingLeft: 60 + depth * 26 }}>
          <div className="pb-2 text-[10.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">
            {node.manager
              ? `Reporting to ${node.manager.full_name.split(" ")[0]} — click a name to open their dashboard`
              : "Click a name to open their dashboard"}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {node.agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} metrics={agentMetrics.get(agent.id) ?? emptyMetrics()} />
            ))}
          </div>
        </div>
      )}

      {node.agents.length === 0 && node.children.length === 0 && (
        <div className="bg-cream py-3 text-[12.5px] text-muted" style={{ paddingLeft: 60 + depth * 26 }}>
          Nobody reporting here yet.
        </div>
      )}
    </details>
  );
}

export function TeamLeague({
  groupLabel,
  heading,
  roots,
  leads,
  activities,
  staleAfterDays,
}: {
  groupLabel: string;
  heading: string;
  roots: LeagueNode[];
  leads: MinimalLead[];
  activities: MinimalActivity[];
  staleAfterDays: number;
}) {
  const agentMetrics = computeAgentMetrics(leads, activities, staleAfterDays);
  const headcount = new Set(roots.flatMap((r) => r.memberIds)).size;

  return (
    <div>
      <div className="flex items-center gap-4 border-b border-sand bg-white px-5 lg:px-[30px] py-[18px]">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-taupe">
            <span>{groupLabel}</span>
          </div>
          <div className="mt-1 text-[21px] font-extrabold tracking-[-0.02em] text-navy">{heading}</div>
        </div>
        <div className="flex-none text-right">
          <div className="text-[21px] font-extrabold tracking-[-0.02em] text-navy">{headcount}</div>
          <div className="text-[11px] font-semibold text-taupe">people</div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-5 lg:px-[30px] py-[22px] pb-[30px]">
        {roots.length === 0 ? (
          <EmptyState
            icon={<TeamIcon width={28} height={28} className="text-green" />}
            title="Nobody under you yet"
            description="Once managers and agents are set up, they'll show up here."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-card">
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div
                  className={`grid ${COLS} bg-cream px-[22px] py-[11px] text-[10.5px] font-bold tracking-[0.08em] text-taupe-2 uppercase`}
                >
                  <div>Manager</div>
                  <div>People</div>
                  <div>Leads</div>
                  <div>Conv.</div>
                  <div>Response</div>
                  <div>Stale</div>
                  <div className="text-right">Access</div>
                </div>

                {roots.map((node) => (
                  <NodeRow
                    key={node.key}
                    node={node}
                    depth={0}
                    leads={leads}
                    activities={activities}
                    staleAfterDays={staleAfterDays}
                    agentMetrics={agentMetrics}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3.5 rounded-2xl bg-navy px-[22px] py-3.5">
          <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-gold/[.18]">
            <ShieldIcon width={17} height={17} className="text-gold" />
          </span>
          <p className="flex-1 text-[12.5px] leading-relaxed font-medium text-white/72">
            Opening someone else&apos;s dashboard is recorded in the audit log. You see metrics and lead status — not the
            contents of an agent&apos;s WhatsApp conversations.
          </p>
          <Link href="/team/audit-log" className="rounded-[9px] bg-white/10 px-3.5 py-2 text-xs font-semibold text-white">
            View audit log
          </Link>
        </div>
      </div>
    </div>
  );
}
