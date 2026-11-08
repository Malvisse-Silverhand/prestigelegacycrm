"use client";

import { useMemo, useState } from "react";
import { computeModule } from "@/lib/storyboard/engine";
import { MEDICAL_RISK_GROUPS, MEDICAL_RISK_MAX } from "@/lib/storyboard/engine/medical";
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
import { MedicalGapScene } from "./medical-scenes";
import type { MedicalScreenProps } from "./types";

const LEVEL_STYLE = {
  LOW: "bg-success-bg text-green",
  MODERATE: "bg-warn-gold-bg text-warn-gold-text",
  HIGH: "bg-alert-red-bg text-alert-red",
} as const;

const SWATCH = ["#1d4f91", "#0f7a4c", "#b23a3a"];

export function MedicalFill(props: MedicalScreenProps) {
  const [form, setForm] = useState<MedicalForm>(() => toMedicalForm(props.stored));
  const [notes, setNotes] = useState(props.notes);
  const step = useModuleStepSave("medical", props, "fill");

  const set = <K extends keyof MedicalForm>(key: K, value: MedicalForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const num = (key: MedicalNumKey) => ({ value: form[key], onChange: (v: string) => set(key, v) });

  // Recomputed on every change. This is a preview: the server recomputes on save.
  const inputs = useMemo(() => medicalFormToInputs(form), [form]);
  const result = useMemo(() => computeModule("medical", inputs), [inputs]);
  const { out, scene } = result;
  const nick = form.nick.trim() || "the prospect";
  const cur = form.bills[Math.min(form.scenario, form.bills.length - 1)];
  const curIndex = Math.min(form.scenario, form.bills.length - 1);

  const setBill = (i: number, patch: Partial<MedicalForm["bills"][number]>) =>
    setForm((f) => ({ ...f, bills: f.bills.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const toggleCheck = (key: string, on: boolean) => setForm((f) => ({ ...f, checked: { ...f.checked, [key]: on } }));

  const waText = buildMedicalWaSummary({ nick: form.nick, out, agentFirstName: props.agentFirstName });
  const anySourceMissing = form.bills.some((b) => sourceMissing(b.source)) || sourceMissing(form.inflationSource);
  const curMissing = cur ? sourceMissing(cur.source) : true;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-green">Medical &amp; health takaful</p>
        <h2 className="m-0 text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
          Are company cover and savings <span className="text-info-blue-text">enough for {nick}?</span>
        </h2>
        <p className="m-0 max-w-[680px] text-[13px] leading-relaxed text-ink">
          One hospital stay can cost more than the family expects. Tick the daily-risk checklist, choose a bill scenario and enter what the
          prospect has. All amounts in RM.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <form aria-label="Medical card inputs" onSubmit={(e) => e.preventDefault()} className="flex min-w-0 flex-col gap-3.5">
          <Accordion title="1. Risk test: how high is the daily risk?">
            <div className="flex flex-col gap-4">
              <TextField label="Nickname (not full name)" value={form.nick} onChange={(v) => set("nick", v)} />
              <p className="m-0 text-[13px] text-ink">
                Tick everything that applies. An awareness tool, not financial or medical advice.
              </p>
              {MEDICAL_RISK_GROUPS.map((g) => {
                const n = g.items.filter((_, i) => form.checked[g.key + i]).length;
                return (
                  <fieldset key={g.key} className="m-0 flex flex-col gap-2 border-0 p-0">
                    <legend className="mb-1 flex w-full items-center justify-between text-sm font-bold text-navy">
                      <span>{g.title}</span>
                      <span className="rounded-full bg-sand px-2 py-0.5 text-xs text-muted-2">{n} ticked</span>
                    </legend>
                    {g.items.map((it, i) => (
                      <CheckRow
                        key={it.label}
                        label={it.label}
                        hint={it.hint || undefined}
                        checked={Boolean(form.checked[g.key + i])}
                        onChange={(on) => toggleCheck(g.key + i, on)}
                      />
                    ))}
                  </fieldset>
                );
              })}
              <div className={`rounded-[16px] px-5 py-4 ${LEVEL_STYLE[out.level]}`} role="status" aria-live="polite">
                <div className="text-xs font-bold uppercase tracking-wide">Daily risk level</div>
                <div className="text-3xl font-extrabold leading-tight tracking-tight">{out.level}</div>
                <div className="text-[13px]">
                  Score {out.score} / {MEDICAL_RISK_MAX}.{" "}
                  {out.topFactors.length > 0 ? `Main reasons: ${out.topFactors.join("; ")}.` : "Nothing ticked yet."}
                </div>
              </div>
            </div>
          </Accordion>

          <Accordion title="2. What the prospect has">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <SelectField
                label="Work status"
                value={form.work}
                onChange={(v) => set("work", v)}
                options={[
                  { value: "employed", label: "Employed (has company panel)" },
                  { value: "self", label: "Self-employed / gig" },
                  { value: "none", label: "Not working" },
                ]}
              />
              <NumberField
                label="Remaining company medical benefit (RM)"
                hint={form.work === "employed" ? "Annual limit still available." : "Counted as 0 when not employed."}
                {...num("company")}
              />
              <NumberField label="Cash savings willing to use (RM)" hint="For hospital only." {...num("savings")} />
            </div>
          </Accordion>

          <Accordion title="3. Private hospital bill scenario">
            <div className="flex flex-col gap-3.5">
              <Warn role="status">
                Bill amounts and the medical inflation rate below are editable placeholders, not facts. Enter figures from a verified
                source (a hospital estimate or a published figure) and write the source in the box before showing a client.
              </Warn>
              <div role="radiogroup" aria-label="Bill scenario" className="grid gap-2 sm:grid-cols-2">
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
                      <span className="text-[13px] font-semibold">{b.label}</span>
                      <span className="text-sm font-bold tabular-nums">RM{Math.round(Number(b.amount) || 0).toLocaleString("en-MY")}</span>
                      {missing ? <span className={`text-[11px] ${on ? "text-gold" : "text-warn-gold-text"}`}>source needed</span> : null}
                    </button>
                  );
                })}
              </div>
              {cur ? (
                <div className="grid gap-3.5 rounded-[12px] border border-sand bg-cream p-3 sm:grid-cols-2">
                  <TextField label="Scenario name" value={cur.label} maxLength={60} onChange={(v) => setBill(curIndex, { label: v })} />
                  <NumberField label="Amount (RM)" value={cur.amount} onChange={(v) => setBill(curIndex, { amount: v })} />
                  <div className="sm:col-span-2">
                    <TextField
                      label="Source of this figure"
                      hint={curMissing ? "Required before showing a client: who or what published this amount, and when." : "Shown in the WhatsApp summary."}
                      value={cur.source}
                      maxLength={200}
                      onChange={(v) => setBill(curIndex, { source: v })}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </Accordion>

          <Accordion title="4. If they save it themselves">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <NumberField label="Saving per month (RM)" {...num("monthlySave")} />
              <NumberField
                label="Compare: own medical card / month (RM)"
                hint="Use the figure from the official illustration or quotation."
                {...num("cardCost")}
              />
              <NumberField
                label="Medical inflation / year (%)"
                hint="A placeholder scenario, not a forecast."
                decimal
                negative
                {...num("inflation")}
              />
              <TextField
                label="Source of the inflation rate"
                hint={sourceMissing(form.inflationSource) ? "Required before showing a client." : undefined}
                value={form.inflationSource}
                maxLength={200}
                onChange={(v) => set("inflationSource", v)}
              />
            </div>
          </Accordion>

          <TextAreaField
            label="Conversation notes"
            value={notes}
            onChange={setNotes}
            placeholder="e.g. rides a motorbike daily, wife is a homemaker"
            hint="Agent-only. Never shown to the client. Please don't enter IC numbers or medical details."
          />
        </form>

        <aside aria-label="Gap dashboard" className="flex min-w-0 flex-col gap-4">
          {anySourceMissing ? (
            <Warn role="status">Some bill or inflation figures have no source yet. Fill them in before presenting or copying the summary.</Warn>
          ) : null}
          <SceneFrame
            caption={<span className="font-semibold text-navy tabular-nums">{result.caption}</span>}
            legend={<SceneLegend items={result.legend} swatches={SWATCH} />}
          >
            <MedicalGapScene scene={scene} out={out} />
          </SceneFrame>

          <ScenarioFlow slides={result.flow} />

          <ResultCard
            heading="Gap paid out of pocket"
            big={out.text.gap}
            context={out.text.explain}
            rows={[
              { label: "Company cover", value: out.text.company },
              { label: "Savings", value: out.text.savings },
              { label: "Gap", value: out.text.gap, tone: "bad" },
            ]}
          />

          <section className={CARD}>
            <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">What else to know</h3>
            <dl className="m-0 mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink">Same bill in 5 years ({out.inflation}% / yr, placeholder)</dt>
                <dd className="m-0 font-bold tabular-nums text-navy">{out.text.future}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink">Saving {out.text.monthlySave}/month to cover the gap</dt>
                <dd className="m-0 font-bold tabular-nums text-navy">{out.text.years}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink">Own medical card about {out.text.card}/month</dt>
                <dd className="m-0 font-bold tabular-nums text-navy">{out.text.cardYear}/yr</dd>
              </div>
            </dl>
          </section>

          <Note>An estimate for one scenario, for discussion. It is not a quotation.</Note>

          <Accordion title="How we calculate & assumptions" defaultOpen={false}>
            <ul className="m-0 list-disc pl-5 leading-7">
              <li>Gap = bill scenario − remaining company cover − savings willing to use (minimum 0).</li>
              <li>Company cover is 0 when self-employed or not working.</li>
              <li>Future bill = bill × (1 + medical inflation)^5, at the placeholder rate you entered.</li>
              <li>Years to save = gap ÷ (monthly saving × 12), without returns.</li>
              <li>Bill amounts are placeholders for discussion until you enter a sourced figure. They are not quotations.</li>
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
        <CopyToWa text={waText} label="Copy summary for WhatsApp" />
      </div>
    </div>
  );
}
