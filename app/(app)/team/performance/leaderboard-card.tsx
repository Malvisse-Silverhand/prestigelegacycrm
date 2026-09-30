import type { LeaderboardEntry } from "./leaderboard-data";

function fmtRM(n: number) {
  return `RM${Math.round(n).toLocaleString("en-MY")}`;
}

// Tasteful medal accents for the top 3 -- gold/silver/bronze rings on the
// avatar circle, matching the navy-card token palette the rest of the
// dashboard's goal panels already use rather than introducing new colours.
const MEDAL = {
  1: { ring: "ring-2 ring-gold", badge: "bg-gold text-navy" },
  2: { ring: "ring-2 ring-[#c7ccd6]", badge: "bg-[#c7ccd6] text-navy" },
  3: { ring: "ring-2 ring-[#cf9a63]", badge: "bg-[#cf9a63] text-white" },
} as const;

/**
 * Ranked list of agents by this calendar year's inforced ANC. Styled to sit
 * in the same navy-card envelope as AncGoalPanel -- it swipes next to that
 * panel on mobile (see dashboard-view.tsx's mobile carousel) and sits beside
 * it on desktop.
 */
export function LeaderboardCard({
  entries,
  year,
  title = "Agent Leaderboard",
}: {
  entries: LeaderboardEntry[];
  year: string;
  title?: string;
}) {
  return (
    <div className="rounded-2xl bg-brand p-3.5 dark:ring-1 dark:ring-white/10 lg:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold">
            {year} · Inforced ANC
          </div>
          <div className="mt-0.5 text-[17px] font-extrabold tracking-[-0.02em] text-white">
            {title}
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="mt-3 rounded-[13px] bg-white/[.06] p-4 text-center text-[12px] font-medium text-white/60">
          No inforced business yet this year.
        </div>
      ) : (
        <div className="mt-3 flex max-h-[360px] flex-col gap-1.5 overflow-y-auto pr-0.5">
          {entries.map((e) => {
            const medal = MEDAL[e.rank as keyof typeof MEDAL];
            return (
              <div
                key={e.agentId}
                className="flex items-center gap-2.5 rounded-[12px] bg-white/[.06] px-2.5 py-2"
              >
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white/10 text-[11px] font-extrabold text-white/80">
                  {e.rank}
                </span>
                <span
                  className={`flex h-8 w-8 flex-none items-center justify-center rounded-[10px] text-[10.5px] font-bold ${
                    medal ? `${medal.badge} ${medal.ring}` : "bg-white/10 text-white"
                  }`}
                >
                  {e.initials}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-white">
                  {e.name}
                </span>
                <span className="flex-none text-[13px] font-extrabold text-gold">
                  {fmtRM(e.anc)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
