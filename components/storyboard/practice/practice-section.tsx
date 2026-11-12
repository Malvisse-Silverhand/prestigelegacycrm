import Link from "next/link";
import type { PracticeSession } from "@/lib/storyboard/data";
import { dateLocale, t, type Lang } from "@/lib/storyboard/i18n";
import { moduleName } from "@/lib/storyboard/modules";
import { daysUntilPurge, PRACTICE_RETENTION_DAYS } from "@/lib/storyboard/practice";
import { progressLabel } from "@/lib/storyboard/progress";
import { malaysiaDateTime } from "@/lib/malaysia-date";
import { NewPracticeButtons } from "./new-practice-buttons";
import { PracticeActions } from "./practice-actions";

type Props = {
  lang: Lang;
  /** null = could not load; see `notice`. */
  sessions: PracticeSession[] | null;
  notice: "missing" | "failed" | null;
};

function expiry(days: number, lang: Lang): string {
  if (days <= 0) return t("practice.expiresToday", lang);
  if (days === 1) return t("practice.expiresTomorrow", lang);
  return t("practice.expiresDays", lang, { days });
}

/** Server component: needs a LangProvider above it for the client actions. */
export function PracticeSection({ lang, sessions, notice }: Props) {
  const now = new Date();
  return (
    <>
    {notice ? null : (
      <section aria-labelledby="sb-plans-h" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a57a12]">{t("plan.eyebrow", lang)}</p>
          <h2 id="sb-plans-h" className="m-0 text-[26px] font-extrabold tracking-[-0.03em] text-navy sm:text-[30px]">{t("plan.heading", lang)}</h2>
          <p className="m-0 max-w-[62ch] text-[13.5px] font-medium text-muted">{t("plan.sub", lang)}</p>
        </div>
        <NewPracticeButtons />
      </section>
    )}
    <section aria-labelledby="sb-practice-h" className="flex flex-col gap-3 rounded-[16px] border border-sand bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="sb-practice-h" className="m-0 text-lg font-extrabold text-navy">{t("practice.title", lang)}</h2>
        <Link href="/storyboards/insights" className="flex min-h-11 items-center text-sm font-semibold text-info-blue-text hover:underline">
          {t("insights.link", lang)}
        </Link>
      </div>
      <p className="m-0 text-[13px] text-muted">{t("practice.intro", lang, { days: PRACTICE_RETENTION_DAYS })}</p>

      {notice ? (
        <p
          role="alert"
          className={`m-0 rounded-[12px] border px-4 py-3 text-sm font-semibold ${
            notice === "missing" ? "border-warn-orange bg-warn-gold-bg text-warn-gold-text" : "border-alert-red bg-alert-red-bg text-alert-red"
          }`}
        >
          {notice === "missing" ? t("practice.missing", lang) : t("practice.loadFailed", lang)}
        </p>
      ) : (
        <>
          {sessions && sessions.length === 0 ? (
            <p className="m-0 text-sm text-muted-2">{t("practice.empty", lang)}</p>
          ) : (
            <div className="overflow-x-auto rounded-[12px] border border-sand">
              <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                <caption className="sr-only">{t("practice.caption", lang)}</caption>
                <thead>
                  <tr className="border-b border-sand text-[11px] uppercase tracking-wide text-muted-2">
                    {(["practice.colSession", "practice.colProgress", "practice.colSaved", "practice.colExpires", "practice.colActions"] as const).map((h) => (
                      <th key={h} scope="col" className="px-3.5 py-3 font-bold">{t(h, lang)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(sessions ?? []).map((s) => (
                    <tr key={s.id} className="border-b border-sand align-top last:border-b-0">
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-navy">{s.title ?? t("practice.untitled", lang)}</div>
                        <div className="text-xs text-muted-2">{moduleName(s.module, lang)}</div>
                      </td>
                      <td className="px-3.5 py-3">{progressLabel(s.stepStatus, lang)}</td>
                      <td className="px-3.5 py-3">
                        {s.savedAt ? malaysiaDateTime(s.savedAt, undefined, dateLocale(lang)) : t("practice.notSaved", lang)}
                      </td>
                      <td className="px-3.5 py-3">{expiry(daysUntilPurge(s.updatedAt, now), lang)}</td>
                      <td className="px-3.5 py-3">
                        <PracticeActions id={s.id} module={s.module} title={s.title} showOpen />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
    </>
  );
}
