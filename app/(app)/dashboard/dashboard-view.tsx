"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CurrentProfile } from "@/lib/supabase/profile";
import type { DashboardStats } from "./data";
import { SunIcon, MoonIcon, AlertIcon, ClockIcon, QuotationIcon, ChevronRightIcon } from "@/components/icons";
import { useTheme } from "@/components/theme";
import { NotificationBell } from "@/components/notification-bell";
import type { NotificationRow } from "@/app/(app)/notifications/actions";
import { ActivityCalendar } from "./activity-calendar";
import { BirthdayCard } from "@/components/birthday-card";
import { UpcomingAppointmentsCard, FollowUpLeadsCard, RecentLeadsCard } from "@/components/dashboard-lists";
import { QuickAction } from "./quick-action";
import { WelcomeFlourish } from "./welcome-flourish";
import { anchorFor, dateFromKey, periodStats, type Granularity } from "./calendar-period";
import { RebalanceButton } from "./rebalance-button";
import { AncGoalPanel, ApproachScoreboard } from "./anc-goal-panel";
import { ManageWidgets, DashboardClock, useWidgetPrefs } from "./widgets";
import { LeaderboardCard } from "@/app/(app)/team/performance/leaderboard-card";
import type { LeaderboardEntry } from "@/app/(app)/team/performance/leaderboard-data";

// Kamal: "leaderboard ... visible for GM, UM, AUM" and later widened to
// SuperAdmin too. Checked here as well as by the caller -- Team Performance
// is the only page that ever passes a `leaderboard` prop, but an agent's own
// profile should never render one even if it did. SuperAdmin never appears
// AS an entry (see leaderboard-data.ts) -- this only governs who can view
// the section at all.
const LEADERBOARD_ROLES: CurrentProfile["role"][] = [
  "superadmin",
  "group_manager",
  "unit_manager",
  "aspirant_unit_manager",
];

const STATUS_META = [
  { key: "cold" as const, label: "Cold", light: "#0f4c35", dark: "#2e8f68" },
  { key: "warm" as const, label: "Warm", light: "#fac748", dark: "#fac748" },
  { key: "hot" as const, label: "Hot", light: "#c9552f", dark: "#ef8b6c" },
  { key: "unassigned" as const, label: "Unassigned", light: "#cfc3ad", dark: "#55677c" },
];

function subtitleFor(profile: CurrentProfile) {
  switch (profile.role) {
    case "superadmin":
      return "Lead performance across all units";
    case "group_manager":
      return "Lead performance across your units";
    case "unit_manager":
      return `Lead performance for ${profile.unit_name ?? "your unit"}`;
    case "aspirant_unit_manager":
      return "Lead performance for you and your agents";
    default:
      return "Your lead performance";
  }
}

// The "Whole team" / "Downline team" section below Personal Sales -- title,
// hint and the AncGoalPanel eyebrow all keyed off the same kind + role so
// they can't drift out of sync with each other.
function teamSectionMeta(kind: "whole" | "downline", role: CurrentProfile["role"], memberCount: number) {
  const title = kind === "whole" ? "Whole Team Sales" : "Downline Team Sales";
  const hint =
    kind === "whole"
      ? role === "superadmin"
        ? "Everyone in the agency, combined"
        : "Everyone in your group, combined"
      : "You and your downline, combined";
  const teamLabel = `${kind === "whole" ? "Whole team" : "Downline team"} · ${memberCount} member${memberCount === 1 ? "" : "s"}`;
  return { title, hint, teamLabel };
}

function donutArcs(counts: DashboardStats["statusCounts"], total: number, dark: boolean) {
  let cumulative = 0;
  return STATUS_META.filter((s) => s.key !== "unassigned").map((s) => {
    const pct = total > 0 ? (counts[s.key] / total) * 100 : 0;
    const arc = {
      color: dark ? s.dark : s.light,
      dasharray: `${pct} ${100 - pct}`,
      dashoffset: 25 - cumulative,
    };
    cumulative += pct;
    return arc;
  });
}

function deltaPct(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "\u2014" : "new";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

function fmtRM(n: number) {
  return `RM ${n >= 1000 ? (n / 1000).toFixed(1) + "k" : n.toFixed(0)}`;
}


export function DashboardView({
  profile,
  stats,
  teamSales,
  primaryVariant = "personal",
  mobileTitle = "Dashboard",
  notifications,
  today,
  leaderboard,
}: {
  profile: CurrentProfile;
  stats: DashboardStats;
  /** The viewer's team, aggregated -- absent for an agent (no team) and in
   *  monitor mode (that already shows the monitored person's own scope). */
  teamSales?: { goal: DashboardStats["goal"]; kind: "whole" | "downline"; role: CurrentProfile["role"] } | null;
  /** "team" swaps the primary Sales section's own wording to match what
   *  `stats` actually holds -- Team Performance renders this same view with
   *  a team-wide `stats`, not a personal one, so its own goal card has to
   *  read as "Team Sales", not "Personal Sales". */
  primaryVariant?: "personal" | "team";
  /** The mobile app bar's own title -- "Dashboard" everywhere this view is
   *  the whole page. Team Performance renders its own plain title above this
   *  same view, and that title scrolls away under this bar's sticky navy one
   *  once the page is scrolled, so it passes its own name here rather than
   *  leaving "Dashboard" as the thing left on screen. */
  mobileTitle?: string;
  notifications: NotificationRow[];
  /** Today in Malaysia, computed on the server. See dateFromKey for why. */
  today: string;
  /** This calendar year's agent leaderboard -- only Team Performance passes
   *  this, and only for GM/UM/AUM roles (see LEADERBOARD_ROLES above, which
   *  this component re-checks against `profile.role` regardless of what the
   *  caller sends). Absent everywhere else. */
  leaderboard?: LeaderboardEntry[] | null;
}) {
  // Theme is system-wide now: the class lives on <html> and is shared with
  // every other screen, so this only reads it (for the donut's colours) and
  // writes through the same helper the sidebar toggle uses.
  const { dark, setDark } = useTheme();
  const toggleTheme = setDark;

  // The calendar's period drives the headline cards: paging it back to August
  // makes them report August. All four figures are derived from the same
  // per-day rows the grid draws, so a card can never contradict the calendar.
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [offset, setOffset] = useState(0);
  // "Now" comes from the server rather than the clock: this tree renders on a
  // UTC server and hydrates in UTC+8, and for eight hours of every day the two
  // disagree about what the date is -- which showed up in production as a
  // hydration text mismatch and wrong figures on the first paint.
  const now = useMemo(() => dateFromKey(today), [today]);
  const period = useMemo(
    () => periodStats(stats.calendarDays, anchorFor(granularity, offset, now), now),
    [stats.calendarDays, granularity, offset, now],
  );
  const calendarProps = {
    days: stats.calendarDays,
    startKey: stats.calendarStartKey,
    today,
    granularity,
    offset,
    onGranularityChange: setGranularity,
    onOffsetChange: (updater: (o: number) => number) => setOffset(updater),
  };

  const arcs = donutArcs(stats.statusCounts, stats.statusTotal, dark);
  const widgets = useWidgetPrefs();
  const teamMeta = teamSales
    ? teamSectionMeta(teamSales.kind, teamSales.role, teamSales.goal.memberCount)
    : null;
  // Team Performance passes `primaryVariant="team"` with no `teamSales` of
  // its own (its `stats` already is the team-wide figures) -- this is that
  // card's eyebrow, built from the same memberCount the goal itself carries.
  const primaryTeamLabel = `Team · ${stats.goal.memberCount} member${stats.goal.memberCount === 1 ? "" : "s"}`;

  const showLeaderboard = leaderboard != null && LEADERBOARD_ROLES.includes(profile.role);
  const leaderboardYear = today.slice(0, 4);

  // The mobile Sales/Calendar stack becomes a swipeable carousel -- Personal
  // Sales, then Team/Downline Sales if this scope has one, then the
  // Leaderboard if this role gets one, then the Activity Calendar. Built
  // here rather than inline in the JSX below so the same panel list can
  // report its own length (a single surviving panel renders flat, no
  // carousel chrome, if a widget toggle leaves only one of these on).
  const personalSalesPanel = (
    <section>
      <SectionLabel
        title={primaryVariant === "team" ? "Team Sales" : "Personal Sales"}
        hint={primaryVariant === "team" ? "Everyone in scope, combined" : "Your own cases and targets"}
      />
      <AncGoalPanel
        goal={stats.goal}
        variant={primaryVariant}
        teamLabel={primaryVariant === "team" ? primaryTeamLabel : undefined}
      />
    </section>
  );
  const teamSalesPanel = teamSales && teamMeta ? (
    <section>
      <SectionLabel title={teamMeta.title} hint={teamMeta.hint} />
      <AncGoalPanel goal={teamSales.goal} variant="team" teamLabel={teamMeta.teamLabel} />
    </section>
  ) : null;
  const leaderboardPanel = showLeaderboard && leaderboard ? (
    <section>
      <SectionLabel title="Agent Leaderboard" hint={`${leaderboardYear} inforced ANC, ranked`} />
      <LeaderboardCard entries={leaderboard} year={leaderboardYear} />
    </section>
  ) : null;

  const mobileCarouselPanels: { key: string; node: React.ReactNode }[] = [];
  if (widgets.on("goal")) {
    mobileCarouselPanels.push({ key: "personal-sales", node: personalSalesPanel });
    if (teamSalesPanel) mobileCarouselPanels.push({ key: "team-sales", node: teamSalesPanel });
    if (leaderboardPanel) mobileCarouselPanels.push({ key: "leaderboard", node: leaderboardPanel });
  }
  if (widgets.on("calendar")) {
    mobileCarouselPanels.push({ key: "calendar", node: <ActivityCalendar {...calendarProps} compact /> });
  }

  return (
    <div>
      <WelcomeFlourish firstName={profile.full_name.split(" ")[0] || profile.full_name} />

      {/* Desktop */}
      <div className="hidden bg-cream dark:bg-[#0b1a2b] lg:block">
        <div className="flex items-start gap-4 border-b border-sand bg-white px-[30px] py-5 dark:border-white/10 dark:bg-[#12283f]">
          <div className="flex-1">
            <div className="text-2xl font-extrabold tracking-[-0.025em] text-navy dark:text-[#eef3f8]">
              Dashboard
            </div>
            <div className="mt-[3px] text-[13px] font-medium text-muted dark:text-[#7f93aa]">
              {subtitleFor(profile)}
            </div>
          </div>
          <QuickAction />
          <NotificationBell initial={notifications} />
          <ThemeToggle dark={dark} onChange={toggleTheme} />
          <ManageWidgets on={widgets.on} toggle={widgets.toggle} showAll={widgets.showAll} hiddenCount={widgets.hiddenCount} />
          <DashboardClock />
        </div>

        <div className="flex flex-col gap-[18px] px-[30px] py-[22px] pb-[30px]">
          {/* Sales first, and kept apart from lead volume: what has closed and
              what is still to close are two different questions, and mixing
              them in one row made the money read as just another counter. */}
          {widgets.on("goal") && (
            <section>
              <SectionLabel
                title={primaryVariant === "team" ? "Team Sales" : "Personal Sales"}
                hint={primaryVariant === "team" ? "Everyone in scope, combined" : "Your own cases and targets"}
              />
              <AncGoalPanel
                goal={stats.goal}
                variant={primaryVariant}
                teamLabel={primaryVariant === "team" ? primaryTeamLabel : undefined}
              />
              {teamSales && teamMeta && (
                <div className="mt-3">
                  <SectionLabel title={teamMeta.title} hint={teamMeta.hint} />
                  <AncGoalPanel goal={teamSales.goal} variant="team" teamLabel={teamMeta.teamLabel} />
                </div>
              )}
              {/* Desktop gets a plain block, not a swiped one -- Kamal only
                  asked for the leaderboard to swipe on mobile. */}
              {leaderboardPanel && <div className="mt-3">{leaderboardPanel}</div>}
            </section>
          )}

          {widgets.on("calendar") && <ActivityCalendar {...calendarProps} />}

          {widgets.on("leads") && (
            <section>
              <SectionLabel title="Leads" hint="What is coming in, and what it could be worth" />
              {/* Daily approach leads the row now -- how much work happened
                  sits directly beside how many leads it produced. Given a
                  little extra width: it packs six day cells, the plain
                  counters only one number. */}
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-3">
                <ApproachScoreboard days={period.approachDays} target={stats.goal.approachTargetPerDay} />
                <StatCard
                  label={period.dayLabel}
                  value={period.dayCount}
                  delta={
                    period.dayCount - period.dayPrevCount === 0
                      ? "Same as the day before"
                      : `${period.dayCount > period.dayPrevCount ? "+" : ""}${period.dayCount - period.dayPrevCount} vs day before`
                  }
                  positive={period.dayCount >= period.dayPrevCount}
                />
                <StatCard
                  label={period.weekLabel}
                  value={period.weekCount}
                  delta={deltaPct(period.weekCount, period.weekPrevCount)}
                  positive={period.weekCount >= period.weekPrevCount}
                />
                <StatCard
                  label={period.monthLabel}
                  value={period.monthCount}
                  delta={stats.monthTarget > 0 ? `target ${stats.monthTarget}` : "no target set"}
                  muted
                />
                {/* Potential, not banked -- so it belongs with the leads it
                    is sitting in, not with the closings. */}
                <div className="rounded-2xl bg-navy px-3.5 py-3 dark:bg-[#12283f] dark:ring-1 dark:ring-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-white/60">Pipeline value</span>
                    <span className="flex h-[24px] w-[24px] items-center justify-center rounded-[8px] bg-gold/[.18]">
                      <QuotationIcon width={13} height={13} className="text-gold" />
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-[22px] font-extrabold tracking-[-0.03em] text-white">
                      {fmtRM(stats.pipelineValue)}
                    </span>
                    <span className="text-[11px] font-bold text-gold">ANC</span>
                  </div>
                  <div className="text-[10px] font-medium text-white/45">Potential ANC · monthly x 12</div>
                </div>
              </div>
            </section>
          )}

          {widgets.on("alerts") && (
          <div className="grid grid-cols-3 gap-3.5">
            <AlertCard
              tone="red"
              icon={<AlertIcon width={17} height={17} />}
              title="Overdue follow-up"
              value={stats.overdueCount}
              detail={
                stats.overdueCount > 0
                  ? `leads · oldest ${stats.overdueOldestDays} day${stats.overdueOldestDays === 1 ? "" : "s"}`
                  : "leads"
              }
              cta="Open these leads"
              href="/leads?view=overdue"
            />
            <AlertCard
              tone="blue"
              icon={<ClockIcon width={17} height={17} />}
              title="Follow up today"
              value={stats.followUpTodayCount}
              detail="leads to reach"
              cta="Start calling"
              href="/leads?view=followup_today"
            />
            <AlertCard
              tone="gold"
              icon={<QuotationIcon width={17} height={17} />}
              title="No quotation yet"
              value={stats.noQuotationCount}
              detail="contacted leads"
              cta="Build estimate"
              href="/leads?view=no_quotation"
            />
          </div>
          )}

          {/* What is coming up, who needs a follow-up, who just arrived, and
              whose birthday it is -- the "what should I do next" lists, side
              by side. */}
          {(widgets.on("appointments") || widgets.on("followup") || widgets.on("recent") || widgets.on("birthdays")) && (
            <div className="grid grid-cols-4 gap-3.5">
              {widgets.on("appointments") && <UpcomingAppointmentsCard appointments={stats.upcomingAppointments} />}
              {widgets.on("followup") && <FollowUpLeadsCard leads={stats.followUpLeads} />}
              {widgets.on("recent") && <RecentLeadsCard leads={stats.recentLeads} />}
              {widgets.on("birthdays") && <BirthdayCard birthdays={stats.birthdays} scrollable />}
            </div>
          )}

          {widgets.on("analytics") && (<>
          <div className="grid grid-cols-2 gap-[18px]">
            <div className="rounded-[18px] border border-sand bg-white p-5 pb-[22px] dark:border-white/10 dark:bg-[#12283f]">
              <div className="text-[15.5px] font-bold text-navy dark:text-[#eef3f8]">
                Lead status distribution
              </div>
              <div className="mt-[18px] flex items-center gap-[26px]">
                <div className="relative h-[132px] w-[132px] flex-none">
                  <svg width={132} height={132} viewBox="0 0 42 42">
                    <circle
                      cx="21" cy="21" r="15.9" fill="none"
                      stroke={dark ? "rgba(255,255,255,.09)" : "#f0e8dc"}
                      strokeWidth="6"
                    />
                    {arcs.map((a, i) => (
                      <circle
                        key={i}
                        cx="21" cy="21" r="15.9" fill="none"
                        stroke={a.color}
                        strokeWidth="6"
                        strokeDasharray={a.dasharray}
                        strokeDashoffset={a.dashoffset}
                        strokeLinecap="round"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[26px] font-extrabold tracking-[-0.03em] text-navy dark:text-[#eef3f8]">
                      {stats.totalLeads}
                    </span>
                    <span className="text-[10.5px] font-semibold text-taupe dark:text-[#7f93aa]">
                      total leads
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {STATUS_META.map((s) => {
                    const count = stats.statusCounts[s.key as keyof typeof stats.statusCounts] ?? (s.key === "unassigned" ? stats.statusCounts.unassigned : 0);
                    const pct = stats.statusTotal > 0 ? Math.round((count / stats.statusTotal) * 100) : 0;
                    return (
                      <div
                        key={s.key}
                        className="flex items-center gap-2.5 rounded-[10px] bg-cream px-3 py-[9px] dark:bg-white/5"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: dark ? s.dark : s.light }}
                        />
                        <span className="flex-1 text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">
                          {s.label}
                        </span>
                        <span className="text-[13px] font-extrabold text-navy dark:text-[#eef3f8]">
                          {count}
                        </span>
                        <span className="text-[11px] font-semibold text-taupe dark:text-[#7f93aa]">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-sand bg-white p-5 pb-[22px] dark:border-white/10 dark:bg-[#12283f]">
              <div className="flex items-baseline justify-between">
                <div className="text-[15.5px] font-bold text-navy dark:text-[#eef3f8]">
                  Lead source quality
                </div>
                <span className="text-[11.5px] font-semibold text-muted dark:text-[#7f93aa]">
                  volume · close rate
                </span>
              </div>
              <div className="mt-[18px] flex flex-col gap-3.5">
                {stats.leadSources.length === 0 && (
                  <p className="text-[13px] text-muted dark:text-[#7f93aa]">
                    No leads yet to break down by source.
                  </p>
                )}
                {stats.leadSources.map((s) => (
                  <div key={s.source}>
                    <div className="mb-[5px] flex items-baseline justify-between text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">
                      <span>{s.source}</span>
                      <span>
                        {s.count} · <span className="text-green dark:text-[#2e8f68]">{s.closeRate}%</span>
                      </span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-lg bg-sand dark:bg-white/10">
                      <div
                        className="bg-navy dark:bg-[#eef3f8]"
                        style={{ width: `${s.volumePct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1.35fr_1fr] gap-[18px]">
            <div className="rounded-[18px] border border-sand bg-white p-5 pb-4 dark:border-white/10 dark:bg-[#12283f]">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-[15.5px] font-bold text-navy dark:text-[#eef3f8]">
                    Leads in · closed out
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-muted dark:text-[#7f93aa]">
                    Daily, last 14 days
                  </div>
                </div>
                <div className="flex gap-3.5 text-[11px] font-semibold text-muted dark:text-[#7f93aa]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-[9px] w-[9px] rounded-[3px] bg-navy dark:bg-[#eef3f8]" />
                    New
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-[9px] w-[9px] rounded-[3px] bg-gold" />
                    Closed won
                  </span>
                </div>
              </div>
              <svg viewBox="0 0 700 170" className="mt-3 h-[170px] w-full">
                <g>
                  {stats.dailyBuckets.map((d, i) => {
                    const x = 8 + i * 48;
                    const inH = Math.round((d.inCount / stats.maxDaily) * 116);
                    const outH = Math.round((d.outCount / stats.maxDaily) * 116);
                    return (
                      <g key={d.key}>
                        <rect x={x} y={142 - inH} width={20} height={Math.max(inH, 2)} rx={4} fill={dark ? "#eef3f8" : "#0f2540"} />
                        <rect x={x + 22} y={142 - outH} width={12} height={Math.max(outH, outH > 0 ? outH : 0)} rx={3} fill="#fac748" />
                      </g>
                    );
                  })}
                </g>
                <line x1={0} y1={142} x2={700} y2={142} stroke={dark ? "rgba(255,255,255,.15)" : "#e7ded0"} strokeWidth={1.5} />
                <g fill={dark ? "#7f93aa" : "#a29883"} fontFamily="Poppins, sans-serif" fontSize={11} fontWeight={600} textAnchor="middle">
                  {stats.dailyBuckets
                    .filter((_, i) => i % 3 === 0)
                    .map((d, i) => (
                      <text key={d.key} x={8 + (i * 3) * 48 + 10} y={162}>{d.day}</text>
                    ))}
                </g>
              </svg>
            </div>

            <div className="rounded-[18px] border border-sand bg-white p-5 pb-[22px] dark:border-white/10 dark:bg-[#12283f]">
              <div className="flex items-baseline justify-between">
                <div className="text-[15.5px] font-bold text-navy dark:text-[#eef3f8]">
                  Lead assignment
                </div>
                {stats.isManager && <RebalanceButton />}
              </div>
              {!stats.isManager ? (
                <p className="mt-4 text-[13px] text-muted dark:text-[#7f93aa]">
                  Assignment breakdown is visible to unit managers and above.
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-2.5">
                  {stats.assignment.length === 0 && stats.unassignedPool === 0 && (
                    <p className="text-[13px] text-muted dark:text-[#7f93aa]">
                      No leads assigned yet.
                    </p>
                  )}
                  {stats.assignment.map((a) => (
                    <div key={a.name} className="flex items-center gap-[11px]">
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] bg-navy text-[10px] font-bold text-gold dark:bg-[#0b1a2b]">
                        {a.initials}
                      </span>
                      <span className="flex-1 truncate text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">
                        {a.name}
                      </span>
                      <div className="h-[7px] w-24 overflow-hidden rounded-lg bg-sand dark:bg-white/10">
                        <div className="h-full bg-navy dark:bg-[#eef3f8]" style={{ width: `${a.barPct}%` }} />
                      </div>
                      <span className="w-[22px] text-right text-[12.5px] font-extrabold text-navy dark:text-[#eef3f8]">
                        {a.count}
                      </span>
                    </div>
                  ))}
                  {stats.unassignedPool > 0 && (
                    <div className="flex items-center gap-[11px] border-t border-sand-3 pt-2.5 dark:border-white/10">
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] bg-sand-3 text-[10px] font-bold text-taupe-2 dark:bg-white/10 dark:text-[#7f93aa]">
                        —
                      </span>
                      <span className="flex-1 text-[12.5px] font-semibold text-taupe-2 dark:text-[#7f93aa]">
                        Unassigned pool
                      </span>
                      <span className="text-[12.5px] font-extrabold text-navy dark:text-[#eef3f8]">
                        {stats.unassignedPool}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          </>)}
        </div>
      </div>

      {/* Mobile */}
      <div className="bg-cream dark:bg-[#0b1a2b] lg:hidden">
        <div className="sticky top-0 z-20 lg:static bg-navy/85 backdrop-blur-md px-5 pt-3.5 pb-5 text-white lg:bg-navy lg:backdrop-blur-none dark:bg-[#12283f]/85 lg:dark:bg-[#12283f] dark:border-b dark:border-white/[.07]">
          <div className="flex items-center gap-[11px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-gold text-sm font-bold text-navy">
              {profile.avatar_initials}
            </div>
            <div className="flex-1">
              <div className="text-[11.5px] font-medium text-white/55 dark:text-[#7f93aa]">
                {profile.full_name}
              </div>
              <div className="text-[15.5px] font-bold">{mobileTitle}</div>
            </div>
            <QuickAction compact />
            <NotificationBell initial={notifications} compact />
            <ThemeToggle dark={dark} onChange={toggleTheme} compact />
          </div>
          {/* Clock and widget control on their own line -- five controls in
              one row does not fit a phone. */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <DashboardClock compact />
            <ManageWidgets
              compact
              on={widgets.on}
              toggle={widgets.toggle}
              showAll={widgets.showAll}
              hiddenCount={widgets.hiddenCount}
            />
          </div>
        </div>

        <div className="flex flex-col gap-[11px] px-5 pt-4">
          {/* Personal Sales, Team/Downline Sales, Leaderboard and the
              Activity Calendar -- whichever of these are switched on -- swipe
              as one horizontal carousel instead of stacking. See
              mobileCarouselPanels above for the order and gating. */}
          <MobileCardCarousel panels={mobileCarouselPanels} />

          {widgets.on("leads") && (
            <section className="flex flex-col gap-2.5">
              <SectionLabel title="Leads" hint="Coming in, and what it could be worth" />
              <ApproachScoreboard days={period.approachDays} target={stats.goal.approachTargetPerDay} />
              <div className="rounded-2xl bg-navy p-3.5 dark:bg-[#12283f] dark:ring-1 dark:ring-white/10">
                <div className="grid grid-cols-3 gap-2">
                  <MobileStat value={period.dayCount} label="Day" />
                  <MobileStat value={period.weekCount} label="Week" />
                  <MobileStat value={period.monthCount} label="Month" />
                </div>
                <div className="mt-2 flex items-baseline justify-between rounded-[13px] bg-white/10 px-3.5 py-2.5">
                  <span className="text-[10.5px] font-bold text-white/60">Pipeline value · ANC</span>
                  <span className="text-[17px] font-extrabold tracking-[-0.03em] text-white">
                    {fmtRM(stats.pipelineValue)}
                  </span>
                </div>
              </div>
            </section>
          )}

          {widgets.on("alerts") && (<>
            <MobileAlert href="/leads?view=overdue" tone="red" value={stats.overdueCount} title="Overdue follow-up" detail={stats.overdueOldestDays > 0 ? `Oldest is ${stats.overdueOldestDays} day${stats.overdueOldestDays === 1 ? "" : "s"} old` : "All caught up"} />
            <MobileAlert href="/leads?view=followup_today" tone="blue" value={stats.followUpTodayCount} title="Follow up today" detail={`${stats.followUpBeforeNoon} before noon`} />
            <MobileAlert href="/leads?view=no_quotation" tone="gold" value={stats.noQuotationCount} title="No quotation yet" detail="Build an estimate in 30 sec" />
          </>)}

          {widgets.on("appointments") && <UpcomingAppointmentsCard appointments={stats.upcomingAppointments} />}
          {widgets.on("followup") && <FollowUpLeadsCard leads={stats.followUpLeads} />}
          {widgets.on("recent") && <RecentLeadsCard leads={stats.recentLeads} />}
          {widgets.on("birthdays") && <BirthdayCard birthdays={stats.birthdays} scrollable />}

          {widgets.on("analytics") && (
          <div className="rounded-2xl border border-sand bg-white p-4 pb-[15px] dark:border-white/10 dark:bg-[#12283f]">
            <div className="text-[13.5px] font-bold text-navy dark:text-[#eef3f8]">Lead status</div>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-[84px] w-[84px] flex-none">
                <svg width={84} height={84} viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.9" fill="none" stroke={dark ? "rgba(255,255,255,.09)" : "#f0e8dc"} strokeWidth="6" />
                  {arcs.map((a, i) => (
                    <circle key={i} cx="21" cy="21" r="15.9" fill="none" stroke={a.color} strokeWidth="6" strokeDasharray={a.dasharray} strokeDashoffset={a.dashoffset} strokeLinecap="round" />
                  ))}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[17px] font-extrabold text-navy dark:text-[#eef3f8]">
                  {stats.totalLeads}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                {STATUS_META.map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="h-[7px] w-[7px] rounded-full" style={{ background: dark ? s.dark : s.light }} />
                    <span className="flex-1 text-xs font-semibold text-navy dark:text-[#cfd9e4]">{s.label}</span>
                    <span className="text-xs font-extrabold text-navy dark:text-[#eef3f8]">{stats.statusCounts[s.key]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

// A horizontal, one-card-per-swipe carousel for the mobile Sales/Calendar
// stack -- same snap-scroll technique app/(app)/pipeline/mobile-board.tsx
// already uses for its stage columns (snap-x snap-mandatory scroller, a
// rAF-throttled onScroll to track the active panel, dots to jump between
// them). A single surviving panel (e.g. an agent with no team and the
// calendar switched off) renders flat with no carousel chrome at all, since
// there is nothing to swipe between.
function MobileCardCarousel({ panels }: { panels: { key: string; node: React.ReactNode }[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleScroll = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollerRef.current;
      if (!el || el.clientWidth === 0) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      const clamped = Math.min(Math.max(idx, 0), panels.length - 1);
      setActive(clamped);
    });
  }, [panels.length]);

  function goTo(idx: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
    setActive(idx);
  }

  if (panels.length === 0) return null;
  if (panels.length === 1) return <>{panels[0].node}</>;

  const clampedActive = Math.min(active, panels.length - 1);

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {panels.map((p) => (
          <div key={p.key} className="w-full flex-none snap-start snap-always">
            {p.node}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-center gap-1.5">
        {panels.map((p, i) => (
          <button
            key={p.key}
            type="button"
            aria-label={`Show ${p.key.replace(/-/g, " ")}`}
            onClick={() => goTo(i)}
            className={`h-[6px] w-[6px] rounded-full transition-colors ${
              i === clampedActive ? "bg-navy dark:bg-gold" : "bg-sand-2 dark:bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function ThemeToggle({ dark, onChange, compact }: { dark: boolean; onChange: (v: boolean) => void; compact?: boolean }) {
  const pillClass = compact
    ? "flex rounded-full bg-white/[.08] p-[3px]"
    : "flex items-center rounded-full border border-sand-2 bg-cream p-[3px] dark:border-white/10 dark:bg-[#0b1a2b]";
  const size = compact ? "h-6 w-7" : "h-[26px] w-[30px]";
  // Compact (mobile) sits on a navy header, so the active pill uses gold for
  // both states (navy would vanish against the navy background); the
  // full-size desktop toggle keeps navy for light-active / gold for dark-active.
  const lightActiveBg = compact ? "bg-gold" : "bg-navy";
  const lightActiveIcon = compact ? "text-navy" : "text-gold";
  const inactiveIcon = compact ? "text-white/55" : "text-taupe dark:text-[#7f93aa]";
  return (
    <div className={pillClass}>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex ${size} items-center justify-center rounded-full ${!dark ? lightActiveBg : ""}`}
        aria-label="Light mode"
      >
        <SunIcon width={13} height={13} className={!dark ? lightActiveIcon : inactiveIcon} />
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex ${size} items-center justify-center rounded-full ${dark ? "bg-gold" : ""}`}
        aria-label="Dark mode"
      >
        <MoonIcon width={13} height={13} className={dark ? "text-navy" : inactiveIcon} />
      </button>
    </div>
  );
}

// Sales and Leads are the two halves of this page. Naming them is the whole
// point -- without it the money and the volume read as one undifferentiated
// row of numbers.
function SectionLabel({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-navy dark:text-[#eef3f8]">
        {title}
      </span>
      <span className="text-[11.5px] font-medium text-taupe dark:text-[#7f93aa]">{hint}</span>
    </div>
  );
}

function StatCard({
  label, value, delta, positive, muted,
}: {
  label: string; value: number; delta: string; positive?: boolean; muted?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-sand bg-white px-3.5 py-3 dark:border-white/10 dark:bg-[#12283f]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted dark:text-[#7f93aa]">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[24px] font-extrabold tracking-[-0.03em] text-navy dark:text-[#eef3f8]">
          {value}
        </span>
        <span
          className={
            muted
              ? "text-[11px] font-bold text-muted dark:text-[#7f93aa]"
              : positive
                ? "text-[11px] font-bold text-green dark:text-[#2e8f68]"
                : "text-[11px] font-bold text-alert-red dark:text-[#ef8b6c]"
          }
        >
          {delta}
        </span>
      </div>
    </div>
  );
}

const ALERT_TONES = {
  red: {
    bg: "bg-[#fff6f4] border-[#f6d5cf] dark:bg-[rgba(201,85,47,.14)] dark:border-[rgba(201,85,47,.35)]",
    title: "text-[#7d251d] dark:text-[#f3c3b2]",
    value: "text-alert-red dark:text-[#ef8b6c]",
    detail: "text-[#9a6259] dark:text-[#b98d7d]",
    cta: "border-[#f6d5cf] text-alert-red dark:border-transparent dark:bg-white/10 dark:text-[#f3c3b2]",
  },
  blue: {
    bg: "bg-[#f2f7fc] border-[#d7e4f0] dark:bg-[rgba(120,170,220,.12)] dark:border-[rgba(120,170,220,.28)]",
    title: "text-info-blue-text dark:text-[#cfe1f2]",
    value: "text-info-blue-text dark:text-[#8fbde8]",
    detail: "text-[#5d7690] dark:text-[#8ba3ba]",
    cta: "border-[#d7e4f0] text-info-blue-text dark:border-transparent dark:bg-white/10 dark:text-[#cfe1f2]",
  },
  gold: {
    bg: "bg-warn-gold-bg border-[#f7e9c2] dark:bg-[rgba(250,199,72,.13)] dark:border-[rgba(250,199,72,.3)]",
    title: "text-warn-gold-text dark:text-[#f3e0b4]",
    value: "text-warn-gold-text dark:text-gold",
    detail: "text-[#98793a] dark:text-[#b0a077]",
    cta: "bg-navy text-white border-transparent dark:bg-white/10 dark:text-[#f3e0b4]",
  },
} as const;

function AlertCard({
  tone, icon, title, value, detail, cta, href,
}: {
  tone: keyof typeof ALERT_TONES; icon: React.ReactNode; title: string; value: number; detail: string; cta: string; href: string;
}) {
  const t = ALERT_TONES[tone];
  return (
    <Link href={href} title={cta} className={`press flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${t.bg}`}>
      <span className={`flex-none ${t.value}`}>{icon}</span>
      <span className={`flex-none text-[26px] font-extrabold tracking-[-0.03em] leading-none ${t.value}`}>
        {value}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[12.5px] font-bold ${t.title}`}>{title}</span>
        <span className={`block truncate text-[11px] font-semibold ${t.detail}`}>{detail}</span>
      </span>
      <ChevronRightIcon width={15} height={15} className={`flex-none ${t.value}`} />
    </Link>
  );
}

function MobileStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-1 rounded-[13px] border border-white/[.09] bg-white/[.07] px-3 py-[11px] dark:border-white/[.08] dark:bg-white/5">
      <div className="text-[22px] font-extrabold tracking-[-0.03em] text-white">{value}</div>
      <div className="text-[10px] font-medium text-white/60 dark:text-[#7f93aa]">{label}</div>
    </div>
  );
}

function MobileAlert({
  tone, value, title, detail, href,
}: {
  tone: keyof typeof ALERT_TONES; value: number; title: string; detail: string; href: string;
}) {
  const t = ALERT_TONES[tone];
  return (
    <Link href={href} className={`flex items-center gap-3 rounded-2xl border p-3.5 ${t.bg}`}>
      <span className={`text-[26px] font-extrabold tracking-[-0.03em] ${t.value}`}>{value}</span>
      <div className="flex-1">
        <div className={`text-[13.5px] font-bold ${t.title}`}>{title}</div>
        <div className={`text-[11.5px] font-medium ${t.detail}`}>{detail}</div>
      </div>
      <ChevronRightIcon width={17} height={17} className={t.value} />
    </Link>
  );
}
