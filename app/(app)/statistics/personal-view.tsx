import Link from "next/link";
import { ROLE_LABEL } from "@/lib/profile-types";
import type { PersonalStats, ScopedMember } from "./data";

function fmtRM(n: number) {
  if (n >= 1000) return `RM${(n / 1000).toFixed(1)}k`;
  return `RM${Math.round(n)}`;
}

function initialsOf(member: ScopedMember) {
  if (member.avatarInitials) return member.avatarInitials;
  const parts = member.fullName.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "green" | "gold" | "red";
}) {
  const valueTone =
    tone === "green" ? "text-green" : tone === "gold" ? "text-warn-gold-text" : tone === "red" ? "text-alert-red" : "text-navy";
  return (
    <div className="rounded-[13px] border border-sand bg-white px-3.5 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe">{label}</div>
      <div className={`mt-0.5 text-[20px] font-extrabold tracking-[-0.03em] ${valueTone}`}>{value}</div>
      {sub && <div className="text-[10.5px] font-semibold text-taupe-2">{sub}</div>}
    </div>
  );
}

/**
 * One person's own performance. Shown to an agent about themselves, and to a
 * manager about whoever they drilled into -- the same panel either way, so
 * there is one definition of "how am I doing" in the system.
 */
export function PersonalPanel({
  member,
  stats,
  isSelf,
}: {
  member: ScopedMember;
  stats: PersonalStats;
  isSelf: boolean;
}) {
  const ancPct = stats.ancPct;
  const ancTone = ancPct == null ? undefined : ancPct >= 100 ? "green" : ancPct >= 60 ? "gold" : "red";

  return (
    <div className="rounded-2xl border border-sand bg-cream p-4 lg:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-navy text-[15px] font-bold text-gold">
          {initialsOf(member)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[16px] font-extrabold tracking-[-0.02em] text-navy">
              {member.fullName}
            </span>
            {isSelf && (
              <span className="flex-none rounded-[6px] bg-navy px-2 py-[2px] text-[9.5px] font-bold tracking-[0.06em] text-white">
                YOU
              </span>
            )}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-taupe">
            {ROLE_LABEL[member.role]} · personal performance
          </div>
        </div>
        <Link
          href={`/leads?agent=${member.id}`}
          className="flex-none rounded-[9px] border border-sand-2 bg-white px-3 py-2 text-[11.5px] font-semibold text-navy hover:border-navy"
        >
          Open their leads
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Metric
          label="ANC closed · month"
          value={fmtRM(stats.closedAncThisMonth)}
          sub={stats.ancTarget ? `of ${fmtRM(stats.ancTarget)} target` : "no target set"}
          tone={ancTone}
        />
        <Metric
          label="Cases closed · month"
          value={String(stats.casesClosedThisMonth)}
          sub={stats.nocTarget ? `of ${stats.nocTarget} target` : `${stats.casesClosed} all time`}
        />
        <Metric label="ANC in play" value={fmtRM(stats.openAnc)} sub="still open" />
        <Metric
          label="Conversion"
          value={`${stats.convRate}%`}
          sub={`${stats.casesClosed} of ${stats.leadCount} leads`}
        />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Metric
          label="Approaches · week"
          value={String(stats.approachesThisWeek)}
          sub={stats.approachTarget ? `${stats.approachTarget}/day target` : `${stats.approachesToday} today`}
        />
        <Metric label="Leads · month" value={String(stats.leadsThisMonth)} sub={`${stats.leadCount} all time`} />
        <Metric label="Quotations" value={String(stats.quotationCount)} sub="built for their leads" />
        <Metric
          label="Avg response"
          value={stats.avgResponseHours == null ? "—" : `${stats.avgResponseHours}h`}
          sub={stats.staleCount > 0 ? `${stats.staleCount} going stale` : "nothing stale"}
          tone={stats.staleCount > 0 ? "red" : undefined}
        />
      </div>
    </div>
  );
}

/**
 * Everyone the viewer is allowed to open, as clickable cards. The list comes
 * from profiles RLS, so it already contains exactly the people this role may
 * look at -- an agent gets only themselves and so never sees this at all.
 */
export function MemberCards({
  members,
  selectedId,
  metricsFor,
}: {
  members: ScopedMember[];
  selectedId: string;
  metricsFor: (id: string) => { leads: number; closed: number; convRate: number };
}) {
  return (
    <div className="rounded-2xl border border-sand bg-white p-4">
      <div className="text-[13px] font-bold text-navy">Team</div>
      <div className="mt-0.5 text-[11.5px] font-medium text-muted">
        Open anyone here to see their own numbers.
      </div>

      <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((m) => {
          const stats = metricsFor(m.id);
          const active = m.id === selectedId;
          return (
            <Link
              key={m.id}
              href={`/statistics?member=${m.id}`}
              className={`press rounded-[13px] border px-3.5 py-3 transition-colors ${
                active
                  ? "border-navy bg-navy"
                  : "border-sand bg-cream hover:border-navy"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 flex-none items-center justify-center rounded-[10px] text-[11px] font-bold ${
                    active ? "bg-gold text-navy" : "bg-navy text-gold"
                  }`}
                >
                  {initialsOf(m)}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-[12.5px] font-bold ${active ? "text-white" : "text-navy"}`}
                  >
                    {m.fullName}
                  </div>
                  <div
                    className={`truncate text-[9.5px] font-bold uppercase tracking-[0.06em] ${
                      active ? "text-white/55" : "text-taupe-2"
                    }`}
                  >
                    {ROLE_LABEL[m.role]}
                  </div>
                </div>
              </div>
              <div
                className={`mt-2.5 flex items-center justify-between text-[10.5px] font-semibold ${
                  active ? "text-white/70" : "text-taupe"
                }`}
              >
                <span>{stats.leads} leads</span>
                <span>{stats.closed} closed</span>
                <span className={active ? "text-gold" : "text-green"}>{stats.convRate}%</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
