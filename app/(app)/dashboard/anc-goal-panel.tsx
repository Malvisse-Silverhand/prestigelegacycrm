"use client";

import Link from "next/link";
import type { DashboardStats } from "./data";
import type { ApproachDay } from "./calendar-period";
import { MY_TIME_ZONE } from "@/lib/malaysia-date";

type Goal = DashboardStats["goal"];

function fmtRM(n: number) {
  return `RM${Math.round(n).toLocaleString("en-MY")}`;
}

function fmtDeadline(iso: string) {
  const d = new Date(iso);
  // The zone is pinned, not left to the viewer: a date column parses as UTC
  // midnight, so formatting it in whatever zone the renderer happens to be in
  // reports the day before for anyone west of Greenwich -- and disagrees
  // between the UTC server and the browser that hydrates it.
  return d
    .toLocaleDateString("en-MY", {
      timeZone: MY_TIME_ZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

// Where the goal should be by now, as a share of its whole window. Progress
// on its own can't say whether 47% is good -- 47% with three weeks left is
// not the same story as 47% with three days left, and the difference is the
// only thing worth putting a colour on.
function paceOf(pct: number, elapsedPct: number) {
  if (pct >= elapsedPct) return "ahead" as const;
  if (pct >= elapsedPct - 10) return "close" as const;
  return "behind" as const;
}

const PACE_STYLE = {
  ahead: {
    bar: "bg-green",
    chip: "bg-success-bg text-green",
    label: "Ahead of pace",
  },
  close: {
    bar: "bg-gold",
    chip: "bg-warn-gold-bg text-warn-gold-text",
    label: "On pace",
  },
  behind: {
    bar: "bg-alert-red",
    chip: "bg-alert-red-bg text-alert-red",
    label: "Behind pace",
  },
};

function ProgressBar({
  pct,
  tone,
  onGold,
}: {
  pct: number;
  tone: keyof typeof PACE_STYLE;
  /** The one Overall Progress card sits on gold, not navy -- the "close"
   *  tone's own bar color is gold, which would vanish against it, so that
   *  one tone swaps to navy there. Everything else still reads by color. */
  onGold?: boolean;
}) {
  const bar = onGold && tone === "close" ? "bg-navy" : PACE_STYLE[tone].bar;
  return (
    <div className={`h-[10px] w-full overflow-hidden rounded-full ${onGold ? "bg-navy/15" : "bg-white/12"}`}>
      <div
        className={`h-full rounded-full transition-[width] ${bar}`}
        style={{ width: `${Math.min(100, Math.max(pct, pct > 0 ? 2 : 0))}%` }}
      />
    </div>
  );
}

// Everything in this panel sits on navy, so the tiles are translucent white
// rather than cards -- a white card on navy reads as a hole punched in it.
function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[13px] bg-white/[.06] px-3.5 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/50">{label}</div>
      <div
        className={`mt-0.5 text-[19px] font-extrabold tracking-[-0.03em] ${
          accent ? "text-gold" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// Mon-Sat, against the daily approach target from Set Target. An "approach"
// is a lead reaching the system: the Quick Action form and every other way a
// lead gets created all count the same, so the scoreboard can't disagree with
// Leads Manager about how much work happened.
//
// Exported rather than kept private to this panel: it now renders in the
// Leads section of the dashboard, to the left of "Leads today" -- a daily
// activity count belongs next to the lead counters it feeds, not buried in
// the sales target panel.
export function ApproachScoreboard({ days, target }: { days: ApproachDay[]; target: number }) {
  const done = days.filter((d) => !d.isFuture).reduce((n, d) => n + d.count, 0);
  const weekTarget = target * days.length;

  return (
    <div className="rounded-2xl border border-sand bg-white px-3.5 py-3 dark:border-white/10 dark:bg-[#12283f]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[12.5px] font-bold text-navy dark:text-[#eef3f8]">Daily approach</div>
        {weekTarget > 0 ? (
          <div className="text-[11px] font-semibold text-taupe dark:text-[#7f93aa]">
            {done} of {weekTarget} this week
          </div>
        ) : (
          <Link href="/settings" className="text-[11px] font-semibold text-taupe hover:text-navy dark:text-[#7f93aa]">
            Set a target
          </Link>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-6 gap-1">
        {days.map((d) => {
          const hit = target > 0 && d.count >= target;
          return (
            <div
              key={d.key}
              className={`rounded-[9px] border px-1 py-1.5 text-center ${
                d.isToday
                  ? "border-navy bg-navy dark:border-gold"
                  : hit
                    ? "border-transparent bg-success-bg dark:bg-green/25"
                    : d.isFuture
                      ? "border-dashed border-sand-2 bg-transparent dark:border-white/15"
                      : "border-transparent bg-cream dark:bg-white/5"
              }`}
            >
              <div
                className={`text-[8.5px] font-bold uppercase tracking-[0.02em] ${
                  d.isToday ? "text-white/60" : "text-taupe-2 dark:text-[#7f93aa]"
                }`}
              >
                {d.label.slice(0, 3)}
              </div>
              <div
                className={`text-[14px] font-extrabold ${
                  d.isToday
                    ? "text-white"
                    : hit
                      ? "text-green"
                      : d.isFuture
                        ? "text-taupe"
                        : "text-navy dark:text-[#eef3f8]"
                }`}
              >
                {d.isFuture ? "–" : d.count}
              </div>
              {target > 0 && (
                <div
                  className={`text-[8.5px] font-semibold ${
                    d.isToday ? "text-white/45" : "text-taupe dark:text-[#7f93aa]"
                  }`}
                >
                  /{target}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AncGoalPanel({
  goal,
  closing,
}: {
  goal: Goal;
  /** This month's closings -- money already in, so it belongs with the
   *  sales figures rather than up among the lead counters. */
  closing: { label: string; anc: number; count: number };
}) {
  const { campaign } = goal;

  // A campaign paces against its own window; without one, the month is the
  // window and the figures come from Set Target instead.
  const headline = campaign
    ? {
        eyebrow: `${campaign.name} · Road to ${fmtRM(campaign.targetAnc)}`,
        deadline: fmtDeadline(campaign.deadline),
        current: campaign.currentAnc,
        target: campaign.targetAnc,
        remaining: campaign.remaining,
        pct: campaign.achievementPct,
        elapsedPct: campaign.elapsedPct,
        weeklyNeeded: campaign.weeklyNeeded,
        casesNeeded: campaign.casesNeeded,
        footnote:
          campaign.daysLeft > 0
            ? `${campaign.daysLeft} day${campaign.daysLeft === 1 ? "" : "s"} left`
            : "Deadline reached",
      }
    : {
        eyebrow: "Monthly ANC target",
        deadline: null,
        current: goal.monthAnc,
        target: goal.monthAncTarget,
        remaining: goal.monthAncRemaining,
        pct: goal.monthAncPct ?? 0,
        elapsedPct: goal.monthElapsedPct,
        weeklyNeeded: goal.weekAncTarget,
        casesNeeded: goal.casesNeededThisMonth,
        footnote: null,
      };

  // Nothing to pace against: rather than a card full of zeroes, point at the
  // one screen that fixes it.
  if (headline.target <= 0) {
    return (
      <div className="rounded-2xl bg-navy p-4 dark:ring-1 dark:ring-white/10 lg:p-5">
        <div className="text-[13px] font-bold text-white">No ANC target set</div>
        <div className="mt-0.5 text-[12px] font-medium text-white/60">
          Set a monthly ANC target — or a goal with a deadline — in{" "}
          <Link href="/settings" className="font-semibold text-gold underline underline-offset-2">
            Settings › Set Target
          </Link>
          , and this becomes your progress tracker.
        </div>
        <div className="mt-3 rounded-[13px] bg-gold p-3.5">
          <div className="text-[11px] font-bold text-navy/70">{closing.label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[24px] font-extrabold tracking-[-0.03em] text-navy">
              {fmtRM(closing.anc)}
            </span>
            <span className="text-[11px] font-bold text-navy/70">ANC</span>
          </div>
          <div className="text-[10.5px] font-semibold text-navy/70">
            {closing.count} polic{closing.count === 1 ? "y" : "ies"} inforced
          </div>
        </div>
      </div>
    );
  }

  const tone = paceOf(headline.pct, headline.elapsedPct);
  const style = PACE_STYLE[tone];

  return (
    <div className="rounded-2xl bg-navy p-4 dark:ring-1 dark:ring-white/10 lg:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold">
            {headline.eyebrow}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[17px] font-extrabold tracking-[-0.02em] text-white">
              Overall target progress
            </span>
            {headline.deadline && (
              <span className="rounded-[6px] bg-white/10 px-2 py-[3px] text-[9.5px] font-bold tracking-[0.06em] text-white">
                {headline.deadline}
              </span>
            )}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${style.chip}`}>
          {style.label} · {headline.pct}%
        </span>
      </div>

      {/* Gold, navy text: the one card in this panel meant to be read first,
          which is also why it now sits above the tiles rather than below
          them. */}
      <div className="mt-3.5 rounded-[13px] bg-gold p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-navy/70">
            Overall progress
          </span>
          <span className="text-[11px] font-semibold text-navy/70">{headline.footnote}</span>
        </div>
        <div className="mt-2">
          <ProgressBar pct={headline.pct} tone={tone} onGold />
        </div>
        <div className="mt-2 text-[11.5px] font-medium text-navy/80">
          {tipFor(tone, headline.remaining, headline.weeklyNeeded, headline.casesNeeded, goal.avgCaseSize)}
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile label="Current ANC" value={fmtRM(headline.current)} accent />
        <Tile label="Target" value={fmtRM(headline.target)} />
        <Tile label="Remaining" value={fmtRM(headline.remaining)} />
        <Tile label="Achievement" value={`${headline.pct}%`} />
      </div>

      <div className="mt-2.5 grid gap-2.5 lg:grid-cols-2">
        <div className="rounded-[13px] bg-white/[.06] p-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12.5px] font-bold text-white">This month</span>
            <span className="text-[11px] font-semibold text-white/50">
              {fmtRM(goal.monthAnc)}
              {goal.monthAncTarget > 0 ? ` of ${fmtRM(goal.monthAncTarget)}` : ""}
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar
              pct={goal.monthAncPct ?? 0}
              tone={paceOf(goal.monthAncPct ?? 0, goal.monthElapsedPct)}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-white/60">
            <span>
              This week <strong className="font-bold text-white">{fmtRM(goal.weekAnc)}</strong>
              {goal.weekAncTarget > 0 ? ` of ${fmtRM(goal.weekAncTarget)}` : ""}
            </span>
            {goal.avgCaseSize != null && (
              <span>
                Avg case <strong className="font-bold text-white">{fmtRM(goal.avgCaseSize)}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Money already in. Gold on navy, because it is the one figure in
            this row that has actually happened. */}
        <div className="rounded-[13px] bg-gold p-3.5">
          <div className="text-[11px] font-bold text-navy/70">{closing.label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[24px] font-extrabold tracking-[-0.03em] text-navy">
              {fmtRM(closing.anc)}
            </span>
            <span className="text-[11px] font-bold text-navy/70">ANC</span>
          </div>
          <div className="text-[10.5px] font-semibold text-navy/70">
            {closing.count} polic{closing.count === 1 ? "y" : "ies"} inforced
          </div>
        </div>
      </div>
    </div>
  );
}

function tipFor(
  tone: keyof typeof PACE_STYLE,
  remaining: number,
  weeklyNeeded: number,
  casesNeeded: number | null,
  avgCaseSize: number | null,
) {
  if (remaining <= 0) return "Target reached. Everything from here is ahead of plan.";

  const casesPart =
    casesNeeded != null && avgCaseSize != null
      ? ` That's about ${casesNeeded} more case${casesNeeded === 1 ? "" : "s"} at your ${fmtRM(avgCaseSize)} average.`
      : " Close a case with a quotation on it and this starts estimating cases needed too.";

  switch (tone) {
    case "ahead":
      return `${fmtRM(remaining)} to go and you're ahead of schedule — ${fmtRM(weeklyNeeded)} a week holds it.${casesPart}`;
    case "close":
      return `${fmtRM(remaining)} to go. Keep ${fmtRM(weeklyNeeded)} a week coming and you land it.${casesPart}`;
    default:
      return `${fmtRM(remaining)} to go and the pace has slipped — it needs ${fmtRM(weeklyNeeded)} a week from here.${casesPart}`;
  }
}
