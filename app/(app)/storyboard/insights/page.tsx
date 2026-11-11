import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { malaysiaToday } from "@/lib/malaysia-date";
import { STORYBOARD_TEXT, rm } from "@/lib/storyboard/i18n";
import { STORYBOARD_MODULES } from "@/lib/storyboard/modules";
import { getMyInsights } from "../data";
import { InsightsChart } from "./insights-chart";

// My Insights: the signed-in agent's own storyboard activity. Scoped to their
// own agent_id in getMyInsights, whatever their role -- a leader opening this
// page sees their personal figures, not their team's.
export default async function MyInsightsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const today = malaysiaToday();
  const i = await getMyInsights(profile.id, today);
  const conversion = i.leadsPresented ? Math.round((i.leadsConverted / i.leadsPresented) * 100) : 0;

  const tiles = [
    { label: "Presented this week", value: String(i.presentedThisWeek) },
    { label: "Presented this month", value: String(i.presentedThisMonth) },
    { label: "Average gap presented", value: rm(i.avgGapPresented) },
    { label: "Presented → Submission", value: `${conversion}%`, sub: `${i.leadsConverted} of ${i.leadsPresented} leads` },
  ];

  return (
    <div>
      <div className="sticky top-0 z-20 flex items-center gap-3.5 border-b border-sand bg-white/85 px-5 py-4 backdrop-blur-md lg:static lg:bg-white lg:px-[30px] lg:py-5 lg:backdrop-blur-none">
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-extrabold tracking-[-0.025em] text-navy">My Insights</div>
          <div className="mt-0.5 text-[13px] font-medium text-muted">Your own Financial Storyboard activity. Only you can see this.</div>
        </div>
        <Link
          href="/storyboard"
          className="flex-none rounded-[10px] border border-brand bg-brand px-4 py-2.5 text-[13px] font-semibold text-white"
        >
          New storyboard
        </Link>
      </div>

      <div className="flex flex-col gap-4 px-5 py-[22px] pb-[30px] lg:px-[30px]">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-[20px] border border-sand bg-white px-5 py-4">
              <div className="text-[12px] font-semibold text-muted">{tile.label}</div>
              <div className="mt-1 text-[26px] font-extrabold tracking-[-0.02em] text-navy tabular-nums">{tile.value}</div>
              {tile.sub && <div className="text-[11.5px] font-medium text-taupe">{tile.sub}</div>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <InsightsChart days={i.last14Days} />
          <div className="rounded-[20px] border border-sand bg-white p-5">
            <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">Sessions by module</div>
            <div className="mt-4 flex flex-col gap-3">
              {STORYBOARD_MODULES.map((m) => {
                const share = i.total ? (i.byModule[m] / i.total) * 100 : 0;
                return (
                  <div key={m}>
                    <div className="flex justify-between text-[13px] font-semibold text-navy">
                      <span>{STORYBOARD_TEXT.en.modules[m].name}</span>
                      <span className="tabular-nums">{i.byModule[m]}</span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sand-3">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${share}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-sand-3 pt-4 text-[12px] font-medium text-muted">
              <div>
                <div className="text-[18px] font-extrabold text-navy tabular-nums">{i.total}</div>
                Sessions in total
              </div>
              <div>
                <div className="text-[18px] font-extrabold text-navy tabular-nums">{i.practice}</div>
                Practice sessions
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
