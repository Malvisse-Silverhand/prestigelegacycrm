"use client";

import { useEffect, useState } from "react";
import type { CurrentProfile } from "@/lib/supabase/profile";
import type { DashboardStats } from "./data";
import { SunIcon, MoonIcon, AlertIcon, ClockIcon, QuotationIcon, ChevronRightIcon } from "@/components/icons";

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
    default:
      return "Your lead performance";
  }
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

function fmtRM(n: number) {
  return `RM ${n >= 1000 ? (n / 1000).toFixed(1) + "k" : n.toFixed(0)}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function DashboardView({
  profile,
  stats,
}: {
  profile: CurrentProfile;
  stats: DashboardStats;
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("pl-dashboard-theme");
    if (saved === "dark") setDark(true);
  }, []);

  function toggleTheme(next: boolean) {
    setDark(next);
    window.localStorage.setItem("pl-dashboard-theme", next ? "dark" : "light");
  }

  const now = new Date();
  const arcs = donutArcs(stats.statusCounts, stats.statusTotal, dark);

  return (
    <div className={dark ? "dark" : ""}>
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
          <ThemeToggle dark={dark} onChange={toggleTheme} />
          <div className="flex items-center gap-[18px] rounded-[10px] border border-sand-2 bg-cream px-[14px] py-[10px] text-[12.5px] font-semibold text-navy dark:border-white/10 dark:bg-[#12283f] dark:text-[#eef3f8]">
            {now.getFullYear()}
          </div>
          <div className="flex items-center gap-[18px] rounded-[10px] border border-sand-2 bg-cream px-[14px] py-[10px] text-[12.5px] font-semibold text-navy dark:border-white/10 dark:bg-[#12283f] dark:text-[#eef3f8]">
            {MONTH_NAMES[now.getMonth()]}
          </div>
        </div>

        <div className="flex flex-col gap-[18px] px-[30px] py-[22px] pb-[30px]">
          <div className="grid grid-cols-4 gap-3.5">
            <StatCard
              label="Leads today"
              value={stats.todayCount}
              delta={
                stats.todayDelta === 0
                  ? "Same as yesterday"
                  : `${stats.todayDelta > 0 ? "+" : ""}${stats.todayDelta} vs yesterday`
              }
              positive={stats.todayDelta >= 0}
            />
            <StatCard
              label="This week"
              value={stats.weekCount}
              delta={stats.weekDeltaPct === null ? "—" : `${stats.weekDeltaPct > 0 ? "+" : ""}${stats.weekDeltaPct}%`}
              positive={(stats.weekDeltaPct ?? 0) >= 0}
            />
            <StatCard
              label="This month"
              value={stats.monthCount}
              delta={stats.monthTarget > 0 ? `target ${stats.monthTarget}` : "no target set"}
              muted
            />
            <div className="rounded-2xl bg-navy p-4 pb-[18px] dark:bg-[#12283f] dark:ring-1 dark:ring-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-semibold text-white/60">Pipeline value</span>
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-gold/[.18]">
                  <QuotationIcon width={15} height={15} className="text-gold" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[30px] font-extrabold tracking-[-0.03em] text-white">
                  {fmtRM(stats.pipelineValue)}
                </span>
                <span className="text-[11.5px] font-bold text-gold">/mo ACV</span>
              </div>
            </div>
          </div>

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
              cta="Open in pipeline"
              href="/pipeline"
            />
            <AlertCard
              tone="blue"
              icon={<ClockIcon width={17} height={17} />}
              title="Follow up today"
              value={stats.followUpTodayCount}
              detail="leads to reach"
              cta="Start calling"
              href="/pipeline"
            />
            <AlertCard
              tone="gold"
              icon={<QuotationIcon width={17} height={17} />}
              title="No quotation yet"
              value={stats.noQuotationCount}
              detail="contacted leads"
              cta="Build estimate"
              href="/quotation"
              solid
            />
          </div>

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
                {stats.isManager && (
                  <span className="cursor-default text-xs font-semibold text-green dark:text-[#2e8f68]">
                    Rebalance
                  </span>
                )}
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
        </div>
      </div>

      {/* Mobile */}
      <div className="bg-cream dark:bg-[#0b1a2b] lg:hidden">
        <div className="bg-navy px-5 pt-3.5 pb-5 text-white dark:bg-[#12283f] dark:border-b dark:border-white/[.07]">
          <div className="flex items-center gap-[11px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-gold text-sm font-bold text-navy">
              {profile.avatar_initials}
            </div>
            <div className="flex-1">
              <div className="text-[11.5px] font-medium text-white/55 dark:text-[#7f93aa]">
                {profile.full_name}
              </div>
              <div className="text-[15.5px] font-bold">Dashboard</div>
            </div>
            <ThemeToggle dark={dark} onChange={toggleTheme} compact />
          </div>
          <div className="mt-4 flex gap-2">
            <MobileStat value={stats.todayCount} label="Today" />
            <MobileStat value={stats.weekCount} label="This week" />
            <MobileStat value={stats.monthCount} label="Month" />
            <div className="flex-1 rounded-[13px] bg-gold px-3 py-[11px] text-navy">
              <div className="text-[22px] font-extrabold tracking-[-0.03em]">
                {stats.conversionRatePct}%
              </div>
              <div className="text-[10px] font-semibold text-[#5c4a1c]">Conv.</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[11px] px-5 pt-4">
          <MobileAlert tone="red" value={stats.overdueCount} title="Overdue follow-up" detail={stats.overdueOldestDays > 0 ? `Oldest is ${stats.overdueOldestDays} day${stats.overdueOldestDays === 1 ? "" : "s"} old` : "All caught up"} dark={dark} />
          <MobileAlert tone="blue" value={stats.followUpTodayCount} title="Follow up today" detail={`${stats.followUpBeforeNoon} before noon`} dark={dark} />
          <MobileAlert tone="gold" value={stats.noQuotationCount} title="No quotation yet" detail="Build an estimate in 30 sec" dark={dark} />

          <div className="mt-0.5 rounded-2xl border border-sand bg-white p-4 pb-[15px] dark:border-white/10 dark:bg-[#12283f]">
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
        </div>
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

function StatCard({
  label, value, delta, positive, muted,
}: {
  label: string; value: number; delta: string; positive?: boolean; muted?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-sand bg-white p-4 pb-[18px] dark:border-white/10 dark:bg-[#12283f]">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-semibold text-muted dark:text-[#7f93aa]">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[30px] font-extrabold tracking-[-0.03em] text-navy dark:text-[#eef3f8]">
          {value}
        </span>
        <span
          className={
            muted
              ? "text-[11.5px] font-bold text-muted dark:text-[#7f93aa]"
              : positive
                ? "text-[11.5px] font-bold text-green dark:text-[#2e8f68]"
                : "text-[11.5px] font-bold text-alert-red dark:text-[#ef8b6c]"
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
  tone, icon, title, value, detail, cta, href, solid,
}: {
  tone: keyof typeof ALERT_TONES; icon: React.ReactNode; title: string; value: number; detail: string; cta: string; href: string; solid?: boolean;
}) {
  const t = ALERT_TONES[tone];
  return (
    <div className={`rounded-2xl border p-4 pb-[18px] ${t.bg}`}>
      <div className="flex items-center gap-[9px]">
        <span className={t.value}>{icon}</span>
        <span className={`text-sm font-bold ${t.title}`}>{title}</span>
      </div>
      <div className="mt-2.5 flex items-baseline gap-[7px]">
        <span className={`text-[28px] font-extrabold tracking-[-0.03em] ${t.value}`}>{value}</span>
        <span className={`text-xs font-semibold ${t.detail}`}>{detail}</span>
      </div>
      <a
        href={href}
        className={`mt-3 inline-flex rounded-[9px] border px-[15px] py-2.5 text-[12.5px] font-semibold ${solid ? t.cta : `bg-white ${t.cta}`}`}
      >
        {cta}
      </a>
    </div>
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
  tone, value, title, detail, dark,
}: {
  tone: keyof typeof ALERT_TONES; value: number; title: string; detail: string; dark: boolean;
}) {
  const t = ALERT_TONES[tone];
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-3.5 ${t.bg}`}>
      <span className={`text-[26px] font-extrabold tracking-[-0.03em] ${t.value}`}>{value}</span>
      <div className="flex-1">
        <div className={`text-[13.5px] font-bold ${t.title}`}>{title}</div>
        <div className={`text-[11.5px] font-medium ${t.detail}`}>{detail}</div>
      </div>
      <ChevronRightIcon width={17} height={17} className={t.value} />
    </div>
  );
}
