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

// A ProgressBar with its "X of Y" reading sat directly beside it, rather than
// above it on its own line -- this is the shape used everywhere a bar now
// carries a number (Overall progress, the monthly bar inside MonthBlock).
// flex-wrap rather than a fixed row: at phone width (360px) a long label next
// to a bar that still needs room to read as a bar would overflow, so the
// label is allowed to drop to its own line there instead.
function ProgressRow({
  pct,
  tone,
  onGold,
  label,
}: {
  pct: number;
  tone: keyof typeof PACE_STYLE;
  onGold?: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="min-w-0 flex-1">
        <ProgressBar pct={pct} tone={tone} onGold={onGold} />
      </div>
      <span className={`shrink-0 whitespace-nowrap text-[11.5px] font-bold ${onGold ? "text-navy" : "text-white"}`}>
        {label}
      </span>
    </div>
  );
}

// Everything in this panel sits on navy, so the tiles are translucent white
// rather than cards -- a white card on navy reads as a hole punched in it.
function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[13px] bg-white/[.06] px-3 py-2">
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

/**
 * Calendar-year, not all-time: what every certificate on this book is worth
 * since it went inforce this year, and what has actually been paid in
 * against dues in this year. Scoped to `goal.year` rather than forever so a
 * certificate that has sat inforce for three years doesn't keep inflating
 * this figure every year after -- see yearTotals in lib/case-anc for the
 * exact date rule.
 */
function AncTotals({ goal }: { goal: Goal }) {
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      <div className="rounded-[13px] bg-white/[.06] p-3">
        <div className="text-[11px] font-bold text-white/70">Total ANC Inforced [{goal.year}]</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[20px] font-extrabold tracking-[-0.03em] text-white">
            {fmtRM(goal.inforcedAnc)}
          </span>
          <span className="text-[11px] font-bold text-white/70">ANC</span>
        </div>
        <div className="text-[10.5px] font-semibold text-white/70">certificates in force since 1 Jan {goal.year}</div>
      </div>
      <div className="rounded-[13px] bg-white/[.06] p-3">
        <div className="text-[11px] font-bold text-white/70">Total ANC Collected [{goal.year}]</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[20px] font-extrabold tracking-[-0.03em] text-gold">
            {fmtRM(goal.collectedAnc)}
          </span>
          <span className="text-[11px] font-bold text-white/70">ANC</span>
        </div>
        <div className="text-[10.5px] font-semibold text-white/70">contributions paid, due in {goal.year}</div>
      </div>
    </div>
  );
}

// The monthly figures, in one block -- replaces what used to be two separate
// pieces ("This Month Target" and the gold "This month closing" tile): the
// money target, what has actually closed against it, and how many cases that
// was, read together rather than split across two cards that could disagree
// about which month they meant.
function MonthBlock({ goal, tip }: { goal: Goal; tip?: string }) {
  const pct = goal.monthAncPct ?? 0;
  const tone = paceOf(pct, goal.monthElapsedPct);
  const style = PACE_STYLE[tone];
  const hasTarget = goal.monthAncTarget > 0;

  return (
    <div className="rounded-[13px] bg-white/[.06] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12.5px] font-bold text-white">This Month · {goal.monthLabel}</span>
        {hasTarget && (
          <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${style.chip}`}>
            {style.label} · {pct}%
          </span>
        )}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/50">Current Month ANC</div>
          <div className="mt-0.5 text-[16px] font-extrabold tracking-[-0.03em] text-gold lg:text-[19px]">
            {fmtRM(goal.monthAnc)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/50">This Month Target</div>
          <div className="mt-0.5 text-[16px] font-extrabold tracking-[-0.03em] text-white lg:text-[19px]">
            {hasTarget ? (
              fmtRM(goal.monthAncTarget)
            ) : (
              <Link href="/settings" className="text-gold underline underline-offset-2">
                Set target
              </Link>
            )}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/50">Closing</div>
          <div className="mt-0.5 text-[16px] font-extrabold tracking-[-0.03em] text-white lg:text-[19px]">
            {goal.monthClosedCount}
          </div>
          <div className="text-[10.5px] font-semibold text-white/50">
            {goal.monthClosedCount === 1 ? "case closed" : "cases closed"}
          </div>
        </div>
      </div>

      {hasTarget && (
        <div className="mt-2.5">
          <ProgressRow
            pct={pct}
            tone={tone}
            label={`${fmtRM(goal.monthAnc)} of ${fmtRM(goal.monthAncTarget)}`}
          />
        </div>
      )}

      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-white/60">
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

      {tip && <div className="mt-1.5 text-[11px] font-medium text-white/60">{tip}</div>}
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
  variant = "personal",
  teamLabel,
}: {
  goal: Goal;
  /** "team" sits under a team-wide or downline scope -- data.ts never
   *  attaches a personal campaign to one of those, so this variant only
   *  ever renders the monthly-target layout, never the yearly one. */
  variant?: "personal" | "team";
  /** The eyebrow for the team variant, e.g. "Whole team · 24 members". Built
   *  by the caller, which knows the role and the kind of team this is. */
  teamLabel?: string;
}) {
  const { campaign } = goal;

  // WITH a campaign: it paces against its own window, and the month sits
  // underneath it as one block among others. Personal only -- data.ts skips
  // the campaign query entirely for a team-wide or unit scope, since a
  // campaign is one person's own commitment, not a team's.
  if (campaign) {
    const tone = paceOf(campaign.achievementPct, campaign.elapsedPct);
    const style = PACE_STYLE[tone];
    const footnote =
      campaign.daysLeft > 0
        ? `${campaign.daysLeft} day${campaign.daysLeft === 1 ? "" : "s"} left`
        : "Deadline reached";

    return (
      <div className="rounded-2xl bg-navy p-3.5 dark:ring-1 dark:ring-white/10 lg:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold">
              {campaign.name} · Road to {fmtRM(campaign.targetAnc)}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-[17px] font-extrabold tracking-[-0.02em] text-white">Yearly Target</span>
              <span className="rounded-[6px] bg-white/10 px-2 py-[3px] text-[9.5px] font-bold tracking-[0.06em] text-white">
                {fmtDeadline(campaign.deadline)}
              </span>
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${style.chip}`}>
            {style.label} · {campaign.achievementPct}%
          </span>
        </div>

        {/* Gold, navy text: the one card in this panel meant to be read
            first. */}
        <div className="mt-3 rounded-[13px] bg-gold p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-navy/70">
              Overall progress
            </span>
            <span className="text-[11px] font-semibold text-navy/70">{footnote}</span>
          </div>
          <div className="mt-1.5">
            <ProgressRow
              pct={campaign.achievementPct}
              tone={tone}
              onGold
              label={`${fmtRM(campaign.currentAnc)} of ${fmtRM(campaign.targetAnc)}`}
            />
          </div>
          <div className="mt-1.5 text-[11.5px] font-medium text-navy/80">
            {tipFor(tone, campaign.remaining, campaign.weeklyNeeded, campaign.casesNeeded, goal.avgCaseSize)}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Tile label="Remaining" value={fmtRM(campaign.remaining)} />
          <Tile label="Achievement" value={`${campaign.achievementPct}%`} />
        </div>

        <div className="mt-2">
          <MonthBlock goal={goal} />
        </div>

        <AncTotals goal={goal} />
      </div>
    );
  }

  // WITHOUT a campaign: the month itself is the window, and the figures come
  // from Set Target. Always the layout for a team/downline card, and for a
  // personal one with no campaign running.
  const pct = goal.monthAncPct ?? 0;
  const tone = paceOf(pct, goal.monthElapsedPct);
  const style = PACE_STYLE[tone];
  const hasTarget = goal.monthAncTarget > 0;

  return (
    <div className="rounded-2xl bg-navy p-3.5 dark:ring-1 dark:ring-white/10 lg:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold">
            {variant === "team" ? teamLabel : "Monthly ANC target"}
          </div>
          <div className="mt-0.5 text-[17px] font-extrabold tracking-[-0.02em] text-white">
            {variant === "team" ? "Team Monthly Target" : "Monthly Target"}
          </div>
        </div>
        {hasTarget && (
          <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${style.chip}`}>
            {style.label} · {pct}%
          </span>
        )}
      </div>

      {/* Nothing to pace against yet -- point at the one screen that fixes
          it, rather than a card full of zeroes. */}
      {!hasTarget && (
        <div className="mt-0.5 text-[12px] font-medium text-white/60">
          {variant === "team" ? (
            <>
              No monthly ANC targets set for this team yet — set them in{" "}
              <Link href="/settings" className="font-semibold text-gold underline underline-offset-2">
                Settings › Set Target
              </Link>
              .
            </>
          ) : (
            <>
              Set a monthly ANC target — or a goal with a deadline — in{" "}
              <Link href="/settings" className="font-semibold text-gold underline underline-offset-2">
                Settings › Set Target
              </Link>
              , and this becomes your progress tracker.
            </>
          )}
        </div>
      )}

      <div className="mt-3">
        <MonthBlock
          goal={goal}
          tip={
            hasTarget
              ? tipFor(tone, goal.monthAncRemaining, goal.weekAncTarget, goal.casesNeededThisMonth, goal.avgCaseSize)
              : undefined
          }
        />
      </div>

      <AncTotals goal={goal} />
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
