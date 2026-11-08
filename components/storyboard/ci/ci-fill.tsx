"use client";

import { useMemo, useState } from "react";
import { computeModule } from "@/lib/storyboard/engine";
import { ciFormToInputs, toCiForm, type CiForm, type CiNumKey } from "@/lib/storyboard/ci-form";
import {
  CI_BOOSTER_OPTIONS,
  CI_COMMITMENT_LABELS,
  CI_DEPENDENCY_ITEMS,
  CI_MONTH_PRESETS,
  CI_PCT_PRESETS,
} from "@/lib/storyboard/defaults/ci";
import { CI_DEPENDENCY_COUNT } from "@/lib/storyboard/engine/ci";
import { buildCiWaSummary } from "@/lib/storyboard/wa-summary";
import { Accordion } from "../accordion";
import { CopyToWa } from "../copy-to-wa";
import { SaveButton } from "../save-button";
import { SceneFrame } from "../scene-frame";
import { ScenarioFlow } from "../scenario-flow";
import { SceneLegend } from "../legend";
import { ResultCard } from "../result-card";
import { CARD, ChipGroup, CheckRow, Note, NumberField, SelectField, TextAreaField, TextField } from "../fields";
import { useModuleStepSave } from "../use-step-save";
import { CiRunwayScene } from "./ci-scenes";
import type { CiScreenProps } from "./types";

const DEP_STYLE = {
  "Low dependency so far": "bg-success-bg text-green",
  "Moderate dependency": "bg-warn-gold-bg text-warn-gold-text",
  "High dependency": "bg-alert-red-bg text-alert-red",
} as const;

export function CiFill(props: CiScreenProps) {
  const [form, setForm] = useState<CiForm>(() => toCiForm(props.stored));
  const [notes, setNotes] = useState(props.notes);
  const step = useModuleStepSave("ci", props, "fill");

  const set = <K extends keyof CiForm>(key: K, value: CiForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const num = (key: CiNumKey) => ({ value: form[key], onChange: (v: string) => set(key, v) });

  // Recomputed on every change. This is a preview: the server recomputes on save.
  const inputs = useMemo(() => ciFormToInputs(form), [form]);
  const result = useMemo(() => computeModule("ci", inputs), [inputs]);
  const { out, scene } = result;
  const nick = form.nick.trim() || "the prospect";

  const toggleCommit = (label: string, on: boolean) =>
    set("commitChecked", on ? [...form.commitChecked, label] : form.commitChecked.filter((l) => l !== label));
  const toggleDep = (i: number, on: boolean) => set("deps", { ...form.deps, [String(i)]: on });

  // The story is agent-only: it is saved with the inputs but never reaches waText or the client summary.
  const waText = buildCiWaSummary({ nick: form.nick, out, agentFirstName: props.agentFirstName });
  const pctNow = Number(form.pct);
  const monthsNow = Number(form.months);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-green">Critical illness compensation · cash while you&apos;re alive</p>
        <h2 className="m-0 text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
          How much CI cover does {nick} <span className="text-info-blue-text">really need?</span>
        </h2>
        <p className="m-0 max-w-[680px] text-[13px] leading-relaxed text-ink">
          Medical card pays the hospital. Hibah helps the family when you are gone. Critical illness gives cash while you are alive but
          tested. A cashflow stress test, not a mandatory takaful formula. All amounts in RM.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <form aria-label="Critical illness inputs" onSubmit={(e) => e.preventDefault()} className="flex min-w-0 flex-col gap-3.5">
          <Accordion title="Why CI compensation matters" defaultOpen={false}>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              <li><strong className="block text-navy">Income can stop</strong>Treatment and recovery can be long. Bills and loans don&apos;t wait.</li>
              <li><strong className="block text-navy">Costs outside the medical card</strong>Caregiver, travel to hospital, special food, follow-up care, home modification.</li>
              <li><strong className="block text-navy">Family doesn&apos;t take over the burden</strong>Cash reduces dependence on spouse, children or parents.</li>
              <li><strong className="block text-navy">Focus on recovery</strong>A financial runway means treatment and rest aren&apos;t forced by &quot;what do I pay tomorrow?&quot;</li>
            </ul>
          </Accordion>

          <Accordion title="Your story (agent-only)" defaultOpen={false}>
            <div className="flex flex-col gap-3">
              <TextAreaField
                label="Story (anonymised, with consent)"
                value={form.story}
                onChange={(v) => set("story", v)}
                rows={4}
                maxLength={2000}
                placeholder="[Your story]"
                hint="Agent-only. Empty by default. Never included in the client summary, the portal or the WhatsApp text. A story is an anecdote, not a claim document."
              />
            </div>
          </Accordion>

          <Accordion title="If income stopped yesterday, what still needs paying?">
            <div className="flex flex-col gap-2">
              <TextField label="Nickname (not full name)" value={form.nick} onChange={(v) => set("nick", v)} />
              {CI_COMMITMENT_LABELS.map((l) => (
                <CheckRow key={l} label={l} checked={form.commitChecked.includes(l)} onChange={(on) => toggleCommit(l, on)} />
              ))}
              <p role="status" aria-live="polite" className="m-0 text-[13px] font-semibold text-navy">
                {form.commitChecked.length} of {CI_COMMITMENT_LABELS.length} still need paying even when ill.
              </p>
            </div>
          </Accordion>

          <Accordion title="CI cashflow gap test: how much does the family depend on your income?">
            <div className="flex flex-col gap-2">
              {CI_DEPENDENCY_ITEMS.map((d, i) => (
                <CheckRow key={d.label} label={d.label} hint={d.hint} checked={Boolean(form.deps[String(i)])} onChange={(on) => toggleDep(i, on)} />
              ))}
              <div className={`rounded-[16px] px-5 py-4 ${DEP_STYLE[out.depLevel]}`} role="status" aria-live="polite">
                <div className="text-xs font-bold uppercase tracking-wide">Dependency on your income</div>
                <div className="text-3xl font-extrabold leading-tight tracking-tight">
                  {out.depScore} / {CI_DEPENDENCY_COUNT}
                </div>
                <div className="text-[13px]">{out.depLevel}</div>
              </div>
            </div>
          </Accordion>

          <Accordion title="1. Income & recovery period">
            <div className="flex flex-col gap-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <NumberField label="Monthly income (RM)" {...num("income")} />
                <NumberField label="Fixed family commitments / month (RM)" {...num("commit")} />
              </div>
              <ChipGroup
                legend="Share of income to replace during recovery"
                value={CI_PCT_PRESETS.includes(pctNow) ? pctNow : -1}
                onChange={(v) => v >= 0 && set("pct", String(v))}
                options={[...CI_PCT_PRESETS.map((p) => ({ value: p, label: `${p}%` })), { value: -1, label: "Other" }]}
              />
              <div className="max-w-xs">
                <NumberField label="Share of income (%)" decimal {...num("pct")} />
              </div>
              <ChipGroup
                legend="Recovery / income disruption period"
                value={CI_MONTH_PRESETS.includes(monthsNow) ? monthsNow : -1}
                onChange={(v) => v >= 0 && set("months", String(v))}
                options={[...CI_MONTH_PRESETS.map((p) => ({ value: p, label: `${p} months` })), { value: -1, label: "Other" }]}
              />
              <div className="max-w-xs">
                <NumberField label="Months" {...num("months")} />
              </div>
              <Note>
                Monthly need is the higher of income × share replaced and fixed commitments: {out.text.monthly}/month.
              </Note>
            </div>
          </Accordion>

          <Accordion title="2. Treatment & recovery costs outside the hospital bill">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <NumberField label="Recovery / rehab / caregiver costs (RM)" {...num("rehab")} />
              <NumberField label="Extra emergency / transition fund (RM)" {...num("emer")} />
              <NumberField label="Caregiver's lost income (RM / month)" hint="Spouse works less or stops to care." {...num("cg")} />
              <NumberField label="Months affected" {...num("cgMonths")} />
              <SelectField
                label="Takaful contributions during recovery"
                value={form.waiver}
                onChange={(v) => set("waiver", v)}
                options={[
                  { value: "yes", label: "Has waiver" },
                  { value: "no", label: "Must pay myself" },
                ]}
              />
              <NumberField label="Takaful contribution / month (RM)" hint="Counted only without a waiver." {...num("contrib")} />
            </div>
          </Accordion>

          <Accordion title="3. What's already in place?">
            <div className="flex flex-col gap-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <NumberField label="Savings willing to use (RM)" {...num("savings")} />
                <NumberField label="Employer / group CI benefit (RM)" {...num("employer")} />
                <SelectField
                  label="Count employer benefit as a source?"
                  hint="Group cover is tied to the job; if illness forces you to stop work, it usually goes too."
                  value={form.countEmp}
                  onChange={(v) => set("countEmp", v)}
                  options={[
                    { value: "no", label: "Don't count" },
                    { value: "yes", label: "Count" },
                  ]}
                />
                <SelectField
                  label="Existing CI plan structure"
                  value={form.structure}
                  onChange={(v) => set("structure", v)}
                  options={[
                    { value: "none", label: "None" },
                    { value: "late", label: "Lump sum, late stage only" },
                    { value: "staged", label: "Staged (early → late)" },
                    { value: "standalone", label: "Standalone CI plan" },
                  ]}
                />
                <NumberField label="Existing CI sum covered (RM)" hint="Medical card limits are not counted as cash." {...num("ciAmt")} />
                <NumberField
                  label="Early-stage payout (% of sum covered)"
                  hint="For staged / standalone plans. Check the certificate."
                  {...num("earlyPct")}
                />
                <SelectField
                  label="Accumulated booster (%)"
                  value={String(Number(form.booster) || 0)}
                  onChange={(v) => set("booster", v)}
                  options={CI_BOOSTER_OPTIONS.map((b) => ({ value: String(b), label: `${b}%` }))}
                />
                <SelectField
                  label="Extra cash benefit (recovery allowance)"
                  value={Number(form.recovery) > 0 ? "10000" : "0"}
                  onChange={(v) => set("recovery", v)}
                  options={[
                    { value: "0", label: "None" },
                    { value: "10000", label: "RM10,000" },
                  ]}
                />
                <SelectField
                  label="Does a CI payout reduce the base cover?"
                  value={form.reduces}
                  onChange={(v) => set("reduces", v)}
                  options={[
                    { value: "no", label: "No" },
                    { value: "yes", label: "Yes" },
                    { value: "unsure", label: "Not sure" },
                  ]}
                />
                <NumberField
                  label="Current base / hibah sum covered (RM)"
                  hint="Shows how much hibah is left after a CI claim."
                  {...num("base")}
                />
                <NumberField label="If the client can only afford this cover (RM)" hint="Leave 0 to skip." {...num("afford")} />
              </div>
            </div>
          </Accordion>

          <TextAreaField
            label="Conversation notes"
            value={notes}
            onChange={setNotes}
            placeholder="e.g. two children, wife works part-time"
            hint="Agent-only. Never shown to the client. Please don't enter IC numbers or medical details."
          />
        </form>

        <aside aria-label="Recovery cash dashboard" className="flex min-w-0 flex-col gap-4">
          <SceneFrame
            caption={<span className="font-semibold text-navy tabular-nums">{result.caption}</span>}
            legend={<SceneLegend items={result.legend} />}
          >
            <CiRunwayScene scene={scene} months={out.months} />
          </SceneFrame>

          <ScenarioFlow slides={result.flow} />

          <ResultCard
            heading="CI compensation gap"
            big={out.text.gapEarly}
            context="The big figure is the worst case: diagnosed at an early stage."
          >
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px]">
                <caption className="sr-only">Early stage compared with late stage</caption>
                <thead>
                  <tr className="text-white/70">
                    <th scope="col" className="py-1 pr-2 font-medium"><span className="sr-only">Measure</span></th>
                    <th scope="col" className="py-1 pr-2 text-right font-medium">Early stage</th>
                    <th scope="col" className="py-1 text-right font-medium">Late stage</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  <tr className="border-t border-white/15"><th scope="row" className="py-1.5 pr-2 font-normal text-white/80">CI received</th><td className="py-1.5 pr-2 text-right font-bold">{rm(out.ciEarly)}</td><td className="py-1.5 text-right font-bold">{rm(out.ciLate)}</td></tr>
                  <tr className="border-t border-white/15"><th scope="row" className="py-1.5 pr-2 font-normal text-white/80">Effective sources</th><td className="py-1.5 pr-2 text-right font-bold">{out.text.srcEarly}</td><td className="py-1.5 text-right font-bold">{out.text.srcLate}</td></tr>
                  <tr className="border-t border-white/15"><th scope="row" className="py-1.5 pr-2 font-normal text-white/80">Gap</th><td className="py-1.5 pr-2 text-right font-bold text-[#ffb4a8]">{out.text.gapEarly}</td><td className="py-1.5 text-right font-bold text-[#ffb4a8]">{out.text.gapLate}</td></tr>
                  <tr className="border-t border-white/15"><th scope="row" className="py-1.5 pr-2 font-normal text-white/80">Runway (months)</th><td className="py-1.5 pr-2 text-right font-bold">{out.text.runEarly}</td><td className="py-1.5 text-right font-bold">{out.text.runLate}</td></tr>
                </tbody>
              </table>
            </div>
          </ResultCard>

          {out.reduceNote ? <Note>{out.reduceNote}</Note> : null}
          <Note>
            Suggested additional CI cover: {out.text.suggest}. {out.affordNote}
          </Note>

          <section className={CARD}>
            <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">Total need</h3>
            <dl className="m-0 mt-3 flex flex-col gap-2 text-sm">
              {[
                ["Monthly need", `${out.text.monthly}/month`],
                [`Recovery period · ${out.months} months`, out.text.recovery],
                ["Extra costs", out.text.extra],
                ["Caregiver's lost income", out.text.cgLoss],
                ["Contributions during recovery", out.text.contribTotal],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-ink">{k}</dt>
                  <dd className="m-0 font-bold tabular-nums text-navy">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-sand pt-2">
                <dt className="font-bold text-navy">Total need</dt>
                <dd className="m-0 font-extrabold tabular-nums text-navy">{out.text.total}</dd>
              </div>
            </dl>
          </section>

          <Accordion title="How we calculate & assumptions" defaultOpen={false}>
            <ul className="m-0 list-disc pl-5 leading-7">
              <li>Monthly need = the higher of (income × share replaced) and fixed commitments.</li>
              <li>Total need = monthly need × months + extra costs + caregiver&apos;s lost income + contributions (if no waiver).</li>
              <li>Early stage: late-only plans pay 0; staged and standalone plans pay the early-stage percentage. Late stage pays the sum covered. Booster and recovery allowance are added.</li>
              <li>Runway = effective sources ÷ monthly need. Suggested cover = early-stage gap, rounded up to the next RM10,000.</li>
              <li>An estimate for discussion. The certificate&apos;s definitions decide when a plan pays.</li>
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
        <CopyToWa text={waText} label="Copy summary for WhatsApp" />
      </div>
    </div>
  );
}

function rm(n: number): string {
  return "RM" + Math.round(n).toLocaleString("en-MY");
}
