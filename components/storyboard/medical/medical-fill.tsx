"use client";

import { useMemo, useState } from "react";
import { computeModule } from "@/lib/storyboard/engine";
import { MEDICAL_RISK_GROUPS, MEDICAL_RISK_MAX, billLabelText, riskGroupTitle, riskItemHint, riskItemLabel } from "@/lib/storyboard/engine/medical";
import { translator, type TKey } from "@/lib/storyboard/i18n";
import {
  medicalFormToInputs,
  sourceMissing,
  toMedicalForm,
  type MedicalForm,
  type MedicalNumKey,
} from "@/lib/storyboard/medical-form";
import { buildMedicalWaSummary } from "@/lib/storyboard/wa-summary";
import { Accordion } from "../accordion";
import { CopyToWa } from "../copy-to-wa";
import { SaveButton } from "../save-button";
import { SceneFrame } from "../scene-frame";
import { ScenarioFlow } from "../scenario-flow";
import { SceneLegend } from "../legend";
import { ResultCard } from "../result-card";
import { CARD, CheckRow, Note, NumberField, SelectField, TextAreaField, TextField, Warn } from "../fields";
import { useModuleStepSave } from "../use-step-save";
import { useT } from "../lang-context";
import { MedicalGapScene } from "./medical-scenes";
import type { MedicalScreenProps } from "./types";

const LEVEL_STYLE = {
  LOW: "bg-success-bg text-green",
  MODERATE: "bg-warn-gold-bg text-warn-gold-text",
  HIGH: "bg-alert-red-bg text-alert-red",
} as const;

const SWATCH = ["#1d4f91", "#0f7a4c", "#b23a3a"];

export function MedicalFill(props: MedicalScreenProps) {
  const { t, lang } = useT();
  const tr = translator(lang);
  const [form, setForm] = useState<MedicalForm>(() => toMedicalForm(props.stored));
  const [notes, setNotes] = useState(props.notes);
  const step = useModuleStepSave("medical", props, "fill");

  const set = <K extends keyof MedicalForm>(key: K, value: MedicalForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const num = (key: MedicalNumKey) => ({ value: form[key], onChange: (v: string) => set(key, v) });

  // Recomputed on every change. This is a preview: the server recomputes on save.
  const inputs = useMemo(() => medicalFormToInputs(form), [form]);
  const result = useMemo(() => computeModule("medical", inputs, lang), [inputs, lang]);
  const { out, scene } = result;
  const nick = form.nick.trim() || t("common.prospect");
  const cur = form.bills[Math.min(form.scenario, form.bills.length - 1)];
  const curIndex = Math.min(form.scenario, form.bills.length - 1);

  const setBill = (i: number, patch: Partial<MedicalForm["bills"][number]>) =>
    setForm((f) => ({ ...f, bills: f.bills.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const toggleCheck = (key: string, on: boolean) => setForm((f) => ({ ...f, checked: { ...f.checked, [key]: on } }));

  const waText = buildMedicalWaSummary({ nick: form.nick, out, agentFirstName: props.agentFirstName, lang });
  const anySourceMissing = form.bills.some((b) => sourceMissing(b.source)) || sourceMissing(form.inflationSource);
  const curMissing = cur ? sourceMissing(cur.source) : true;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-green">{t("medical.fill.kicker")}</p>
        <h2 className="m-0 text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
          {t("medical.fill.h2a")} <span className="text-info-blue-text">{t("medical.fill.h2b", { nick })}</span>
        </h2>
        <p className="m-0 max-w-[680px] text-[13px] leading-relaxed text-ink">
          {t("medical.fill.intro")}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <form aria-label={t("medical.fill.formLabel")} onSubmit={(e) => e.preventDefault()} className="flex min-w-0 flex-col gap-3.5">
          <Accordion title={t("medical.fill.riskTitle")}>
            <div className="flex flex-col gap-4">
              <TextField label={t("medical.fill.nick")} value={form.nick} onChange={(v) => set("nick", v)} />
              <p className="m-0 text-[13px] text-ink">
                {t("medical.fill.tickHelp")}
              </p>
              {MEDICAL_RISK_GROUPS.map((g) => {
                const n = g.items.filter((_, i) => form.checked[g.key + i]).length;
                return (
                  <fieldset key={g.key} className="m-0 flex flex-col gap-2 border-0 p-0">
                    <legend className="mb-1 flex w-full items-center justify-between text-sm font-bold text-navy">
                      <span>{riskGroupTitle(g, tr)}</span>
                      <span className="rounded-full bg-sand px-2 py-0.5 text-xs text-muted-2">{t("medical.fill.nTicked", { n })}</span>
                    </legend>
                    {g.items.map((it, i) => (
                      <CheckRow
                        key={it.label}
                        label={riskItemLabel(g, i, tr)}
                        hint={riskItemHint(g, i, tr) || undefined}
                        checked={Boolean(form.checked[g.key + i])}
                        onChange={(on) => toggleCheck(g.key + i, on)}
                      />
                    ))}
                  </fieldset>
                );
              })}
              <div className={`rounded-[16px] px-5 py-4 ${LEVEL_STYLE[out.level]}`} role="status" aria-live="polite">
                <div className="text-xs font-bold uppercase tracking-wide">{t("medical.fill.levelLabel")}</div>
                <div className="text-3xl font-extrabold leading-tight tracking-tight">{t(("medical.level." + out.level) as TKey)}</div>
                <div className="text-[13px]">
                  {t("medical.fill.score", { score: out.score, max: MEDICAL_RISK_MAX })}{" "}
                  {out.topFactors.length > 0 ? t("medical.fill.reasons", { list: out.topFactors.join("; ") }) : t("medical.fill.nothingTicked")}
                </div>
              </div>
            </div>
          </Accordion>

          <Accordion title={t("medical.fill.hasTitle")}>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <SelectField
                label={t("medical.fill.work")}
                value={form.work}
                onChange={(v) => set("work", v)}
                options={[
                  { value: "employed", label: t("medical.fill.work.employed") },
                  { value: "self", label: t("medical.fill.work.self") },
                  { value: "none", label: t("medical.fill.work.none") },
                ]}
              />
              <NumberField
                label={t("medical.fill.company")}
                hint={form.work === "employed" ? t("medical.fill.company.hintOn") : t("medical.fill.company.hintOff")}
                {...num("company")}
              />
              <NumberField label={t("medical.fill.savings")} hint={t("medical.fill.savings.hint")} {...num("savings")} />
            </div>
          </Accordion>

          <Accordion title={t("medical.fill.billTitle")}>
            <div className="flex flex-col gap-3.5">
              <Warn role="status">
                {t("medical.fill.billWarn")}
              </Warn>
              <div role="radiogroup" aria-label={t("medical.fill.billScenario")} className="grid gap-2 sm:grid-cols-2">
                {form.bills.map((b, i) => {
                  const on = i === curIndex;
                  const missing = sourceMissing(b.source);
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => set("scenario", i)}
                      className={`flex min-h-14 flex-col items-start rounded-[12px] border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                        on ? "border-navy bg-navy text-cream" : "border-sand-2 bg-white text-navy hover:bg-sand-3"
                      }`}
                    >
                      <span className="text-[13px] font-semibold">{billLabelText(b.label, tr)}</span>
                      <span className="text-sm font-bold tabular-nums">RM{Math.round(Number(b.amount) || 0).toLocaleString("en-MY")}</span>
                      {missing ? <span className={`text-[11px] ${on ? "text-gold" : "text-warn-gold-text"}`}>{t("medical.fill.sourceNeeded")}</span> : null}
                    </button>
                  );
                })}
              </div>
              {cur ? (
                <div className="grid gap-3.5 rounded-[12px] border border-sand bg-cream p-3 sm:grid-cols-2">
                  <TextField label={t("medical.fill.scenarioName")} value={cur.label} maxLength={60} onChange={(v) => setBill(curIndex, { label: v })} />
                  <NumberField label={t("medical.fill.amount")} value={cur.amount} onChange={(v) => setBill(curIndex, { amount: v })} />
                  <div className="sm:col-span-2">
                    <TextField
                      label={t("medical.fill.source")}
                      hint={curMissing ? t("medical.fill.source.hintMissing") : t("medical.fill.source.hintOk")}
                      value={cur.source}
                      maxLength={200}
                      onChange={(v) => setBill(curIndex, { source: v })}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </Accordion>

          <Accordion title={t("medical.fill.saveTitle")}>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <NumberField label={t("medical.fill.monthlySave")} {...num("monthlySave")} />
              <NumberField
                label={t("medical.fill.cardCost")}
                hint={t("medical.fill.cardCost.hint")}
                {...num("cardCost")}
              />
              <NumberField
                label={t("medical.fill.inflation")}
                hint={t("medical.fill.inflation.hint")}
                decimal
                negative
                {...num("inflation")}
              />
              <TextField
                label={t("medical.fill.inflationSource")}
                hint={sourceMissing(form.inflationSource) ? t("medical.fill.inflationSource.hint") : undefined}
                value={form.inflationSource}
                maxLength={200}
                onChange={(v) => set("inflationSource", v)}
              />
            </div>
          </Accordion>

          <TextAreaField
            label={t("medical.fill.notes")}
            value={notes}
            onChange={setNotes}
            placeholder={t("medical.fill.notes.placeholder")}
            hint={t("medical.fill.notes.hint")}
          />
        </form>

        <aside aria-label={t("medical.fill.dashboard")} className="flex min-w-0 flex-col gap-4">
          {anySourceMissing ? (
            <Warn role="status">{t("medical.fill.sourceWarn")}</Warn>
          ) : null}
          <SceneFrame
            caption={<span className="font-semibold text-navy tabular-nums">{result.caption}</span>}
            legend={<SceneLegend items={result.legend} swatches={SWATCH} />}
          >
            <MedicalGapScene scene={scene} out={out} />
          </SceneFrame>

          <ScenarioFlow slides={result.flow} />

          <ResultCard
            heading={t("medical.fill.result.heading")}
            big={out.text.gap}
            context={out.text.explain}
            rows={[
              { label: t("medical.fill.result.company"), value: out.text.company },
              { label: t("medical.fill.result.savings"), value: out.text.savings },
              { label: t("medical.fill.result.gap"), value: out.text.gap, tone: "bad" },
            ]}
          />

          <section className={CARD}>
            <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">{t("medical.fill.more")}</h3>
            <dl className="m-0 mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink">{t("medical.fill.more.future", { rate: out.inflation })}</dt>
                <dd className="m-0 font-bold tabular-nums text-navy">{out.text.future}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink">{t("medical.fill.more.years", { amount: out.text.monthlySave })}</dt>
                <dd className="m-0 font-bold tabular-nums text-navy">{out.text.years}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink">{t("medical.fill.more.card", { amount: out.text.card })}</dt>
                <dd className="m-0 font-bold tabular-nums text-navy">{t("medical.perYear", { amount: out.text.cardYear })}</dd>
              </div>
            </dl>
          </section>

          <Note>{t("medical.fill.estimateNote")}</Note>

          <Accordion title={t("medical.fill.calcTitle")} defaultOpen={false}>
            <ul className="m-0 list-disc pl-5 leading-7">
              <li>{t("medical.fill.calc1")}</li>
              <li>{t("medical.fill.calc2")}</li>
              <li>{t("medical.fill.calc3")}</li>
              <li>{t("medical.fill.calc4")}</li>
              <li>{t("medical.fill.calc5")}</li>
            </ul>
          </Accordion>
        </aside>
      </div>

      <div className="flex flex-col gap-3 border-t border-sand pt-4">
        <SaveButton
          savedAt={step.savedAt}
          pending={step.pending}
          onSave={() => step.save(inputs, notes)}
          error={step.error}
          disabled={step.blocked}
        />
        <CopyToWa text={waText} label={t("common.copySummary")} />
      </div>
    </div>
  );
}
