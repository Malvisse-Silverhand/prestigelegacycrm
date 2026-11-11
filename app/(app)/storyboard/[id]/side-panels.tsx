"use client";

import { useMemo, useState } from "react";
import { STORYBOARD_TEXT, UNDERWRITING_FLAGS, underwritingLevel, type Lang } from "@/lib/storyboard/i18n";
import type { StoryboardModule, StoryboardProfile } from "@/lib/storyboard/modules";
import type { ClosingScript } from "@/app/(app)/wa-flow/scripts/data";
import { CheckChip, NumberField, SelectField, TextField } from "./fields";

export function ProfileForm({
  profile,
  set,
  lang,
}: {
  profile: StoryboardProfile;
  set: (patch: Partial<StoryboardProfile>) => void;
  lang: Lang;
}) {
  const t = STORYBOARD_TEXT[lang].profile;
  const opts = <K extends string>(o: Record<K, string>) => (Object.keys(o) as K[]).map((value) => ({ value, label: o[value] }));
  return (
    <section className="rounded-[16px] border border-sand bg-white p-4">
      <div className="text-[14px] font-bold text-navy">{t.title}</div>
      <p className="mt-0.5 text-[11.5px] font-medium text-taupe">{t.hint}</p>
      <div className="mt-3.5 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        <TextField label={t.nickname} value={profile.nickname} onChange={(nickname) => set({ nickname })} />
        <NumberField label={t.age} value={profile.age ?? 0} max={99} onChange={(age) => set({ age: age || null })} />
        <SelectField
          label={t.gender}
          value={profile.gender}
          placeholder="—"
          options={[
            { value: "male" as const, label: t.male },
            { value: "female" as const, label: t.female },
          ]}
          onChange={(gender) => set({ gender })}
        />
        <SelectField label={t.marital} value={profile.marital} placeholder="—" options={opts(t.maritalOptions)} onChange={(marital) => set({ marital })} />
        <TextField label={t.occupation} value={profile.occupation} onChange={(occupation) => set({ occupation })} />
        <SelectField
          label={t.occupationClass}
          value={profile.occupationClass}
          placeholder="—"
          options={(["1", "2", "3", "4"] as const).map((value) => ({ value, label: `${lang === "bm" ? "Kelas" : "Class"} ${value}` }))}
          onChange={(occupationClass) => set({ occupationClass })}
        />
        <SelectField label={t.smoker} value={profile.smoker} placeholder="—" options={opts(t.smokerOptions)} onChange={(smoker) => set({ smoker })} />
        <NumberField label={t.dependants} value={profile.dependants} max={20} onChange={(dependants) => set({ dependants })} />
        <SelectField label={t.budget} value={profile.budget} placeholder="—" options={opts(t.budgetOptions)} onChange={(budget) => set({ budget })} />
      </div>
    </section>
  );
}

export function TalkTrack({ steps, lang }: { steps: string[]; lang: Lang }) {
  const t = STORYBOARD_TEXT[lang].solution;
  return (
    <section className="rounded-[20px] border border-sand bg-white p-5">
      <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">{t.talkTrack}</div>
      <ol className="mt-3 flex flex-col gap-3">
        {steps.map((s, n) => (
          <li key={n} className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gold text-[11px] font-extrabold text-navy">
              {n + 1}
            </span>
            <p className="text-[13.5px] leading-relaxed font-medium text-ink">{s}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// The agency's own closing-scripts library (WA Flow), filtered to the module's
// set. Kept read-only here: scripts are edited where they live.
export function ScriptLibrary({ scripts, lang }: { scripts: ClosingScript[]; lang: Lang }) {
  const t = STORYBOARD_TEXT[lang].solution;
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const chapters = useMemo(() => {
    const m = new Map<string, ClosingScript[]>();
    for (const s of scripts) m.set(s.chapter, [...(m.get(s.chapter) ?? []), s]);
    return [...m.entries()];
  }, [scripts]);

  if (scripts.length === 0) return null;
  return (
    <section className="rounded-[20px] border border-sand bg-white p-5">
      <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">{t.objections}</div>
      <div className="mt-3 flex flex-col gap-3">
        {chapters.map(([chapter, rows]) => (
          <div key={chapter}>
            <div className="text-[12px] font-bold text-navy">{chapter}</div>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {rows.map((s) => (
                <div key={s.id} className="rounded-[12px] border border-sand-2">
                  <button
                    type="button"
                    onClick={() => setOpen(open === s.id ? null : s.id)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12.5px] font-semibold text-ink"
                  >
                    <span className="flex-1">{s.situation}</span>
                    <span className="text-taupe">{open === s.id ? "−" : "+"}</span>
                  </button>
                  {open === s.id && (
                    <div className="border-t border-sand-3 px-3 py-2.5">
                      <p className="text-[12.5px] leading-relaxed font-medium whitespace-pre-line text-ink">{s.body}</p>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(s.body);
                          setCopied(s.id);
                        }}
                        className="mt-2 rounded-[8px] border border-sand-2 px-2.5 py-1 text-[11.5px] font-bold text-navy"
                      >
                        {copied === s.id ? STORYBOARD_TEXT[lang].next.copied : lang === "bm" ? "Salin" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function UnderwritingCheck({
  flags,
  toggle,
  module,
  lang,
}: {
  flags: string[];
  toggle: (f: string) => void;
  module: StoryboardModule;
  lang: Lang;
}) {
  const t = STORYBOARD_TEXT[lang];
  const level = underwritingLevel(flags.length);
  const tone = { low: "bg-success-bg text-green", medium: "bg-warn-gold-bg text-warn-gold-text", high: "bg-alert-red-bg text-alert-red" }[level];
  return (
    <section className="rounded-[20px] border border-sand bg-white p-5">
      <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">{t.solution.underwriting}</div>
      <p className="mt-0.5 text-[11.5px] font-medium text-taupe">{t.solution.underwritingHint}</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {UNDERWRITING_FLAGS.map((f) => (
          <CheckChip key={f} checked={flags.includes(f)} onChange={() => toggle(f)} label={t.underwriting.flags[f]} />
        ))}
      </div>
      <div className={`mt-3.5 rounded-[12px] px-3.5 py-3 ${tone}`}>
        <div className="text-[13px] font-extrabold">
          {t.underwriting.level[level]} · {flags.length}
        </div>
        <p className="mt-0.5 text-[12.5px] font-medium">{t.underwriting.levelLine[level]}</p>
      </div>
      <p className="mt-2.5 text-[12px] leading-relaxed font-medium text-muted">
        {{ hibah: t.underwriting.hibahNote, medical: t.underwriting.medicalNote, ci: t.underwriting.ciNote }[module]}{" "}
        {t.underwriting.declare}
      </p>
    </section>
  );
}
