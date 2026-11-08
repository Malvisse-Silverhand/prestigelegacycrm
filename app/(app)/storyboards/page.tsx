import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { listStoryboards } from "@/lib/storyboard/data";
import { STORYBOARD_MODULES, STORYBOARD_STEPS } from "@/lib/storyboard/types";
import { OUTCOME_LABEL } from "@/lib/storyboard/outcome";
import { progressLabel } from "@/lib/storyboard/progress";
import { STORYBOARD_MISSING_MESSAGE } from "@/lib/storyboard/schema-error";
import { t, type TKey } from "@/lib/storyboard/i18n";
import { malaysiaDateTime } from "@/lib/malaysia-date";
import { EmptyState } from "@/components/empty-state";
import { StoryboardIcon } from "@/components/icons";

export const metadata = { title: "Financial Storyboard" };

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function StoryboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; module?: string | string[] }>;
}) {
  const sp = await searchParams;
  const q = first(sp.q).slice(0, 60);
  const moduleFilter = first(sp.module);
  const profile = await getCurrentProfile();
  if (!profile) return null;

  // RLS: only storyboards of leads this person can see.
  const res = await listStoryboards({ q, module: moduleFilter });
  const filtered = Boolean(q || moduleFilter);

  return (
    <div>
      <div className="sticky top-0 z-20 border-b border-sand bg-white/85 px-5 py-5 backdrop-blur-md lg:static lg:bg-white lg:px-[30px] lg:backdrop-blur-none">
        <h1 className="m-0 text-2xl font-extrabold tracking-[-0.025em] text-navy">Financial Storyboard</h1>
        <p className="m-0 mt-[3px] text-[13px] font-medium text-muted">
          Every saved storyboard in one place. Open one to continue from the last step.
        </p>
        <form method="get" className="mt-3.5 flex flex-wrap items-end gap-3" role="search">
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <label htmlFor="sb-search" className="text-xs font-semibold text-navy">Search leads</label>
            <input
              id="sb-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search name…"
              className="min-h-11 rounded-[10px] border border-sand-2 bg-white px-3 text-sm text-navy focus-visible:outline-2 focus-visible:outline-brand"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="sb-module" className="text-xs font-semibold text-navy">Module</label>
            <select
              id="sb-module"
              name="module"
              defaultValue={moduleFilter}
              className="min-h-11 rounded-[10px] border border-sand-2 bg-white px-3 text-sm text-navy focus-visible:outline-2 focus-visible:outline-brand"
            >
              <option value="">All modules</option>
              {STORYBOARD_MODULES.map((m) => (
                <option key={m} value={m}>{t(`module.${m}` as TKey)}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="min-h-11 rounded-[10px] bg-brand px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Filter
          </button>
          {filtered ? (
            <Link href="/storyboards" className="flex min-h-11 items-center px-2 text-sm font-semibold text-info-blue-text hover:underline">
              Clear
            </Link>
          ) : null}
        </form>
      </div>

      <div className="px-5 py-[22px] lg:px-[30px]">
        {!res.ok ? (
          <p
            role="alert"
            className={`m-0 rounded-[12px] border px-4 py-3 text-sm font-semibold ${
              res.missing ? "border-warn-orange bg-warn-gold-bg text-warn-gold-text" : "border-alert-red bg-alert-red-bg text-alert-red"
            }`}
          >
            {res.missing ? STORYBOARD_MISSING_MESSAGE : res.message}
          </p>
        ) : res.data.length === 0 ? (
          <EmptyState
            icon={<StoryboardIcon width={28} height={28} className="text-green" />}
            title={filtered ? "No storyboards match" : "No storyboards yet"}
            description={
              filtered
                ? "Try a different name or module."
                : "Open a lead and choose Financial Storyboard to start one. It will be listed here once saved."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-[16px] border border-sand bg-white">
            <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
              <caption className="sr-only">Saved financial storyboards</caption>
              <thead>
                <tr className="border-b border-sand text-[11px] uppercase tracking-wide text-muted-2">
                  {["Lead", "Module", "Progress", "Protection gap", "Saved", "Outcome", "Shared to portal", "Action"].map((h) => (
                    <th key={h} scope="col" className="px-3.5 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {res.data.map((r) => {
                  const done = STORYBOARD_STEPS.filter((s) => r.stepStatus[s] === "saved").length;
                  return (
                    <tr key={r.id} className="border-b border-sand last:border-b-0">
                      <td className="px-3.5 py-3">
                        <Link href={`/leads/${r.leadId}`} className="font-bold text-navy hover:underline">{r.leadName}</Link>
                        {r.agentName ? <div className="text-xs text-muted-2">{r.agentName}</div> : null}
                      </td>
                      <td className="px-3.5 py-3">{t(`module.${r.module}` as TKey)}</td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          <span aria-hidden="true" className="flex w-16 gap-0.5">
                            {STORYBOARD_STEPS.map((s, i) => (
                              <span key={s} className={`h-1.5 flex-1 rounded-sm ${i < done ? (done === 4 ? "bg-green" : "bg-gold") : "bg-sand"}`} />
                            ))}
                          </span>
                          <span>{progressLabel(r.stepStatus)}</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 tabular-nums">{r.gap ?? "—"}</td>
                      <td className="px-3.5 py-3">{r.savedAt ? malaysiaDateTime(r.savedAt) : "—"}</td>
                      <td className="px-3.5 py-3">{r.outcome ? OUTCOME_LABEL[r.outcome] : "—"}</td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            r.sharedToPortal ? "bg-success-bg text-green" : "bg-sand text-muted-2"
                          }`}
                        >
                          {r.sharedToPortal ? "On" : "Off"}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <Link
                          href={`/leads/${r.leadId}/storyboard/${r.module}/fill`}
                          className="inline-flex min-h-10 items-center rounded-[10px] bg-brand px-3.5 text-[13px] font-bold text-white"
                        >
                          {done === 4 ? "View" : "Continue"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
