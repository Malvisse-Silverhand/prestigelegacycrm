import type { LeadStoryboardStatus } from "@/lib/storyboard/data";
import { STORYBOARD_MODULES, STORYBOARD_STEPS, type StoryboardModule } from "@/lib/storyboard/types";
import { OUTCOME_LABEL } from "@/lib/storyboard/outcome";
import { progressLabel } from "@/lib/storyboard/progress";
import { t, type TKey } from "@/lib/storyboard/i18n";
import { malaysiaDateTime } from "@/lib/malaysia-date";

// Only Hibah is built so far; the rest read "Coming soon" but still link in,
// where the same shell explains it.
const AVAILABLE: StoryboardModule[] = ["hibah"];

/**
 * Per-module status for one lead, with a way into each module's first step.
 * Plain <a> links on purpose: a soft navigation to /leads/<id>/... from inside
 * the lead popup would leave the popup's parallel route showing over the page.
 */
export function LeadStoryboardTab({ leadId, status }: { leadId: string; status: LeadStoryboardStatus }) {
  return (
    <div className="rounded-[16px] border border-sand bg-white p-3 sm:p-[18px]">
      <div className="text-[14.5px] font-bold text-navy">Financial Storyboard</div>
      <p className="m-0 mt-1 text-[12.5px] text-muted">
        Calculate the family&apos;s need, explain it, check rejection risk and handle objections, then record the outcome.
      </p>

      {!status.ok ? (
        <p role="alert" className="m-0 mt-3 rounded-[10px] bg-warn-gold-bg px-3 py-2.5 text-[12.5px] font-semibold text-warn-gold-text">
          {status.message}
        </p>
      ) : null}

      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {STORYBOARD_MODULES.map((m) => {
          const row = status.ok ? status.rows.find((r) => r.module === m) : undefined;
          const available = AVAILABLE.includes(m);
          const done = row ? STORYBOARD_STEPS.filter((s) => row.stepStatus[s] === "saved").length : 0;
          return (
            <li key={m} className="flex flex-wrap items-center gap-3 rounded-[12px] border border-sand px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-navy">{t(`module.${m}` as TKey)}</div>
                <div className="text-[12px] text-muted-2">
                  {!available
                    ? "Coming soon"
                    : row
                      ? `${progressLabel(row.stepStatus)} · ${done}/4 steps${row.savedAt ? ` · saved ${malaysiaDateTime(row.savedAt)}` : ""}${
                          row.outcome ? ` · ${OUTCOME_LABEL[row.outcome]}` : ""
                        }`
                      : "Not started"}
                </div>
              </div>
              {available ? (
                <a
                  href={`/leads/${leadId}/storyboard/${m}/fill`}
                  className={`flex min-h-11 items-center rounded-[10px] px-4 text-[12.5px] font-bold ${
                    row ? "bg-brand text-white" : "bg-gold text-navy"
                  }`}
                >
                  {row ? "Continue" : "Start"}
                  <span className="sr-only"> {t(`module.${m}` as TKey)} storyboard</span>
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
