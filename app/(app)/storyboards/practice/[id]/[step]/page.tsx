import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getPracticeStoryboard, getStoryboardSettings } from "@/lib/storyboard/data";
import { htmlLang, t } from "@/lib/storyboard/i18n";
import { getStoryboardLang } from "@/lib/storyboard/i18n/server";
import { isBuiltModule, moduleTitle } from "@/lib/storyboard/modules";
import { PRACTICE_RETENTION_DAYS } from "@/lib/storyboard/practice";
import { missingMessage } from "@/lib/storyboard/schema-error";
import { resolveSettings } from "@/lib/storyboard/settings";
import { practiceTarget } from "@/lib/storyboard/target";
import { STORYBOARD_STEPS, type StoryboardStep } from "@/lib/storyboard/types";
import { isUuid } from "@/lib/storyboard/validate";
import { LangProvider } from "@/components/storyboard/lang-context";
import { LangToggle } from "@/components/storyboard/lang-toggle";
import { PracticeActions } from "@/components/storyboard/practice/practice-actions";
import { renderScreen, type ScreenCommon } from "@/components/storyboard/registry";
import { StepTabs, type StepKey } from "@/components/storyboard/step-tabs";

const URL_TO_TAB: Record<StoryboardStep, StepKey> = {
  fill: "fill",
  explain: "explain",
  risk: "risk",
  objections: "objection",
};

export default async function PracticeStepPage({ params }: { params: Promise<{ id: string; step: string }> }) {
  const { id, step } = await params;
  if (!isUuid(id) || !(STORYBOARD_STEPS as readonly string[]).includes(step)) notFound();
  const stepKey = step as StoryboardStep;

  const profile = await getCurrentProfile();
  if (!profile) return null;
  const lang = await getStoryboardLang();

  // RLS: a session this person cannot see comes back empty, which is a 404.
  const res = await getPracticeStoryboard(id);
  if (!res.ok) {
    if (res.missing) {
      return (
        <p role="alert" className="m-4 rounded-[12px] border border-warn-orange bg-warn-gold-bg px-4 py-3 text-sm font-semibold text-warn-gold-text">
          {missingMessage(lang)}
        </p>
      );
    }
    notFound();
  }
  const row = res.data;
  if (!row || !isBuiltModule(row.module)) notFound();
  const built = row.module;

  const isOwner = row.ownerId === profile.id;
  const readOnly = !isOwner;
  const settings = await getStoryboardSettings(built, profile.id, lang);
  const dbReady = settings.ok;
  const resolved = resolveSettings(built, lang, settings.ok ? settings.data.org : {}, settings.ok ? settings.data.agent : {});

  const base = `/storyboards/practice/${id}`;
  const stepHrefs: Partial<Record<StepKey, string>> = {};
  for (const s of STORYBOARD_STEPS) stepHrefs[URL_TO_TAB[s]] = `${base}/${s}`;
  const doneSteps = STORYBOARD_STEPS.filter((s) => row.stepStatus[s] === "saved").map((s) => URL_TO_TAB[s]);
  const fillSaved = row.stepStatus.fill === "saved";

  const common: ScreenCommon = {
    target: practiceTarget(id),
    readOnly,
    notes: row.notes ?? "",
    savedAt: row.savedAt,
    // A practice row exists from the start; "has a row" means Step 1 was saved.
    hasRow: fillSaved,
    dbReady,
    settings: resolved,
    agentFirstName: profile.full_name.trim().split(/\s+/)[0] ?? "",
    outcome: row.outcome,
  };
  const key = `practice-${id}-${built}-${lang}-${row.savedAt ?? "new"}-${resolved.overridden.length}-${resolved.script.map((s) => s.text.length).join(",")}`;
  const screen = renderScreen(built, stepKey, common, fillSaved ? row.inputs : null, { firstName: "", age: null }, key);

  return (
    <LangProvider lang={lang}>
      <div lang={htmlLang(lang)} className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-5 sm:px-6 sm:py-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label={t("page.breadcrumbNav", lang)} className="text-[13px] text-muted-2">
            <Link href="/storyboards" className="hover:underline">{t("page.breadcrumbRoot", lang)}</Link>
            <span aria-hidden="true"> › </span>
            <span className="font-semibold text-navy">{t("practice.breadcrumb", lang)}</span>
          </nav>
          <LangToggle lang={lang} />
        </div>

        <section className="flex flex-col gap-2 rounded-[20px] border border-sand bg-white px-4 py-3 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-navy">{t("practice.badge", lang)}</span>
            <span className="text-sm font-bold text-navy">{row.title ?? t("practice.untitled", lang)}</span>
          </div>
          <p className="m-0 text-[13px] text-ink">{t("practice.banner", lang, { days: PRACTICE_RETENTION_DAYS })}</p>
          {isOwner ? (
            <PracticeActions id={id} module={built} title={row.title} afterDeleteHref="/storyboards" />
          ) : null}
        </section>

        {readOnly ? (
          <p role="status" className="m-0 rounded-[12px] border border-warn-orange bg-warn-gold-bg px-4 py-3 text-sm font-semibold text-warn-gold-text">
            {t("practice.readOnlyBanner", lang, { name: row.ownerName ?? t("practice.someone", lang) })}
          </p>
        ) : null}

        {!dbReady ? (
          <p role="alert" className="m-0 rounded-[12px] border border-alert-red bg-alert-red-bg px-4 py-3 text-sm font-semibold text-alert-red">
            {t("page.loadFailed", lang)}
          </p>
        ) : null}

        <StepTabs current={URL_TO_TAB[stepKey]} done={doneSteps} hrefs={stepHrefs} lang={lang} />

        <h1 className="m-0 text-2xl font-extrabold tracking-tight text-navy">{moduleTitle(built, lang)}</h1>

        {screen}

        <details className="rounded-[12px] border border-sand bg-white px-4">
          <summary className="flex min-h-12 cursor-pointer items-center text-sm font-bold tracking-wide text-navy">{t("page.disclaimerTitle", lang)}</summary>
          <div className="flex flex-col gap-2 pb-4 text-[13px] leading-relaxed text-ink">
            <p className="m-0">{t("page.disclaimer1", lang)}</p>
            <p className="m-0">{t("page.disclaimer2", lang)}</p>
            <p className="m-0">{t("page.disclaimer3", lang)}</p>
            <p className="m-0">{t("page.disclaimer4", lang)}</p>
          </div>
        </details>
      </div>
    </LangProvider>
  );
}
