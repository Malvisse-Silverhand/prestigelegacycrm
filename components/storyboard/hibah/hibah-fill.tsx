"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { computeModule } from "@/lib/storyboard/engine";
import { formToInputs, toForm, type HibahForm, type HibahNumKey } from "@/lib/storyboard/hibah-form";
import { buildHibahWaSummary } from "@/lib/storyboard/wa-summary";
import { saveStoryboard } from "@/app/(app)/leads/[id]/storyboard/actions";
import { Accordion } from "../accordion";
import { useT } from "../lang-context";
import { CopyToWa } from "../copy-to-wa";
import { SaveButton } from "../save-button";
import { SceneFrame } from "../scene-frame";
import { ScenarioFlow } from "../scenario-flow";
import { HibahShield, TONE_SWATCH } from "./hibah-shield";
import { CARD, NumberField, Note, SelectField, TextField } from "./fields";
import type { HibahScreenProps } from "./types";

export function HibahFill(props: HibahScreenProps) {
  const router = useRouter();
  const { t, lang } = useT();
  const COVER_OPTIONS = [
    { value: "unsure" as const, label: t("hibah.cover.unsure") },
    { value: "covered" as const, label: t("hibah.cover.covered") },
    { value: "partial" as const, label: t("hibah.cover.partial") },
    { value: "no" as const, label: t("hibah.cover.no") },
  ];
  const [form, setForm] = useState<HibahForm>(() => toForm(props.stored));
  const [notes, setNotes] = useState(props.notes);
  const [savedAt, setSavedAt] = useState<string | null>(props.savedAt);
  const [error, setError] = useState<string | null>(props.dbReady ? null : t("err.dbMissing"));
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof HibahForm>(key: K, value: HibahForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const num = (key: HibahNumKey) => ({ value: form[key], onChange: (v: string) => set(key, v) });

  // Recomputed on every change. This is a preview: the server recomputes on save.
  const inputs = useMemo(() => formToInputs(form), [form]);
  const result = useMemo(() => computeModule("hibah", inputs, lang), [inputs, lang]);
  const { out, scene } = result;
  const nick = form.nick.trim() || t("common.prospect");
  const tpd = form.scenario === "tpd";

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveStoryboard({ leadId: props.leadId, module: "hibah", step: "fill", inputs, notes, lang });
        if (res.error) {
          setError(res.error);
          return;
        }
        setSavedAt(res.savedAt);
        router.refresh();
      } catch {
        setError(t("common.connectError"));
      }
    });
  }

  const waText = buildHibahWaSummary({
    nick: form.nick,
    out,
    planName: props.settings.planName,
    agentFirstName: props.agentFirstName,
    lang,
  });

  const need = out.need > 0 ? out.need : 1;
  const bar = (v: number) => ({ width: `${((v / need) * 100).toFixed(2)}%` });
  const maxY = Math.max(1, ...out.yearly);
  const bars = out.yearly.slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-green">{t("hibah.fill.eyebrow")}</p>
        <h2 className="m-0 text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
          {t("hibah.fill.titleA", { nick })} <span className="text-info-blue-text">{t("hibah.fill.titleB")}</span>
        </h2>
        <p className="m-0 max-w-[680px] text-[13px] leading-relaxed text-ink">
          {t("hibah.fill.lead")}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <form aria-label={t("hibah.fill.formAria")} onSubmit={(e) => e.preventDefault()} className="flex min-w-0 flex-col gap-3.5">
          <Accordion title={t("hibah.fill.s1")}>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <TextField label={t("hibah.fill.nick")} value={form.nick} onChange={(v) => set("nick", v)} />
              <NumberField label={t("prospect.age")} {...num("age")} />
              <SelectField
                label={t("hibah.fill.scenario")}
                value={form.scenario}
                onChange={(v) => set("scenario", v)}
                options={[
                  { value: "death", label: t("hibah.fill.scenarioDeath") },
                  { value: "tpd", label: t("hibah.fill.scenarioTpd") },
                ]}
              />
              <NumberField label={t("hibah.fill.income")} hint={t("hibah.fill.incomeHint")} {...num("income")} />
              <NumberField label={t("hibah.fill.years")} hint={t("hibah.fill.yearsHint")} {...num("years")} />
              <NumberField
                label={t("hibah.fill.inflation")}
                hint={t("hibah.fill.inflationHint")}
                decimal
                negative
                {...num("inflation")}
              />
            </div>
            <div className="mt-3.5">
              <Note>
                {tpd ? t("hibah.fill.noteTpd") : t("hibah.fill.noteDeath")}
              </Note>
            </div>
          </Accordion>

          <Accordion title={t("hibah.fill.s2")}>
            <div className="flex flex-col gap-3.5">
              <p className="m-0 text-[13px] text-ink">{t("hibah.fill.methodIntro")}</p>
              <SelectField
                label={t("hibah.fill.method")}
                value={form.method}
                onChange={(v) => set("method", v)}
                options={[
                  { value: "replace", label: t("hibah.fill.methodReplace") },
                  { value: "itemize", label: t("hibah.fill.methodItemize") },
                ]}
              />
              {form.method === "replace" ? (
                <div className="max-w-xs">
                  <NumberField
                    label={t("hibah.fill.replace")}
                    hint={t("hibah.fill.replaceHint")}
                    {...num("replace")}
                  />
                </div>
              ) : (
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <NumberField label={t("hibah.fill.eFood")} {...num("eFood")} />
                  <NumberField label={t("hibah.fill.eUtil")} {...num("eUtil")} />
                  <NumberField label={t("hibah.fill.eSchool")} {...num("eSchool")} />
                  <NumberField label={t("hibah.fill.eTrans")} {...num("eTrans")} />
                  <NumberField label={t("hibah.fill.eRent")} {...num("eRent")} />
                  <NumberField label={t("hibah.fill.eOther")} {...num("eOther")} />
                </div>
              )}
              <div className="max-w-xs">
                <NumberField
                  label={t("hibah.fill.other")}
                  hint={t("hibah.fill.otherHint")}
                  {...num("other")}
                />
              </div>
              <Note>
                {form.method === "itemize"
                  ? t("hibah.fill.noteItemised", { amount: formatRm(out.itemTotal) })
                  : t("hibah.fill.noteReplaceBasis", { amount: formatRm(out.base) })}{" "}
                {t("hibah.fill.noteMonthly", { amount: out.text.monthly })}
              </Note>
            </div>
          </Accordion>

          <Accordion title={t("hibah.fill.s3")}>
            <div className="flex flex-col gap-3.5">
              <p className="m-0 text-[13px] text-ink">{t("hibah.fill.debtsIntro")}</p>
              <h4 className="m-0 text-base font-bold text-navy">{t("hibah.fill.homeQ")}</h4>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <NumberField label={t("hibah.fill.home")} {...num("home")} />
                <SelectField label={t("hibah.fill.homeCov")} value={form.homeCov} onChange={(v) => set("homeCov", v)} options={COVER_OPTIONS} />
                {form.homeCov === "partial" ? <NumberField label={t("hibah.fill.partAmount")} {...num("homePart")} /> : null}
              </div>
              <hr className="m-0 border-0 border-t border-dashed border-sand-2" />
              <h4 className="m-0 text-base font-bold text-navy">{t("hibah.fill.carQ")}</h4>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <NumberField label={t("hibah.fill.car")} {...num("car")} />
                <SelectField label={t("hibah.fill.carCov")} value={form.carCov} onChange={(v) => set("carCov", v)} options={COVER_OPTIONS} />
                {form.carCov === "partial" ? <NumberField label={t("hibah.fill.partAmount")} {...num("carPart")} /> : null}
              </div>
              <hr className="m-0 border-0 border-t border-dashed border-sand-2" />
              <div className="max-w-xs">
                <NumberField
                  label={t("hibah.fill.otherDebt")}
                  hint={t("hibah.fill.otherDebtHint")}
                  {...num("otherDebt")}
                />
              </div>
            </div>
          </Accordion>

          <Accordion title={t("hibah.fill.s4")}>
            <div className="flex flex-col gap-3.5">
              <p className="m-0 text-[13px] text-ink">{t("hibah.fill.oneoffIntro")}</p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <NumberField label={t("hibah.fill.edu")} hint={t("hibah.fill.eduHint")} {...num("edu")} />
                <NumberField
                  label={t("hibah.fill.emergency")}
                  hint={t("hibah.fill.emergencyHint")}
                  {...num("emergency")}
                />
                <NumberField
                  label={tpd ? t("hibah.fill.funeralTpd") : t("hibah.fill.funeralDeath")}
                  hint={t("hibah.fill.funeralHint")}
                  {...num("funeral")}
                />
              </div>
            </div>
          </Accordion>

          <Accordion title={t("hibah.fill.s5")}>
            <div className="flex flex-col gap-3.5">
              <p className="m-0 text-[13px] text-ink">{t("hibah.fill.inPlaceIntro")}</p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <NumberField label={t("hibah.fill.savings")} hint={t("hibah.fill.savingsHint")} {...num("savings")} />
                <NumberField
                  label={tpd ? t("hibah.fill.existingTpd") : t("hibah.fill.existingDeath")}
                  hint={t("hibah.fill.existingHint")}
                  {...num("existing")}
                />
              </div>
            </div>
          </Accordion>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sb-notes" className="text-[13px] font-semibold text-navy">
              {t("hibah.fill.notes")}
            </label>
            <textarea
              id="sb-notes"
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("hibah.fill.notesPlaceholder")}
              className="rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-sm text-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
            />
            <span className="text-xs text-muted-2">{t("hibah.fill.notesHint")}</span>
          </div>
        </form>

        <aside aria-label={t("hibah.fill.dashAria")} className="flex min-w-0 flex-col gap-4">
          <SceneFrame
            caption={<span className="font-semibold text-navy tabular-nums">{result.caption}</span>}
            legend={result.legend.map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: TONE_SWATCH[l.tone] }} />
                {l.label} <b className="tabular-nums text-navy">{l.value}</b>
              </span>
            ))}
          >
            <HibahShield scene={scene} out={out} />
          </SceneFrame>

          <ScenarioFlow slides={result.flow} />

          <section className="rounded-[20px] bg-navy p-5 text-cream shadow-card" aria-label={t("result.aria")}>
            <div className="text-[15px] text-white/80">{t("hibah.fill.resultHeading")}</div>
            <div className="mt-1 text-[40px] font-bold leading-[1.1] tracking-tight text-gold tabular-nums">{out.text.gap}</div>
            <div className="mt-1 text-[13px] text-white/70">
              {t("hibah.fill.resultContext", { need: out.text.need, have: out.text.have })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <svg role="img" aria-label={t("hibah.fill.ringAria", { pct: out.pct })} width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="34" fill="none" stroke="#24406a" strokeWidth="10" />
                <circle
                  cx="48" cy="48" r="34" fill="none" stroke="#fac748" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray="213.6" strokeDashoffset={scene.ringOffset.toFixed(1)} transform="rotate(-90 48 48)"
                />
                <text x="48" y="48" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fdf9f3">{out.pct}%</text>
                <text x="48" y="64" textAnchor="middle" fontSize="10" fill="#c9d2e0">{t("hibah.fill.ringAvailable")}</text>
              </svg>
              <dl className="m-0 flex min-w-[180px] flex-1 flex-col gap-1.5">
                {[
                  [t("hibah.fill.rowNeed"), out.text.need, ""],
                  [t("hibah.fill.rowHave"), out.text.have, ""],
                  [t("hibah.fill.rowGap"), out.text.gap, "text-[#ffb4a8]"],
                ].map(([k, v, c]) => (
                  <div key={k} className="flex justify-between rounded-[8px] bg-white/10 px-3 py-2">
                    <dt className="text-[13px] text-white/75">{k}</dt>
                    <dd className={`m-0 text-sm font-bold tabular-nums ${c}`}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section className={CARD}>
            <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">{t("hibah.fill.breakdown")}</h3>
            <div aria-hidden="true" className="mt-3 flex h-3.5 overflow-hidden rounded-full bg-sand">
              <div className="bg-info-blue-text" style={bar(out.support)} />
              <div className="bg-[#e3a823]" style={bar(out.debts)} />
              <div className="bg-green" style={bar(out.oneoff)} />
            </div>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0 text-sm">
              {[
                [t("hibah.fill.bkSupport"), out.text.support, "bg-info-blue-text"],
                [t("hibah.fill.bkDebts"), out.text.debts, "bg-[#e3a823]"],
                [t("hibah.fill.bkOneoff"), out.text.oneoff, "bg-green"],
              ].map(([k, v, c]) => (
                <li key={k} className="flex items-center gap-2.5">
                  <span aria-hidden="true" className={`h-3 w-3 rounded-[3px] ${c}`} />
                  <span className="flex-1 text-ink">{k}</span>
                  <span className="font-bold tabular-nums text-navy">{v}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={CARD}>
            <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">{t("hibah.fill.perYear")}</h3>
            <div aria-hidden="true" className="mt-3 flex h-[120px] items-end gap-2 border-b border-sand">
              {bars.map((y, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
                  <div
                    className="w-full max-w-9 rounded-t-[6px] bg-info-blue-text"
                    style={{ height: `${Math.max(4, Math.round((y / maxY) * 100))}%` }}
                  />
                </div>
              ))}
            </div>
            <div aria-hidden="true" className="mt-1 flex gap-2">
              {bars.map((_, i) => (
                <span key={i} className="flex-1 text-center text-xs text-muted-2">{t("hibah.fill.yearShort", { n: i + 1 })}</span>
              ))}
            </div>
            <p className="m-0 mt-2 text-xs text-muted-2">
              {t("hibah.fill.yearRange", { first: out.text.y1, last: out.text.yN })}
            </p>
          </section>

          <Accordion title={t("hibah.fill.assump")} defaultOpen={false}>
            <ul className="m-0 list-disc pl-5 leading-7">
              <li>{t("hibah.fill.assump1")}</li>
              <li>{t("hibah.fill.assump2")}</li>
              <li>{t("hibah.fill.assump3")}</li>
              <li>{t("hibah.fill.assump4")}</li>
              <li>{t("hibah.fill.assump5")}</li>
            </ul>
          </Accordion>
        </aside>
      </div>

      <div className="flex flex-col gap-3 border-t border-sand pt-4">
        <SaveButton savedAt={savedAt} pending={pending} onSave={save} error={error} disabled={!props.dbReady} />
        <CopyToWa text={waText} label={t("common.copySummary")} />
      </div>
    </div>
  );
}

function formatRm(n: number): string {
  return "RM" + Math.round(n).toLocaleString("en-MY");
}
