import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getProfileNames, listInsightRows } from "@/lib/storyboard/data";
import { htmlLang, t, type Lang } from "@/lib/storyboard/i18n";
import { getStoryboardLang } from "@/lib/storyboard/i18n/server";
import { INSIGHT_RANGES, inRange, parseRange, pct, summarise, teamTable } from "@/lib/storyboard/insights";
import { moduleName } from "@/lib/storyboard/modules";
import { missingMessage } from "@/lib/storyboard/schema-error";
import { STORYBOARD_OUTCOMES, STORYBOARD_STEPS } from "@/lib/storyboard/types";
import { LangToggle } from "@/components/storyboard/lang-toggle";

export async function generateMetadata() {
  const lang = await getStoryboardLang();
  return { title: t("insights.title", lang) };
}

const STEP_LABEL = { fill: "step.fill", explain: "step.explain", risk: "step.risk", objections: "step.objection" } as const;
const CARD = "rounded-[16px] border border-sand bg-white p-4 sm:p-5";
const H2 = "m-0 text-base font-extrabold text-navy";

/** A labelled horizontal bar. The number is the information; the bar is decoration. */
function Bar({ label, count, max, tone = "bg-brand", lang }: { label: string; count: number; max: number; tone?: string; lang: Lang }) {
  const width = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <li className="grid grid-cols-[minmax(7rem,1fr)_2fr_auto] items-center gap-3 text-[13px]">
      <span className="text-navy">{label}</span>
      <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-sand">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </span>
      <span className="font-bold tabular-nums text-navy">
        {count}
        <span className="sr-only"> ({t("insights.barLabel", lang, { count, max })})</span>
      </span>
    </li>
  );
}

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ range?: string | string[] }> }) {
  const sp = await searchParams;
  const range = parseRange(Array.isArray(sp.range) ? sp.range[0] : sp.range);
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const lang = await getStoryboardLang();
  const now = new Date();
  const since = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);

  const res = await listInsightRows(since);
  const isLeader = profile.role !== "agent";

  let body: React.ReactNode;
  if (!res.ok) {
    body = (
      <p
        role="alert"
        className={`m-0 rounded-[12px] border px-4 py-3 text-sm font-semibold ${
          res.missing ? "border-warn-orange bg-warn-gold-bg text-warn-gold-text" : "border-alert-red bg-alert-red-bg text-alert-red"
        }`}
      >
        {res.missing ? missingMessage(lang) : t("insights.loadFailed", lang)}
      </p>
    );
  } else {
    const rows = inRange(res.data, range, now);
    const mine = rows.filter((r) => r.actorId === profile.id);
    const s = summarise(mine);
    const maxModule = Math.max(1, ...s.byModule.map((m) => m.total));
    const maxStep = Math.max(1, s.total);
    const maxOutcome = Math.max(1, ...STORYBOARD_OUTCOMES.map((o) => s.outcomes[o]));

    let team: React.ReactNode = null;
    if (isLeader) {
      const ids = [...new Set(rows.map((r) => r.actorId).filter((x): x is string => Boolean(x)))];
      const names = await getProfileNames(ids);
      const table = teamTable(rows, names, t("insights.unknownAgent", lang));
      team = (
        <section aria-labelledby="ins-team" className={`${CARD} flex flex-col gap-3`}>
          <h2 id="ins-team" className={H2}>{t("insights.teamTitle", lang)}</h2>
          <p className="m-0 text-[13px] text-muted">{t("insights.teamIntro", lang)}</p>
          {table.length === 0 ? (
            <p className="m-0 text-sm text-muted-2">{t("insights.teamEmpty", lang)}</p>
          ) : (
            <div className="overflow-x-auto rounded-[12px] border border-sand">
              <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
                <caption className="sr-only">{t("insights.teamCaption", lang)}</caption>
                <thead>
                  <tr className="border-b border-sand text-[11px] uppercase tracking-wide text-muted-2">
                    <th scope="col" className="px-3.5 py-3 font-bold">{t("insights.colAgent", lang)}</th>
                    {(["insights.colSessions", "insights.colPractice", "insights.colWithOutcome", "insights.colReady"] as const).map((h) => (
                      <th key={h} scope="col" className="px-3.5 py-3 text-right font-bold">{t(h, lang)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.map((r) => (
                    <tr key={r.agentId} className="border-b border-sand last:border-b-0">
                      <th scope="row" className="px-3.5 py-3 font-bold text-navy">{r.name}</th>
                      <td className="px-3.5 py-3 text-right tabular-nums">{r.sessions}</td>
                      <td className="px-3.5 py-3 text-right tabular-nums">{r.practice}</td>
                      <td className="px-3.5 py-3 text-right tabular-nums">{r.withOutcome}</td>
                      <td className="px-3.5 py-3 text-right tabular-nums">{r.readyForQuote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      );
    }

    body = (
      <>
        {s.total === 0 ? (
          <p className={`${CARD} m-0 text-sm text-muted-2`}>{t("insights.empty", lang)}</p>
        ) : (
          <>
            <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [t("insights.total", lang), String(s.total)],
                [t("insights.practice", lang), String(s.practice)],
                [t("insights.withLead", lang), String(s.lead)],
                [t("insights.step4Title", lang), `${pct(s.reachedStep4Share)}%`],
              ].map(([label, value]) => (
                <div key={label} className={CARD}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">{label}</dt>
                  <dd className="m-0 text-2xl font-extrabold tabular-nums text-navy">{value}</dd>
                </div>
              ))}
            </dl>

            <section aria-labelledby="ins-mod" className={`${CARD} flex flex-col gap-3`}>
              <h2 id="ins-mod" className={H2}>{t("insights.byModule", lang)}</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-sand text-[11px] uppercase tracking-wide text-muted-2">
                      <th scope="col" className="px-2 py-2 font-bold">{t("insights.colModule", lang)}</th>
                      <th scope="col" className="px-2 py-2 text-right font-bold">{t("insights.colPractice", lang)}</th>
                      <th scope="col" className="px-2 py-2 text-right font-bold">{t("insights.colLead", lang)}</th>
                      <th scope="col" className="px-2 py-2 text-right font-bold">{t("insights.colTotal", lang)}</th>
                      <th scope="col" className="w-1/3 px-2 py-2"><span className="sr-only">{t("insights.colTotal", lang)}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.byModule.map((m) => (
                      <tr key={m.module} className="border-b border-sand last:border-b-0">
                        <th scope="row" className="px-2 py-2 font-bold text-navy">{moduleName(m.module, lang)}</th>
                        <td className="px-2 py-2 text-right tabular-nums">{m.practice}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{m.lead}</td>
                        <td className="px-2 py-2 text-right font-bold tabular-nums">{m.total}</td>
                        <td className="px-2 py-2" aria-hidden="true">
                          <span className="block h-2.5 overflow-hidden rounded-full bg-sand">
                            <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round((m.total / maxModule) * 100)}%` }} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <section aria-labelledby="ins-steps" className={`${CARD} flex flex-col gap-3`}>
                <h2 id="ins-steps" className={H2}>{t("insights.stepsTitle", lang)}</h2>
                <p className="m-0 text-[13px] text-muted">{t("insights.stepsIntro", lang)}</p>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {STORYBOARD_STEPS.map((st) => (
                    <Bar key={st} label={t(STEP_LABEL[st], lang)} count={s.steps[st]} max={maxStep} lang={lang} />
                  ))}
                </ul>
                <p className="m-0 text-[13px] text-ink">
                  <span className="font-bold">{t("insights.step4Value", lang, { pct: pct(s.reachedStep4Share) })}</span>{" "}
                  {t("insights.step4Detail", lang, { n: s.reachedStep4, total: s.total })}
                </p>
              </section>

              <section aria-labelledby="ins-out" className={`${CARD} flex flex-col gap-3`}>
                <h2 id="ins-out" className={H2}>{t("insights.outcomesTitle", lang)}</h2>
                {s.outcomesRecorded === 0 ? (
                  <p className="m-0 text-sm text-muted-2">{t("insights.noOutcomes", lang)}</p>
                ) : (
                  <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                    {STORYBOARD_OUTCOMES.map((o) => (
                      <Bar key={o} label={t(`outcome.${o}` as const, lang)} count={s.outcomes[o]} max={maxOutcome} tone="bg-gold" lang={lang} />
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
        {team}
      </>
    );
  }

  return (
    <div lang={htmlLang(lang)} className="mx-auto flex max-w-[1100px] flex-col gap-4 px-4 py-5 sm:px-6 sm:py-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/storyboards" className="flex min-h-11 items-center text-[13px] font-semibold text-info-blue-text hover:underline">
          ‹ {t("insights.back", lang)}
        </Link>
        <LangToggle lang={lang} />
      </div>
      <h1 className="m-0 text-2xl font-extrabold tracking-tight text-navy">{t("insights.title", lang)}</h1>
      <p className="m-0 text-[13px] text-muted">{t("insights.intro", lang)}</p>
      <nav aria-label={t("insights.rangeNav", lang)}>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {INSIGHT_RANGES.map((r) => (
            <li key={r}>
              <Link
                href={`/storyboards/insights?range=${r}`}
                aria-current={r === range ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-[12px] border px-4 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  r === range ? "border-brand bg-brand text-white" : "border-sand bg-white text-ink"
                }`}
              >
                {t("insights.rangeDays", lang, { days: r })}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {body}
    </div>
  );
}
