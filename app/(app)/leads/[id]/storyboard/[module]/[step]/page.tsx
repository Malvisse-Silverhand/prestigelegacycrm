import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { ageNextBirthday } from "@/lib/age";
import { getLeadStoryboards, getStoryboardSettings, type SavedStoryboard } from "@/lib/storyboard/data";
import { isBuiltModule, moduleName, moduleTitle } from "@/lib/storyboard/modules";
import { resolveSettings } from "@/lib/storyboard/settings";
import { isModule, isUuid } from "@/lib/storyboard/validate";
import { missingMessage } from "@/lib/storyboard/schema-error";
import { STORYBOARD_MODULES, STORYBOARD_STEPS, type StoryboardModule, type StoryboardStep } from "@/lib/storyboard/types";
import { htmlLang, t } from "@/lib/storyboard/i18n";
import { getStoryboardLang } from "@/lib/storyboard/i18n/server";
import { LangProvider } from "@/components/storyboard/lang-context";
import { LangToggle } from "@/components/storyboard/lang-toggle";
import { ModuleTabs, type ModuleKey } from "@/components/storyboard/module-tabs";
import { ProspectProfile } from "@/components/storyboard/prospect-profile";
import { StepTabs, type StepKey } from "@/components/storyboard/step-tabs";
import { renderScreen, type ScreenCommon } from "@/components/storyboard/registry";

type LeadRow = { id: string; full_name: string; phone: string | null; date_of_birth: string | null };

const URL_TO_TAB: Record<StoryboardStep, StepKey> = {
  fill: "fill",
  explain: "explain",
  risk: "risk",
  objections: "objection",
};

export default async function StoryboardStepPage({
  params,
}: {
  params: Promise<{ id: string; module: string; step: string }>;
}) {
  const { id, module, step } = await params;
  if (!isUuid(id) || !isModule(module)) notFound();
  if (!(STORYBOARD_STEPS as readonly string[]).includes(step)) notFound();
  const mod: StoryboardModule = module;
  const stepKey = step as StoryboardStep;

  const profile = await getCurrentProfile();
  if (!profile) return null;
  const lang = await getStoryboardLang();

  const supabase = await createClient();
  // RLS: a lead this person can't see comes back empty, which is a 404.
  const { data: lead } = await supabase
    .from("leads")
    .select("id, full_name, phone, date_of_birth")
    .eq("id", id)
    .maybeSingle<LeadRow>();
  if (!lead) notFound();

  // Mortgage (Phase 4b) has no screens or settings yet.
  const built = isBuiltModule(mod) ? mod : null;
  const [saved, settings] = await Promise.all([
    getLeadStoryboards(id),
    built ? getStoryboardSettings(built, profile.id, lang) : Promise.resolve(null),
  ]);
  const dbReady = saved.ok && (settings === null || settings.ok);
  const rows: SavedStoryboard[] = saved.ok ? saved.data : [];
  const row = rows.find((r) => r.module === mod) ?? null;
  const missing = (!saved.ok && saved.missing) || (settings !== null && !settings.ok && settings.missing);
  const loadFailed = (!saved.ok && !saved.missing) || (settings !== null && !settings.ok && !settings.missing);

  const base = `/leads/${id}/storyboard`;
  const moduleHrefs = Object.fromEntries(STORYBOARD_MODULES.map((m) => [m, `${base}/${m}/fill`])) as Record<ModuleKey, string>;
  const stepHrefs: Partial<Record<StepKey, string>> = {};
  for (const s of STORYBOARD_STEPS) stepHrefs[URL_TO_TAB[s]] = `${base}/${mod}/${s}`;
  const doneSteps = STORYBOARD_STEPS.filter((s) => row?.stepStatus[s] === "saved").map((s) => URL_TO_TAB[s]);

  const age = lead.date_of_birth ? Math.max(0, ageNextBirthday(lead.date_of_birth) - 1) : null;
  const firstName = lead.full_name.trim().split(/\s+/)[0] ?? "";

  let screen: React.ReactNode;
  if (!built) {
    screen = (
      <section className="rounded-[20px] border border-sand bg-white p-6 text-center shadow-card">
        <h2 className="m-0 text-lg font-bold text-navy">{t("page.comingSoon", lang, { module: moduleName(mod, lang) })}</h2>
        <p className="m-0 mt-2 text-sm text-ink">{t("page.comingSoonBody", lang)}</p>
        <Link
          href={`${base}/hibah/fill`}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[12px] bg-brand px-5 text-sm font-semibold text-white"
        >
          {t("page.openHibah", lang)}
        </Link>
      </section>
    );
  } else {
    const resolved = resolveSettings(built, lang, settings?.ok ? settings.data.org : {}, settings?.ok ? settings.data.agent : {});
    const common: ScreenCommon = {
      leadId: id,
      notes: row?.notes ?? "",
      savedAt: row?.savedAt ?? null,
      hasRow: Boolean(row),
      dbReady,
      settings: resolved,
      agentFirstName: profile.full_name.trim().split(/\s+/)[0] ?? "",
      outcome: row?.outcome ?? null,
    };
    // key: a fresh form state whenever the saved row, or the language, changes underneath.
    const key = `${id}-${built}-${lang}-${row?.savedAt ?? "new"}-${resolved.overridden.length}-${resolved.script.map((s) => s.text.length).join(",")}`;
    screen = renderScreen(built, stepKey, common, row ? row.inputs : null, { firstName, age }, key);
  }

  return (
    <LangProvider lang={lang}>
      <div lang={htmlLang(lang)} className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-5 sm:px-6 sm:py-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label={t("page.breadcrumbNav", lang)} className="text-[13px] text-muted-2">
            <Link href="/storyboards" className="hover:underline">{t("page.breadcrumbRoot", lang)}</Link>
            <span aria-hidden="true"> › </span>
            {/* Plain anchor: a soft navigation to /leads/<id> is caught by the lead popup route. */}
            <a href={`/leads/${id}`} className="font-semibold text-navy hover:underline">{lead.full_name}</a>
          </nav>
          <LangToggle lang={lang} />
        </div>

        <ProspectProfile name={lead.full_name} age={age} phone={lead.phone} lang={lang} />

        {missing ? (
          <p role="alert" className="m-0 rounded-[12px] border border-warn-orange bg-warn-gold-bg px-4 py-3 text-sm font-semibold text-warn-gold-text">
            {t("page.missingBanner", lang, { message: missingMessage(lang) })}
          </p>
        ) : loadFailed ? (
          <p role="alert" className="m-0 rounded-[12px] border border-alert-red bg-alert-red-bg px-4 py-3 text-sm font-semibold text-alert-red">
            {t("page.loadFailed", lang)}
          </p>
        ) : null}

        <ModuleTabs current={mod} saved={rows.map((r) => r.module)} hrefs={moduleHrefs} lang={lang} />
        {built ? <StepTabs current={URL_TO_TAB[stepKey]} done={doneSteps} hrefs={stepHrefs} lang={lang} /> : null}

        <h1 className="m-0 text-2xl font-extrabold tracking-tight text-navy">{moduleTitle(mod, lang)}</h1>

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
