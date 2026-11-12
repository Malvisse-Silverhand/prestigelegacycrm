import type { LeadStoryboardStatus } from "@/lib/storyboard/data";
import { STORYBOARD_MODULES, STORYBOARD_STEPS } from "@/lib/storyboard/types";
import { isBuiltModule, moduleName } from "@/lib/storyboard/modules";
import { outcomeLabel } from "@/lib/storyboard/outcome";
import { progressLabel } from "@/lib/storyboard/progress";
import { missingMessage } from "@/lib/storyboard/schema-error";
import { dateLocale, htmlLang, t } from "@/lib/storyboard/i18n";
import { malaysiaDateTime } from "@/lib/malaysia-date";
import { LangToggle } from "@/components/storyboard/lang-toggle";

// Mortgage (Phase 4b) reads "Coming soon"; every other module is built.

/**
 * Per-module status for one lead, with a way into each module's first step.
 * Plain <a> links on purpose: a soft navigation to /leads/<id>/... from inside
 * the lead popup would leave the popup's parallel route showing over the page.
 * The language comes with the status (the sb_lang cookie, read on the server).
 */
export function LeadStoryboardTab({ leadId, status }: { leadId: string; status: LeadStoryboardStatus }) {
  const lang = status.lang;
  return (
    <div lang={htmlLang(lang)} className="rounded-[16px] border border-sand bg-white p-3 sm:p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="text-[14.5px] font-bold text-navy">{t("tab.title", lang)}</div>
        <LangToggle lang={lang} />
      </div>
      <p className="m-0 mt-1 text-[12.5px] text-muted">{t("tab.intro", lang)}</p>

      {!status.ok ? (
        <p role="alert" className="m-0 mt-3 rounded-[10px] bg-warn-gold-bg px-3 py-2.5 text-[12.5px] font-semibold text-warn-gold-text">
          {status.missing ? missingMessage(lang) : t("err.loadFailed", lang)}
        </p>
      ) : null}

      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {STORYBOARD_MODULES.map((m) => {
          const row = status.ok ? status.rows.find((r) => r.module === m) : undefined;
          const available = isBuiltModule(m);
          const done = row ? STORYBOARD_STEPS.filter((s) => row.stepStatus[s] === "saved").length : 0;
          const name = moduleName(m, lang);
          return (
            <li key={m} className="flex flex-wrap items-center gap-3 rounded-[12px] border border-sand px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-navy">{name}</div>
                <div className="text-[12px] text-muted-2">
                  {!available
                    ? t("tab.comingSoon", lang)
                    : row
                      ? `${progressLabel(row.stepStatus, lang)} · ${t("progress.steps", lang, { done })}${
                          row.savedAt
                            ? ` · ${t("tab.saved", lang, { when: malaysiaDateTime(row.savedAt, undefined, dateLocale(lang)) })}`
                            : ""
                        }${row.outcome ? ` · ${outcomeLabel(row.outcome, lang)}` : ""}`
                      : t("tab.notStarted", lang)}
                </div>
              </div>
              {available ? (
                <a
                  href={`/leads/${leadId}/storyboard/${m}/fill`}
                  className={`flex min-h-11 items-center rounded-[10px] px-4 text-[12.5px] font-bold ${
                    row ? "bg-brand text-white" : "bg-gold text-navy"
                  }`}
                >
                  {row ? t("tab.continue", lang) : t("tab.start", lang)}
                  <span className="sr-only"> {t("tab.storyboardSr", lang, { module: name })}</span>
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
