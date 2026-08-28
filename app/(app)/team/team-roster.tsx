import Link from "next/link";
import type { TeamMember, UnitTargetRow } from "./data";
import type { AgentMetrics } from "./metrics";
import { emptyMetrics } from "./metrics";
import { EmptyState } from "@/components/empty-state";
import { TeamIcon } from "@/components/icons";
import { ActiveToggle } from "./active-toggle";
import { SetTargetPanel } from "./set-target-panel";

function timeAgo(iso: string | null) {
  if (!iso) return "no activity yet";
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = diffMs / 3600000;
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function initialsOf(name: string, given: string | null) {
  return given || name.split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

export function TeamRoster({
  unitName,
  members,
  metrics,
  monthDate,
  targets,
}: {
  unitName: string | null;
  members: TeamMember[];
  metrics: Map<string, AgentMetrics>;
  monthDate: string;
  targets: UnitTargetRow[];
}) {
  const activeCount = members.filter((m) => m.is_active).length;
  const totalLeads = members.reduce((sum, m) => sum + (metrics.get(m.id)?.leadCount ?? 0), 0);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 border-b border-sand bg-white px-[30px] py-5">
        <div>
          <div className="text-[22px] font-extrabold tracking-[-0.02em] text-navy">
            Team Management
          </div>
          <div className="mt-[3px] text-[13px] font-medium text-muted">
            Manage team members{unitName ? ` for ${unitName}` : ""}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-[30px] py-[22px] pb-[30px]">
        <div className="grid grid-cols-4 gap-3.5">
          <StatCard label="Total Members" value={members.length} />
          <StatCard label="Active Agents" value={activeCount} />
          <StatCard label="Active Percentage" value={members.length > 0 ? `${Math.round((activeCount / members.length) * 100)}%` : "—"} />
          <StatCard label="Leads Assigned" value={totalLeads} dark />
        </div>

        <SetTargetPanel monthDate={monthDate} initialTargets={targets} />

        {members.length === 0 ? (
          <EmptyState
            icon={<TeamIcon width={28} height={28} className="text-green" />}
            title="No agents in your unit yet"
            description="Once agents are added to your unit, they'll show up here with their lead and conversion stats."
          />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {members.map((m) => {
              const stats = metrics.get(m.id) ?? emptyMetrics();
              const stale = stats.staleCount > 0;
              const needsAttention = m.last_activity_at
                ? Date.now() - new Date(m.last_activity_at).getTime() > 48 * 3600000
                : true;
              return (
                <div
                  key={m.id}
                  className={
                    stale
                      ? "rounded-[18px] border-[1.5px] border-[#f6d5cf] bg-white p-[18px]"
                      : "rounded-[18px] border border-sand bg-white p-[18px]"
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[13px] bg-navy text-sm font-bold text-gold">
                      {initialsOf(m.full_name, m.avatar_initials)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-[7px]">
                        <span className="text-[15px] font-bold text-navy">{m.full_name}</span>
                        {stale ? (
                          <span className="rounded-[6px] bg-alert-red-bg px-[7px] py-[3px] text-[9.5px] font-bold text-alert-red">
                            {stats.staleCount} STALE
                          </span>
                        ) : (
                          <span className="rounded-[6px] bg-info-blue-bg px-[7px] py-[3px] text-[9.5px] font-bold text-info-blue-text">
                            AGENT
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-[11.5px] font-medium text-taupe">{m.email}</div>
                    </div>
                  </div>

                  <div className="mt-3.5">
                    <ActiveToggle memberId={m.id} initialActive={m.is_active} />
                  </div>

                  <div className="mt-3.5 grid grid-cols-3 gap-2">
                    <MiniStat label="Leads" value={String(stats.leadCount)} />
                    <MiniStat label="Conv." value={`${stats.convRate}%`} tone={stats.convRate < 20 ? "warn" : "good"} />
                    <MiniStat
                      label="Response"
                      value={stats.avgResponseHours !== null ? `${stats.avgResponseHours}h` : "—"}
                      tone={stats.avgResponseHours !== null && stats.avgResponseHours > 4 ? "bad" : undefined}
                    />
                  </div>

                  <div className={`mt-3 text-[11.5px] font-medium ${needsAttention ? "font-semibold text-alert-red" : "text-taupe"}`}>
                    {needsAttention
                      ? `Last activity ${timeAgo(m.last_activity_at)} — needs attention`
                      : `Joined ${new Date(m.created_at).toLocaleDateString("en-MY")} · last activity ${timeAgo(m.last_activity_at)}`}
                  </div>

                  <div className="mt-[13px] flex gap-2">
                    <Link
                      href={`/dashboard?monitor=${m.id}`}
                      className={
                        needsAttention
                          ? "flex h-10 flex-1 items-center justify-center gap-[7px] rounded-[11px] bg-navy text-[12.5px] font-semibold text-white"
                          : "flex h-10 flex-1 items-center justify-center rounded-[11px] border border-sand-2 bg-cream text-[12.5px] font-semibold text-navy"
                      }
                    >
                      Open Dashboard
                    </Link>
                    <Link
                      href={`/leads?agent=${m.id}`}
                      className={
                        stale
                          ? "flex h-10 items-center rounded-[11px] bg-gold px-3.5 text-[12.5px] font-bold text-navy"
                          : "flex h-10 items-center rounded-[11px] border border-sand-2 bg-cream px-3.5 text-[12.5px] font-semibold text-navy"
                      }
                    >
                      {stale ? "Reassign" : "Assign Leads"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, dark }: { label: string; value: string | number; dark?: boolean }) {
  return (
    <div className={dark ? "rounded-2xl bg-navy p-4" : "rounded-2xl border border-sand bg-white p-4"}>
      <div className={`text-[11.5px] font-semibold ${dark ? "text-white/60" : "text-muted"}`}>{label}</div>
      <div className={`text-2xl font-extrabold tracking-[-0.02em] ${dark ? "text-white" : "text-navy"}`}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "bad" }) {
  const valueColor = tone === "good" ? "text-green" : tone === "warn" ? "text-[#b06d1c]" : tone === "bad" ? "text-alert-red" : "text-navy";
  return (
    <div className={tone === "bad" ? "rounded-[11px] bg-alert-red-bg p-2.5" : "rounded-[11px] bg-cream p-2.5"}>
      <div className={`text-[10px] font-bold tracking-[0.06em] uppercase ${tone === "bad" ? "text-alert-red" : "text-taupe"}`}>
        {label}
      </div>
      <div className={`text-[17px] font-extrabold ${valueColor}`}>{value}</div>
    </div>
  );
}
