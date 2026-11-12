"use client";

import { useMemo, useState } from "react";
import { computeModule } from "@/lib/storyboard/engine";
import { ciFormToInputs, toCiForm, type CiForm, type CiNumKey } from "@/lib/storyboard/ci-form";
import {
  CI_BOOSTER_OPTIONS,
  CI_COMMITMENT_LABELS,
  CI_MONTH_PRESETS,
  CI_PCT_PRESETS,
} from "@/lib/storyboard/defaults/ci";
import { CI_DEPENDENCY_COUNT } from "@/lib/storyboard/engine/ci";
import { buildCiWaSummary } from "@/lib/storyboard/wa-summary";
import { Accordion } from "../accordion";
import { CopyToWa } from "../copy-to-wa";
import { useT } from "../lang-context";
import { SaveButton } from "../save-button";
import { SceneFrame } from "../scene-frame";
import { ScenarioFlow } from "../scenario-flow";
import { SceneLegend } from "../legend";
import { ResultCard } from "../result-card";
import { CARD, ChipGroup, CheckRow, Note, NumberField, SelectField, TextAreaField, TextField } from "../fields";
import { useModuleStepSave } from "../use-step-save";
import { CiRunwayScene } from "./ci-scenes";
import { ciCommitLabels, ciDepLabel, ciDependencyItems } from "./ci-text";
import type { CiScreenProps } from "./types";

const DEP_STYLE = {
  "Low dependency so far": "bg-success-bg text-green",
  "Moderate dependency": "bg-warn-gold-bg text-warn-gold-text",
  "High dependency": "bg-alert-red-bg text-alert-red",
} as const;

export function CiFill(props: CiScreenProps) {
  const { t, lang } = useT();
  const [form, setForm] = useState<CiForm>(() => toCiForm(props.stored));
  const [notes, setNotes] = useState(props.notes);
  const step = useModuleStepSave("ci", props, "fill");

  const set = <K extends keyof CiForm>(key: K, value: CiForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const num = (key: CiNumKey) => ({ value: form[key], onChange: (v: string) => set(key, v) });

  // Recomputed on every change. This is a preview: the server recomputes on save.
  const inputs = useMemo(() => ciFormToInputs(form), [form]);
  const result = useMemo(() => computeModule("ci", inputs, lang), [inputs, lang]);
  const { out, scene } = result;
  const nick = form.nick.trim() || t("common.prospect");

  const commitLabels = ciCommitLabels(t);
  const toggleCommit = (label: string, on: boolean) =>
    set("commitChecked", on ? [...form.commitChecked, label] : form.commitChecked.filter((l) => l !== label));
  const toggleDep = (i: number, on: boolean) => set("deps", { ...form.deps, [String(i)]: on });

  // The story is agent-only: it is saved with the inputs but never reaches waText or the client summary.
  const waText = buildCiWaSummary({ nick: form.nick, out, agentFirstName: props.agentFirstName, lang });
  const pctNow = Number(form.pct);
  const monthsNow = Number(form.months);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-green">{t("ci.fill.kicker")}</p>
        <h2 className="m-0 text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
          {t("ci.fill.titleA", { nick })} <span className="text-info-blue-text">{t("ci.fill.titleB")}</span>
        </h2>
        <p className="m-0 max-w-[680px] text-[13px] leading-relaxed text-ink">{t("ci.fill.intro")}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <form aria-label={t("ci.fill.formLabel")} onSubmit={(e) => e.preventDefault()} className="flex min-w-0 flex-col gap-3.5">
          <Accordion title={t("ci.fill.whyTitle")} defaultOpen={false}>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              <li><strong className="block text-navy">{t("ci.fill.why1t")}</strong>{t("ci.fill.why1d")}</li>
              <li><strong className="block text-navy">{t("ci.fill.why2t")}</strong>{t("ci.fill.why2d")}</li>
              <li><strong className="block text-navy">{t("ci.fill.why3t")}</strong>{t("ci.fill.why3d")}</li>
              <li><strong className="block text-navy">{t("ci.fill.why4t")}</strong>{t("ci.fill.why4d")}</li>
            </ul>
          </Accordion>

          <Accordion title={t("ci.fill.storyTitle")} defaultOpen={false}>
            <div className="flex flex-col gap-3">
              <TextAreaField
                label={t("ci.fill.storyLabel")}
                value={form.story}
                onChange={(v) => set("story", v)}
                rows={4}
                maxLength={2000}
                placeholder={t("ci.fill.storyPlaceholder")}
                hint={t("ci.fill.storyHint")}
              />
            </div>
          </Accordion>

          <Accordion title={t("ci.fill.commitTitle")}>
            <div className="flex flex-col gap-2">
              <TextField label={t("ci.fill.nick")} value={form.nick} onChange={(v) => set("nick", v)} />
              {CI_COMMITMENT_LABELS.map((l, i) => (
                <CheckRow key={l} label={commitLabels[i]} checked={form.commitChecked.includes(l)} onChange={(on) => toggleCommit(l, on)} />
              ))}
              <p role="status" aria-live="polite" className="m-0 text-[13px] font-semibold text-navy">
                {t("ci.fill.commitCount", { n: form.commitChecked.length, total: CI_COMMITMENT_LABELS.length })}
              </p>
            </div>
          </Accordion>

          <Accordion title={t("ci.fill.depTitle")}>
            <div className="flex flex-col gap-2">
              {ciDependencyItems(t).map((d, i) => (
                <CheckRow key={d.label} label={d.label} hint={d.hint} checked={Boolean(form.deps[String(i)])} onChange={(on) => toggleDep(i, on)} />
              ))}
              <div className={`rounded-[16px] px-5 py-4 ${DEP_STYLE[out.depLevel]}`} role="status" aria-live="polite">
                <div className="text-xs font-bold uppercase tracking-wide">{t("ci.fill.depHeading")}</div>
                <div className="text-3xl font-extrabold leading-tight tracking-tight">
                  {out.depScore} / {CI_DEPENDENCY_COUNT}
                </div>
                <div className="text-[13px]">{ciDepLabel(t, out.depLevel)}</div>
              </div>
            </div>
          </Accordion>

          <Accordion title={t("ci.fill.sec1")}>
            <div className="flex flex-col gap-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <NumberField label={t("ci.fill.income")} {...num("income")} />
                <NumberField label={t("ci.fill.commit")} {...num("commit")} />
              </div>
              <ChipGroup
                legend={t("ci.fill.pctLegend")}
                value={CI_PCT_PRESETS.includes(pctNow) ? pctNow : -1}
                onChange={(v) => v >= 0 && set("pct", String(v))}
                options={[...CI_PCT_PRESETS.map((p) => ({ value: p, label: `${p}%` })), { value: -1, label: t("ci.fill.other") }]}
              />
              <div className="max-w-xs">
                <NumberField label={t("ci.fill.pctField")} decimal {...num("pct")} />
              </div>
              <ChipGroup
                legend={t("ci.fill.monthsLegend")}
                value={CI_MONTH_PRESETS.includes(monthsNow) ? monthsNow : -1}
                onChange={(v) => v >= 0 && set("months", String(v))}
                options={[...CI_MONTH_PRESETS.map((p) => ({ value: p, label: t("ci.fill.nMonths", { n: p }) })), { value: -1, label: t("ci.fill.other") }]}
              />
              <div className="max-w-xs">
                <NumberField label={t("ci.fill.monthsField")} {...num("months")} />
              </div>
              <Note>{t("ci.fill.monthlyNote", { amount: out.text.monthly })}</Note>
            </div>
          </Accordion>

          <Accordion title={t("ci.fill.sec2")}>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <NumberField label={t("ci.fill.rehab")} {...num("rehab")} />
              <NumberField label={t("ci.fill.emer")} {...num("emer")} />
              <NumberField label={t("ci.fill.cg")} hint={t("ci.fill.cgHint")} {...num("cg")} />
              <NumberField label={t("ci.fill.cgMonths")} {...num("cgMonths")} />
              <SelectField
                label={t("ci.fill.waiverLabel")}
                value={form.waiver}
                onChange={(v) => set("waiver", v)}
                options={[
                  { value: "yes", label: t("ci.fill.waiverYes") },
                  { value: "no", label: t("ci.fill.waiverNo") },
                ]}
              />
              <NumberField label={t("ci.fill.contrib")} hint={t("ci.fill.contribHint")} {...num("contrib")} />
            </div>
          </Accordion>

          <Accordion title={t("ci.fill.sec3")}>
            <div className="flex flex-col gap-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <NumberField label={t("ci.fill.savings")} {...num("savings")} />
                <NumberField label={t("ci.fill.employer")} {...num("employer")} />
                <SelectField
                  label={t("ci.fill.countEmp")}
                  hint={t("ci.fill.countEmpHint")}
                  value={form.countEmp}
                  onChange={(v) => set("countEmp", v)}
                  options={[
                    { value: "no", label: t("ci.fill.countNo") },
                    { value: "yes", label: t("ci.fill.countYes") },
                  ]}
                />
                <SelectField
                  label={t("ci.fill.structure")}
                  value={form.structure}
                  onChange={(v) => set("structure", v)}
                  options={[
                    { value: "none", label: t("ci.fill.structNone") },
                    { value: "late", label: t("ci.fill.structLate") },
                    { value: "staged", label: t("ci.fill.structStaged") },
                    { value: "standalone", label: t("ci.fill.structStandalone") },
                  ]}
                />
                <NumberField label={t("ci.fill.ciAmt")} hint={t("ci.fill.ciAmtHint")} {...num("ciAmt")} />
                <NumberField
                  label={t("ci.fill.earlyPct")}
                  hint={t("ci.fill.earlyPctHint")}
                  {...num("earlyPct")}
                />
                <SelectField
                  label={t("ci.fill.booster")}
                  value={String(Number(form.booster) || 0)}
                  onChange={(v) => set("booster", v)}
                  options={CI_BOOSTER_OPTIONS.map((b) => ({ value: String(b), label: `${b}%` }))}
                />
                <SelectField
                  label={t("ci.fill.recovery")}
                  value={Number(form.recovery) > 0 ? "10000" : "0"}
                  onChange={(v) => set("recovery", v)}
                  options={[
                    { value: "0", label: t("ci.fill.recoveryNone") },
                    { value: "10000", label: "RM10,000" },
                  ]}
                />
                <SelectField
                  label={t("ci.fill.reduces")}
                  value={form.reduces}
                  onChange={(v) => set("reduces", v)}
                  options={[
                    { value: "no", label: t("ci.fill.no") },
                    { value: "yes", label: t("ci.fill.yes") },
                    { value: "unsure", label: t("ci.fill.unsure") },
                  ]}
                />
                <NumberField
                  label={t("ci.fill.base")}
                  hint={t("ci.fill.baseHint")}
                  {...num("base")}
                />
                <NumberField label={t("ci.fill.afford")} hint={t("ci.fill.affordHint")} {...num("afford")} />
              </div>
            </div>
          </Accordion>

          <TextAreaField
            label={t("ci.fill.notes")}
            value={notes}
            onChange={setNotes}
            placeholder={t("ci.fill.notesPlaceholder")}
            hint={t("ci.fill.notesHint")}
          />
        </form>

        <aside aria-label={t("ci.fill.dashLabel")} className="flex min-w-0 flex-col gap-4">
          <SceneFrame
            caption={<span className="font-semibold text-navy tabular-nums">{result.caption}</span>}
            legend={<SceneLegend items={result.legend} />}
          >
            <CiRunwayScene scene={scene} months={out.months} />
          </SceneFrame>

          <ScenarioFlow slides={result.flow} />

          <ResultCard
            heading={t("ci.fill.resultHeading")}
            big={out.text.gapEarly}
            context={t("ci.fill.resultContext")}
          >
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px]">
                <caption className="sr-only">{t("ci.fill.tableCaption")}</caption>
                <thead>
                  <tr className="text-white/70">
                    <th scope="col" className="py-1 pr-2 font-medium"><span className="sr-only">{t("ci.fill.tMeasure")}</span></th>
                    <th scope="col" className="py-1 pr-2 text-right font-medium">{t("ci.stage.early")}</th>
                    <th scope="col" className="py-1 text-right font-medium">{t("ci.stage.late")}</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  <tr className="border-t border-white/15"><th scope="row" className="py-1.5 pr-2 font-normal text-white/80">{t("ci.fill.tReceived")}</th><td className="py-1.5 pr-2 text-right font-bold">{rm(out.ciEarly)}</td><td className="py-1.5 text-right font-bold">{rm(out.ciLate)}</td></tr>
                  <tr className="border-t border-white/15"><th scope="row" className="py-1.5 pr-2 font-normal text-white/80">{t("ci.fill.tSources")}</th><td className="py-1.5 pr-2 text-right font-bold">{out.text.srcEarly}</td><td className="py-1.5 text-right font-bold">{out.text.srcLate}</td></tr>
                  <tr className="border-t border-white/15"><th scope="row" className="py-1.5 pr-2 font-normal text-white/80">{t("ci.fill.tGap")}</th><td className="py-1.5 pr-2 text-right font-bold text-[#ffb4a8]">{out.text.gapEarly}</td><td className="py-1.5 text-right font-bold text-[#ffb4a8]">{out.text.gapLate}</td></tr>
                  <tr className="border-t border-white/15"><th scope="row" className="py-1.5 pr-2 font-normal text-white/80">{t("ci.fill.tRunway")}</th><td className="py-1.5 pr-2 text-right font-bold">{out.text.runEarly}</td><td className="py-1.5 text-right font-bold">{out.text.runLate}</td></tr>
                </tbody>
              </table>
            </div>
          </ResultCard>

          {out.reduceNote ? <Note>{out.reduceNote}</Note> : null}
          <Note>{t("ci.fill.suggest", { amount: out.text.suggest, note: out.affordNote })}</Note>

          <section className={CARD}>
            <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">{t("ci.fill.totalTitle")}</h3>
            <dl className="m-0 mt-3 flex flex-col gap-2 text-sm">
              {[
                [t("ci.fill.monthlyNeed"), t("ci.fill.monthlyNeedValue", { amount: out.text.monthly })],
                [t("ci.fill.recoveryPeriod", { months: out.months }), out.text.recovery],
                [t("ci.fill.extra"), out.text.extra],
                [t("ci.fill.cgLoss"), out.text.cgLoss],
                [t("ci.fill.contribDuring"), out.text.contribTotal],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-ink">{k}</dt>
                  <dd className="m-0 font-bold tabular-nums text-navy">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-sand pt-2">
                <dt className="font-bold text-navy">{t("ci.fill.totalTitle")}</dt>
                <dd className="m-0 font-extrabold tabular-nums text-navy">{out.text.total}</dd>
              </div>
            </dl>
          </section>

          <Accordion title={t("ci.fill.calcTitle")} defaultOpen={false}>
            <ul className="m-0 list-disc pl-5 leading-7">
              <li>{t("ci.fill.calc1")}</li>
              <li>{t("ci.fill.calc2")}</li>
              <li>{t("ci.fill.calc3")}</li>
              <li>{t("ci.fill.calc4")}</li>
              <li>{t("ci.fill.calc5")}</li>
            </ul>
          </Accordion>
        </aside>
      </div>

      <div className="flex flex-col gap-3 border-t border-sand pt-4">
        <SaveButton
          savedAt={step.savedAt}
          pending={step.pending}
          onSave={() => step.save({ ...inputs, story: form.story, commitChecked: form.commitChecked }, notes)}
          error={step.error}
          disabled={step.blocked}
        />
        <CopyToWa text={waText} label={t("common.copySummary")} />
      </div>
    </div>
  );
}

function rm(n: number): string {
  return "RM" + Math.round(n).toLocaleString("en-MY");
}
