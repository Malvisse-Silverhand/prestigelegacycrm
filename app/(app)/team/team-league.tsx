"use client";

import Link from "next/link";
import type { UnitLeague } from "./data";
import { computeAgentMetrics, emptyMetrics, type MinimalLead, type MinimalActivity } from "./metrics";
import { ChevronDownIcon, ShieldIcon } from "@/components/icons";
import { EmptyState } from "@/components/empty-state";
import { TeamIcon } from "@/components/icons";

function initialsOf(name: string, given: string | null) {
  return given || name.split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

function staleBadgeStyle(count: number) {
  if (count === 0) return "bg-success-bg text-green";
  if (count <= 4) return "bg-warn-gold-bg text-warn-gold-text";
  return "bg-alert-red-bg text-alert-red";
}

export function TeamLeague({
  groupLabel,
  leagues,
  leads,
  activities,
}: {
  groupLabel: string;
  leagues: UnitLeague[];
  leads: MinimalLead[];
  activities: MinimalActivity[];
}) {
  const agentMetrics = computeAgentMetrics(leads, activities);

  const unitManagerRows = leagues.map((league) => {
    const unitLeads = leads.filter((l) => l.unit_id === league.unitId);
    const unitActivities = activities.filter((a) => unitLeads.some((l) => l.id === a.lead_id));
    // Roll a unit manager's row up from their agents' per-lead numbers directly,
    // rather than re-deriving from the (per-agent) metrics map.
    const closedWon = unitLeads.filter((l) => l.pipeline_stage === "closed_won").length;
    const staleCount = unitLeads.filter((l) => l.is_stale).length;
    const perAgent = computeAgentMetrics(unitLeads, unitActivities);
    const responseValues = [...perAgent.values()].map((m) => m.avgResponseHours).filter((v): v is number => v !== null);
    const avgResponse = responseValues.length > 0 ? responseValues.reduce((a, b) => a + b, 0) / responseValues.length : null;

    return {
      league,
      leadCount: unitLeads.length,
      convRate: unitLeads.length > 0 ? Math.round((closedWon / unitLeads.length) * 1000) / 10 : 0,
      avgResponse,
      staleCount,
    };
  });

  return (
    <div>
      <div className="flex items-center gap-4 border-b border-sand bg-white px-5 lg:px-[30px] py-[18px]">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-taupe">
            <span>{groupLabel}</span>
          </div>
          <div className="mt-1 text-[21px] font-extrabold tracking-[-0.02em] text-navy">
            Unit Managers under you
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-5 lg:px-[30px] py-[22px] pb-[30px]">
        {unitManagerRows.length === 0 ? (
          <EmptyState
            icon={<TeamIcon width={28} height={28} className="text-green" />}
            title="No units under you yet"
            description="Once units and their managers are set up, they'll show up here."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-card">
           <div className="overflow-x-auto">
            <div className="min-w-[760px]">
            <div className="grid grid-cols-[1.6fr_.9fr_.8fr_.9fr_.9fr_.9fr_1.1fr] bg-cream px-[22px] py-[11px] text-[10.5px] font-bold tracking-[0.08em] text-taupe-2 uppercase">
              <div>Unit Manager</div>
              <div>Agents</div>
              <div>Leads</div>
              <div>Conv.</div>
              <div>Response</div>
              <div>Stale</div>
              <div className="text-right">Access</div>
            </div>

            {unitManagerRows.map((row, i) => (
              <details key={row.league.unitId} className="group border-b border-sand-3 last:border-b-0" open={i === 0}>
                <summary className="grid cursor-pointer grid-cols-[1.6fr_.9fr_.8fr_.9fr_.9fr_.9fr_1.1fr] items-center px-[22px] py-[15px] [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-[11px]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-navy text-xs font-bold text-gold">
                      {initialsOf(row.league.unitManager.full_name, row.league.unitManager.avatar_initials)}
                    </div>
                    <div>
                      <div className="text-[13.5px] font-bold text-navy">{row.league.unitManager.full_name}</div>
                      <div className="text-[11px] font-medium text-taupe">{row.league.unitName}</div>
                    </div>
                    <ChevronDownIcon width={14} height={14} className="ml-1 text-taupe transition-transform group-open:rotate-180" />
                  </div>
                  <div className="text-[13.5px] font-bold text-navy">{row.league.agents.length}</div>
                  <div className="text-[13.5px] font-bold text-navy">{row.leadCount}</div>
                  <div className="text-[13.5px] font-bold text-green">{row.convRate}%</div>
                  <div className="text-[13.5px] font-semibold text-navy">
                    {row.avgResponse !== null ? `${row.avgResponse.toFixed(1)}h` : "—"}
                  </div>
                  <div>
                    <span className={`rounded-[7px] px-[9px] py-1 text-[11px] font-bold ${staleBadgeStyle(row.staleCount)}`}>
                      {row.staleCount}
                    </span>
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <Link
                      href={`/dashboard?monitor=${row.league.unitManager.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-[9px] border border-sand-2 bg-cream px-3.5 py-2 text-xs font-semibold text-navy"
                    >
                      Open Dashboard
                    </Link>
                  </div>
                </summary>

                <div className="bg-cream px-[22px] py-3.5 pl-[60px]">
                  <div className="pb-2 text-[10.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">
                    Agents under {row.league.unitManager.full_name.split(" ")[0]} — click to open an agent dashboard
                  </div>
                  {row.league.agents.length === 0 ? (
                    <p className="text-[12.5px] text-muted">No agents in this unit yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                      {row.league.agents.map((agent) => {
                        const m = agentMetrics.get(agent.id) ?? emptyMetrics();
                        return (
                          <Link
                            key={agent.id}
                            href={`/dashboard?monitor=${agent.id}`}
                            className={
                              m.staleCount > 0
                                ? "rounded-xl border-[1.5px] border-[#f6d5cf] bg-white p-[11px]"
                                : "rounded-xl border border-sand-2 bg-white p-[11px]"
                            }
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-navy text-[9.5px] font-bold text-gold">
                                {initialsOf(agent.full_name, agent.avatar_initials)}
                              </span>
                              <span className="truncate text-xs font-bold text-navy">{agent.full_name}</span>
                            </div>
                            <div className="mt-[9px] flex gap-2.5 text-[11px] font-semibold text-muted-2">
                              <span>{m.leadCount} leads</span>
                              <span className={m.convRate < 20 ? "text-[#b06d1c]" : "text-green"}>{m.convRate}%</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </details>
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
