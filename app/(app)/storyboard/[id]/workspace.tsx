"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { compute, headline, suggestedCover, type ModuleInputs, type StoryboardModule, type StoryboardProfile } from "@/lib/storyboard/modules";
import { STORYBOARD_TEXT, rm, type Lang } from "@/lib/storyboard/i18n";
import { waSummary } from "@/lib/storyboard/story";
import { waLink } from "@/lib/whatsapp";
import type { ClosingScript } from "@/app/(app)/wa-flow/scripts/data";
import { saveSession, markPresented, markShared, attachLead } from "../actions";
import type { QuoteHandoff } from "../data";
import { moduleViews } from "./module-views";
import { ProfileForm, ScriptLibrary, TalkTrack, UnderwritingCheck } from "./side-panels";

export type WorkspaceSession = {
  id: string;
  module: StoryboardModule;
  lang: Lang;
  profile: StoryboardProfile;
  inputs: ModuleInputs[StoryboardModule];
  riskFlags: string[];
  notes: string;
  status: "draft" | "presented" | "shared";
  presentedAt: string | null;
  lead: { id: string; full_name: string; phone: string | null; pipeline_stage: string } | null;
};

type Tab = "gap" | "solution" | "next";

export function StoryboardWorkspace({
  session,
  scripts,
  agent,
  quote,
  leadOptions,
}: {
  session: WorkspaceSession;
  scripts: ClosingScript[];
  agent: { name: string; phone: string | null };
  quote: QuoteHandoff | null;
  leadOptions: { id: string; fullName: string }[];
}) {
  const { module } = session;
  const [profile, setProfile] = useState(session.profile);
  const [inputs, setInputs] = useState(session.inputs);
  const [notes, setNotes] = useState(session.notes);
  const [riskFlags, setRiskFlags] = useState(session.riskFlags);
  const [lang, setLang] = useState<Lang>(session.lang);
  const [tab, setTab] = useState<Tab>("gap");
  const [presenting, setPresenting] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const t = STORYBOARD_TEXT[lang];

  const result = useMemo(() => compute(module, inputs as never), [module, inputs]);

  // Autosave, a second after the last change. The first render is the stored
  // state, so it is skipped rather than written straight back.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState("saving");
    const timer = setTimeout(async () => {
      const res = await saveSession(session.id, { profile, inputs, notes, riskFlags, lang });
      setSaveState(res.error ? "error" : "saved");
    }, 1000);
    return () => clearTimeout(timer);
  }, [session.id, profile, inputs, notes, riskFlags, lang]);

  const setModuleInputs = (patch: object) => setInputs((prev) => ({ ...prev, ...patch }) as typeof prev);
  const toggleFlag = (f: string) => setRiskFlags((fs) => (fs.includes(f) ? fs.filter((x) => x !== f) : [...fs, f]));

  const views = moduleViews({ module, result, inputs, profile, lang, set: setModuleInputs });
  const { question, intro, inputsForm, analytics, talkTrack, assumptions } = views;
  const summary = waSummary(module, result as never, inputs as never, profile, lang, agent);

  const gapBlocks = (
    <div className="flex flex-col gap-4">
      {views.lead?.node}
      {views.gap}
      {views.breakdown}
    </div>
  );

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-sand bg-white/90 px-5 py-3.5 backdrop-blur-md lg:px-[30px]">
        <Link href="/storyboard" className="text-[12.5px] font-semibold text-muted hover:text-navy">
          ← Storyboard
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[19px] font-extrabold tracking-[-0.02em] text-navy">{t.modules[module].name}</h1>
            {session.lead ? (
              <Link
                href={`/leads/${session.lead.id}`}
                className="rounded-full bg-info-blue-bg px-2.5 py-0.5 text-[11.5px] font-bold text-info-blue-text"
              >
                {session.lead.full_name}
              </Link>
            ) : (
              <span className="rounded-full bg-warn-gold-bg px-2.5 py-0.5 text-[11.5px] font-bold text-warn-gold-text">
                {t.common.practice}
              </span>
            )}
          </div>
          <div className="text-[11.5px] font-medium text-taupe">
            {saveState === "saving"
              ? t.common.saving
              : saveState === "error"
                ? lang === "bm"
                  ? "Gagal simpan — semak sambungan"
                  : "Not saved — check your connection"
                : saveState === "saved"
                  ? t.common.saved
                  : t.modules[module].tagline}
          </div>
        </div>
        <LangToggle lang={lang} setLang={setLang} />
        <button
          type="button"
          onClick={() => setPresenting(true)}
          className="flex items-center gap-2 rounded-[11px] bg-brand px-4 py-2.5 text-[13px] font-bold text-white"
        >
          <span className="text-gold">▶</span>
          {t.common.present}
        </button>
      </header>

      {/* Full width: inputs on the left (~40%), the live story on the right. */}
      <div className="grid grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:px-[30px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <div className="text-[11px] font-bold tracking-[0.14em] text-warn-orange uppercase">
              01 · {t.scenes.story}
            </div>
            <h2 className="mt-1 text-[24px] leading-tight font-extrabold tracking-[-0.025em] text-navy">{question}</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed font-medium text-muted">{intro}</p>
          </div>
          <ProfileForm profile={profile} set={(p) => setProfile((x) => ({ ...x, ...p }))} lang={lang} />
          <div className="text-[11px] font-bold tracking-[0.14em] text-warn-orange uppercase">02 · {t.scenes.numbers}</div>
          {inputsForm}
          <label className="block rounded-[16px] border border-sand bg-white p-4">
            <span className="text-[14px] font-bold text-navy">{t.common.notes}</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.common.notesHint}
              rows={4}
              className="mt-2 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-brand"
            />
          </label>
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-4 lg:sticky lg:top-[84px]">
            <div className="flex w-full rounded-[12px] border border-sand-2 bg-cream p-1">
              {(
                [
                  ["gap", `03 · ${t.scenes.gap}`],
                  ["solution", `04 · ${t.scenes.solution}`],
                  ["next", `05 · ${t.scenes.next}`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={
                    tab === key
                      ? "flex-1 rounded-[9px] bg-brand px-3 py-2 text-[12.5px] font-bold text-white"
                      : "flex-1 rounded-[9px] px-3 py-2 text-[12.5px] font-semibold text-muted hover:text-navy"
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "gap" && (
              <>
                {gapBlocks}
                <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">{t.analytics.title}</div>
                {analytics}
                <details className="rounded-[16px] border border-sand bg-white px-4 py-3">
                  <summary className="cursor-pointer text-[12.5px] font-bold text-navy">{t.common.assumptions}</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] leading-relaxed font-medium text-muted">
                    {assumptions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11.5px] font-medium text-taupe italic">{t.common.disclaimer}</p>
                </details>
              </>
            )}

            {tab === "solution" && (
              <>
                <TalkTrack steps={talkTrack} lang={lang} />
                <UnderwritingCheck flags={riskFlags} toggle={toggleFlag} module={module} lang={lang} />
                <ScriptLibrary scripts={scripts} lang={lang} />
              </>
            )}

            {tab === "next" && (
              <NextSteps session={session} summary={summary} lang={lang} leadOptions={leadOptions} quote={quote} gap={headline(module, result).gap} />
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {presenting && (
          <PresentMode
            key="present"
            onExit={() => setPresenting(false)}
            lang={lang}
            question={question}
            intro={intro}
            profile={profile}
            module={module}
            inputsForm={inputsForm}
            slides={[
              ...(views.lead ? [{ key: "lead", title: views.lead.title, body: views.lead.node }] : []),
              { key: "gap", title: t.scenes.gap, body: views.gap },
              {
                key: "breakdown",
                title: lang === "bm" ? "Di sebalik angka" : "Behind the number",
                body: (
                  <div className="flex flex-col gap-4">
                    {views.breakdown}
                    {analytics}
                  </div>
                ),
              },
              { key: "solution", title: t.scenes.solution, body: <TalkTrack steps={talkTrack} lang={lang} /> },
            ]}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex rounded-[10px] border border-sand-2 bg-cream p-[3px]" role="group" aria-label="Language">
      {(["bm", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={
            lang === l
              ? "rounded-[7px] bg-brand px-2.5 py-1 text-[11.5px] font-bold text-white"
              : "rounded-[7px] px-2.5 py-1 text-[11.5px] font-semibold text-muted"
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function NextSteps({
  session,
  summary,
  lang,
  leadOptions,
  quote,
  gap,
}: {
  session: WorkspaceSession;
  summary: string;
  lang: Lang;
  leadOptions: { id: string; fullName: string }[];
  quote: QuoteHandoff | null;
  gap: number;
}) {
  const t = STORYBOARD_TEXT[lang].next;
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [presentedAt, setPresentedAt] = useState(session.presentedAt);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const matches = query.trim()
    ? leadOptions.filter((l) => l.fullName.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-[20px] border border-sand bg-white p-5">
        <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">{t.preview}</div>
        <pre className="mt-3 max-h-[300px] overflow-y-auto rounded-[12px] bg-cream px-3.5 py-3 font-sans text-[12.5px] leading-relaxed font-medium whitespace-pre-wrap text-ink">
          {summary}
        </pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(summary);
              setCopied(true);
              startTransition(async () => void (await markShared(session.id, "whatsapp")));
            }}
            className="rounded-[10px] border border-sand-2 bg-white px-3.5 py-2.5 text-[12.5px] font-bold text-navy"
          >
            {copied ? t.copied : t.copyWa}
          </button>
          {session.lead?.phone && (
            <a
              href={waLink(session.lead.phone, summary)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => startTransition(async () => void (await markShared(session.id, "whatsapp")))}
              className="rounded-[10px] bg-green px-3.5 py-2.5 text-[12.5px] font-bold text-white"
            >
              {t.sendWa}
            </a>
          )}
        </div>
      </div>

      <div className="rounded-[20px] border border-sand bg-white p-5">
        <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">{t.title}</div>
        {notice && (
          <div className="mt-3 rounded-[10px] bg-success-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-green">{notice}</div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await markPresented(session.id);
                if (res.error) return setNotice(res.error);
                setPresentedAt(new Date().toISOString());
                setNotice(res.movedToAppointment ? t.movedToAppointment : t.presented);
              })
            }
            className="rounded-[10px] bg-brand px-3.5 py-2.5 text-[12.5px] font-bold text-white disabled:opacity-60"
          >
            {presentedAt ? `✓ ${t.presented}` : t.markPresented}
          </button>
          {quote && (
            <a
              href={quote.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[10px] border border-[#f0dfb4] bg-warn-gold-bg px-3.5 py-2.5 text-[12.5px] font-bold text-warn-gold-text"
            >
              {t.createQuote}
              {suggestedCover(gap) > 0 && ` · ${t.target} ${rm(suggestedCover(gap))}`}
            </a>
          )}
          <a
            href={`/storyboard/${session.id}/report`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[10px] border border-sand-2 bg-white px-3.5 py-2.5 text-[12.5px] font-bold text-navy"
          >
            {t.report}
          </a>
        </div>

        {quote && quote.since.length > 0 && (
          <div className="mt-4 border-t border-sand-3 pt-3.5">
            <div className="text-[12px] font-bold text-navy">{t.quotesSince}</div>
            <div className="mt-2 flex flex-col gap-1.5">
              {quote.since.map((q) => (
                <Link
                  key={q.id}
                  href={`/leads/${session.lead!.id}`}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-sand-2 px-3 py-2 text-[12.5px] font-semibold text-ink hover:bg-cream"
                >
                  <span>{q.plan ?? q.product}</span>
                  {q.monthly !== null && <span className="font-bold text-navy tabular-nums">{rm(q.monthly)}/mo</span>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {!session.lead && (
          <div className="mt-4 border-t border-sand-3 pt-4">
            <p className="text-[12.5px] font-medium text-muted">{t.noLead}</p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === "bm" ? "Cari nama lead…" : "Search lead name…"}
              className="mt-2 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-brand"
            />
            {matches.length > 0 && (
              <div className="mt-1.5 flex flex-col overflow-hidden rounded-[10px] border border-sand-2">
                {matches.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await attachLead(session.id, l.id);
                        setNotice(res.error ?? `${t.attachLead}: ${l.fullName}`);
                        setQuery("");
                      })
                    }
                    className="border-b border-sand-3 px-3 py-2 text-left text-[12.5px] font-semibold text-navy last:border-b-0 hover:bg-cream"
                  >
                    {l.fullName}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// Full screen, slide by slide. The prospect only ever sees the story; the
// inputs open in a drawer so the agent can adjust a figure mid-conversation
// and every number on the slide tweens to the new value.
function PresentMode({
  onExit,
  lang,
  question,
  intro,
  profile,
  module,
  inputsForm,
  slides,
}: {
  onExit: () => void;
  lang: Lang;
  question: string;
  intro: string;
  profile: StoryboardProfile;
  module: StoryboardModule;
  inputsForm: React.ReactNode;
  slides: { key: string; title: string; body: React.ReactNode }[];
}) {
  const t = STORYBOARD_TEXT[lang];
  const all = [{ key: "story", title: t.scenes.story, body: null as React.ReactNode }, ...slides];
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [drawer, setDrawer] = useState(false);

  const go = (to: number) => {
    const next = Math.max(0, Math.min(all.length - 1, to));
    setDirection(next >= index ? 1 : -1);
    setIndex(next);
  };

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === "Escape") onExit();
      if (typing) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(index + 1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const slide = all[index];
  const facts = [
    profile.age ? `${profile.age} ${lang === "bm" ? "tahun" : "years old"}` : null,
    profile.occupation || null,
    profile.dependants ? `${profile.dependants} ${t.profile.dependants.toLowerCase()}` : null,
  ].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex h-dvh w-screen flex-col bg-cream"
    >
      <div className="flex items-center gap-3 px-5 py-3.5 sm:px-8">
        <div className="flex flex-1 items-center gap-1.5">
          {all.map((s, n) => (
            <button
              key={s.key}
              type="button"
              onClick={() => go(n)}
              aria-label={s.title}
              className={`h-1.5 rounded-full transition-all ${n === index ? "w-8 bg-brand" : "w-4 bg-sand-2"}`}
            />
          ))}
          <span className="ml-2 text-[12px] font-bold text-taupe">{slide.title}</span>
        </div>
        <button
          type="button"
          onClick={() => setDrawer((d) => !d)}
          className="rounded-[10px] border border-sand-2 bg-white px-3 py-2 text-[12px] font-bold text-navy"
        >
          {lang === "bm" ? "Ubah angka" : "Edit numbers"}
        </button>
        <button type="button" onClick={onExit} className="rounded-[10px] bg-brand px-3 py-2 text-[12px] font-bold text-white">
          {t.common.exitPresent}
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.key}
            custom={direction}
            initial={{ opacity: 0, x: 60 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 * direction }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 overflow-y-auto px-5 pb-24 sm:px-12"
          >
            {slide.key === "story" ? (
              <div className="mx-auto flex min-h-full max-w-[1100px] flex-col justify-center py-10">
                <div className="text-[12px] font-bold tracking-[0.16em] text-warn-orange uppercase">
                  {t.modules[module].name} · {t.modules[module].tagline}
                </div>
                <h2 className="mt-3 text-[36px] leading-[1.08] font-extrabold tracking-[-0.03em] text-navy sm:text-[56px]">
                  {question}
                </h2>
                <p className="mt-5 max-w-[760px] text-[16px] leading-relaxed font-medium text-muted sm:text-[19px]">{intro}</p>
                {facts.length > 0 && (
                  <div className="mt-7 flex flex-wrap gap-2">
                    {facts.map((f) => (
                      <span key={f} className="rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-navy shadow-card">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mx-auto w-full max-w-[1400px] py-6">{slide.body}</div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="pointer-events-auto rounded-full border border-sand-2 bg-white px-5 py-2.5 text-[13px] font-bold text-navy shadow-card disabled:opacity-40"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === all.length - 1}
            className="pointer-events-auto rounded-full bg-brand px-6 py-2.5 text-[13px] font-bold text-white shadow-card disabled:opacity-40"
          >
            →
          </button>
        </div>

        <AnimatePresence>
          {drawer && (
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 w-full max-w-[460px] overflow-y-auto border-l border-sand bg-cream p-4 shadow-elevated"
            >
              {inputsForm}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
