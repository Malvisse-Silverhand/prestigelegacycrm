import type { LeadSourceStat } from "../types";

export function LeadSourcesTab({ stats }: { stats: LeadSourceStat[] }) {
  const total = stats.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="max-w-[640px] rounded-[18px] border border-sand bg-white px-[22px] pb-[22px] pt-5">
      <div className="text-[15px] font-bold text-navy">Lead sources</div>
      <div className="mt-0.5 text-[11.5px] font-medium text-taupe">
        Where leads in scope are coming from and how many have closed won. Read-only — sources come from each lead&apos;s intake, not
        managed here.
      </div>

      {stats.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-taupe px-4 py-6 text-center text-[12.5px] font-medium text-taupe-2">
          No leads in scope yet.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {stats.map((s) => {
            const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
            return (
              <div key={s.source}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="font-semibold text-navy">{s.source}</span>
                  <span className="text-taupe">
                    {s.count} lead{s.count === 1 ? "" : "s"} · {s.closedWon} closed won
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand-3">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
