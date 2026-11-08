"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { computeModule } from "@/lib/storyboard/engine";
import { formToInputs, toForm, type HibahForm, type HibahNumKey } from "@/lib/storyboard/hibah-form";
import { buildHibahWaSummary } from "@/lib/storyboard/wa-summary";
import { saveStoryboard } from "@/app/(app)/leads/[id]/storyboard/actions";
import { STORYBOARD_MISSING_MESSAGE } from "@/lib/storyboard/schema-error";
import { Accordion } from "../accordion";
import { CopyToWa } from "../copy-to-wa";
import { SaveButton } from "../save-button";
import { SceneFrame } from "../scene-frame";
import { ScenarioFlow } from "../scenario-flow";
import { HibahShield, TONE_SWATCH } from "./hibah-shield";
import { CARD, NumberField, Note, SelectField, TextField } from "./fields";
import type { HibahScreenProps } from "./types";

const COVER_OPTIONS = [
  { value: "unsure" as const, label: "Not sure, need to check" },
  { value: "covered" as const, label: "Yes, fully covered" },
  { value: "partial" as const, label: "Partly covered" },
  { value: "no" as const, label: "Not covered" },
];

export function HibahFill(props: HibahScreenProps) {
  const router = useRouter();
  const [form, setForm] = useState<HibahForm>(() => toForm(props.stored));
  const [notes, setNotes] = useState(props.notes);
  const [savedAt, setSavedAt] = useState<string | null>(props.savedAt);
  const [error, setError] = useState<string | null>(props.dbReady ? null : STORYBOARD_MISSING_MESSAGE);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof HibahForm>(key: K, value: HibahForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const num = (key: HibahNumKey) => ({ value: form[key], onChange: (v: string) => set(key, v) });

  // Recomputed on every change. This is a preview: the server recomputes on save.
  const inputs = useMemo(() => formToInputs(form), [form]);
  const result = useMemo(() => computeModule("hibah", inputs), [inputs]);
  const { out, scene } = result;
  const nick = form.nick.trim() || "the prospect";
  const tpd = form.scenario === "tpd";

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveStoryboard({ leadId: props.leadId, module: "hibah", step: "fill", inputs, notes });
        if (res.error) {
          setError(res.error);
          return;
        }
        setSavedAt(res.savedAt);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  const waText = buildHibahWaSummary({
    nick: form.nick,
    out,
    planName: props.settings.planName,
    agentFirstName: props.agentFirstName,
  });

  const need = out.need > 0 ? out.need : 1;
  const bar = (v: number) => ({ width: `${((v / need) * 100).toFixed(2)}%` });
  const maxY = Math.max(1, ...out.yearly);
  const bars = out.yearly.slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-green">Calculate around the prospect&apos;s life</p>
        <h2 className="m-0 text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
          How much hibah takaful does {nick} <span className="text-info-blue-text">really need?</span>
        </h2>
        <p className="m-0 max-w-[680px] text-[13px] leading-relaxed text-ink">
          If income stopped yesterday, today&apos;s bills and family needs keep running. Fill in the prospect&apos;s figures to see
          what is already in place and what still needs planning. All amounts in RM; leave 0 if none.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <form aria-label="Hibah needs inputs" onSubmit={(e) => e.preventDefault()} className="flex min-w-0 flex-col gap-3.5">
          <Accordion title="1. Family situation">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <TextField label="Nickname (not full name)" value={form.nick} onChange={(v) => set("nick", v)} />
              <NumberField label="Age" {...num("age")} />
              <SelectField
                label="If this happened yesterday…"
                value={form.scenario}
                onChange={(v) => set("scenario", v)}
                options={[
                  { value: "death", label: "I passed away" },
                  { value: "tpd", label: "I became totally & permanently disabled (TPD)" },
                ]}
              />
              <NumberField label="Net monthly income (RM)" hint="Salary or average income after statutory deductions." {...num("income")} />
              <NumberField label="Years of family support" hint="5 years is only a starting point. Adjust freely." {...num("years")} />
              <NumberField
                label="Cost of living increase / year (%)"
                hint="0% = no inflation. A scenario, not a forecast."
                decimal
                negative
                {...num("inflation")}
              />
            </div>
            <div className="mt-3.5">
              <Note>
                {tpd
                  ? "TPD scenario: income stops but the insured still needs to be supported, often with extra care costs. Check whether the plan includes TPD and how it is defined."
                  : "Death scenario: calculates provision for the family. Conditional hibah nomination relates to the death benefit."}
              </Note>
            </div>
          </Accordion>

          <Accordion title="2. How much does the family need each month?">
            <div className="flex flex-col gap-3.5">
              <p className="m-0 text-[13px] text-ink">
                Default: replace 80% of net income from section 1. Switch method to list family expenses one by one.
              </p>
              <SelectField
                label="How to estimate the monthly need"
                value={form.method}
                onChange={(v) => set("method", v)}
                options={[
                  { value: "replace", label: "Replace part of my income" },
                  { value: "itemize", label: "List family expenses one by one" },
                ]}
              />
              {form.method === "replace" ? (
                <div className="max-w-xs">
                  <NumberField
                    label="Share of income to replace (%)"
                    hint="Exclude debt instalments settled in section 3. Example: 70% of RM5,000 = RM3,500 a month."
                    {...num("replace")}
                  />
                </div>
              ) : (
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <NumberField label="Food & groceries" {...num("eFood")} />
                  <NumberField label="Utilities, phone & internet" {...num("eUtil")} />
                  <NumberField label="School fees & childcare" {...num("eSchool")} />
                  <NumberField label="Transport" {...num("eTrans")} />
                  <NumberField label="Rent / housing (if no home loan)" {...num("eRent")} />
                  <NumberField label="Others (parents, zakat, misc)" {...num("eOther")} />
                </div>
              )}
              <div className="max-w-xs">
                <NumberField
                  label="Other ongoing monthly support (RM)"
                  hint="Only amounts that will truly continue, e.g. spouse's contribution."
                  {...num("other")}
                />
              </div>
              <Note>
                {form.method === "itemize"
                  ? `Itemised family expenses: ${formatRm(out.itemTotal)}/month.`
                  : `Income replacement basis: ${formatRm(out.base)}/month.`}{" "}
                After other support, monthly need: {out.text.monthly}/month.
              </Note>
            </div>
          </Accordion>

          <Accordion title="3. Debts to settle">
            <div className="flex flex-col gap-3.5">
              <p className="m-0 text-[13px] text-ink">
                Check the cover for the chosen scenario. If unsure, the whole balance counts as uncovered for this estimate.
              </p>
              <h4 className="m-0 text-base font-bold text-navy">Is the home loan covered?</h4>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <NumberField label="Home loan balance (RM)" {...num("home")} />
                <SelectField label="Loan cover (MRTT / MLTT)" value={form.homeCov} onChange={(v) => set("homeCov", v)} options={COVER_OPTIONS} />
                {form.homeCov === "partial" ? <NumberField label="Amount covered (RM)" {...num("homePart")} /> : null}
              </div>
              <hr className="m-0 border-0 border-t border-dashed border-sand-2" />
              <h4 className="m-0 text-base font-bold text-navy">Is the car loan covered?</h4>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <NumberField label="Car loan balance (RM)" {...num("car")} />
                <SelectField label="Loan cover" value={form.carCov} onChange={(v) => set("carCov", v)} options={COVER_OPTIONS} />
                {form.carCov === "partial" ? <NumberField label="Amount covered (RM)" {...num("carPart")} /> : null}
              </div>
              <hr className="m-0 border-0 border-t border-dashed border-sand-2" />
              <div className="max-w-xs">
                <NumberField
                  label="Other uncovered debts (RM)"
                  hint="Personal loan, credit card, instalment purchases, business liabilities."
                  {...num("otherDebt")}
                />
              </div>
            </div>
          </Accordion>

          <Accordion title="4. One-off costs & future funds">
            <div className="flex flex-col gap-3.5">
              <p className="m-0 text-[13px] text-ink">Children&apos;s education fund, emergency fund and other one-off costs.</p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <NumberField label="Additional education fund (RM)" hint="Future fund, excluding monthly fees already counted." {...num("edu")} />
                <NumberField
                  label="Transition / emergency fund (RM)"
                  hint="Moving costs or urgent needs. Don't repeat monthly expenses."
                  {...num("emergency")}
                />
                <NumberField
                  label={tpd ? "Home modification / care setup (RM)" : "Funeral & admin costs (RM)"}
                  hint="Net of any confirmed assistance."
                  {...num("funeral")}
                />
              </div>
            </div>
          </Accordion>

          <Accordion title="5. What's already in place?">
            <div className="flex flex-col gap-3.5">
              <p className="m-0 text-[13px] text-ink">Existing savings and takaful benefits are deducted from the gap.</p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <NumberField label="Usable savings (RM)" hint="Not funds already set aside for another purpose." {...num("savings")} />
                <NumberField
                  label={tpd ? "Existing TPD benefit (RM)" : "Existing death benefit (RM)"}
                  hint="After the portion already used for debts above."
                  {...num("existing")}
                />
              </div>
            </div>
          </Accordion>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sb-notes" className="text-[13px] font-semibold text-navy">
              Conversation notes
            </label>
            <textarea
              id="sb-notes"
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 3 children, wife is a homemaker"
              className="rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-sm text-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
            />
            <span className="text-xs text-muted-2">Agent-only. Never shown to the client. Please don&apos;t enter IC numbers or medical details.</span>
          </div>
        </form>

        <aside aria-label="Protection gap dashboard" className="flex min-w-0 flex-col gap-4">
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

          <section className="rounded-[20px] bg-navy p-5 text-cream shadow-card" aria-label="Result">
            <div className="text-[15px] text-white/80">Estimated additional protection gap</div>
            <div className="mt-1 text-[40px] font-bold leading-[1.1] tracking-tight text-gold tabular-nums">{out.text.gap}</div>
            <div className="mt-1 text-[13px] text-white/70">
              Need {out.text.need} minus {out.text.have} already in place.
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <svg role="img" aria-label={`${out.pct} percent of need already available`} width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="34" fill="none" stroke="#24406a" strokeWidth="10" />
                <circle
                  cx="48" cy="48" r="34" fill="none" stroke="#fac748" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray="213.6" strokeDashoffset={scene.ringOffset.toFixed(1)} transform="rotate(-90 48 48)"
                />
                <text x="48" y="48" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fdf9f3">{out.pct}%</text>
                <text x="48" y="64" textAnchor="middle" fontSize="10" fill="#c9d2e0">available</text>
              </svg>
              <dl className="m-0 flex min-w-[180px] flex-1 flex-col gap-1.5">
                {[
                  ["Need", out.text.need, ""],
                  ["Have", out.text.have, ""],
                  ["Gap", out.text.gap, "text-[#ffb4a8]"],
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
            <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">Breakdown of need</h3>
            <div aria-hidden="true" className="mt-3 flex h-3.5 overflow-hidden rounded-full bg-sand">
              <div className="bg-info-blue-text" style={bar(out.support)} />
              <div className="bg-[#e3a823]" style={bar(out.debts)} />
              <div className="bg-green" style={bar(out.oneoff)} />
            </div>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0 text-sm">
              {[
                ["Family support", out.text.support, "bg-info-blue-text"],
                ["Uncovered debts", out.text.debts, "bg-[#e3a823]"],
                ["One-off costs", out.text.oneoff, "bg-green"],
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
            <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">Family support each year</h3>
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
                <span key={i} className="flex-1 text-center text-xs text-muted-2">Y{i + 1}</span>
              ))}
            </div>
            <p className="m-0 mt-2 text-xs text-muted-2">
              Year 1 {out.text.y1} · final year {out.text.yN}
            </p>
          </section>

          <Accordion title="How we calculate & assumptions" defaultOpen={false}>
            <ul className="m-0 list-disc pl-5 leading-7">
              <li>Monthly need = income × share replaced (or the itemised total) − other ongoing support.</li>
              <li>Family support = monthly need × 12, grown each year by the cost-of-living rate, summed over the years chosen.</li>
              <li>Debts count in full when cover is &quot;not sure&quot; or &quot;not covered&quot;; partly covered debts subtract the amount covered.</li>
              <li>Have = usable savings + existing benefit for the chosen scenario.</li>
              <li>Gap = need − have. An estimate for discussion, not a quotation.</li>
            </ul>
          </Accordion>
        </aside>
      </div>

      <div className="flex flex-col gap-3 border-t border-sand pt-4">
        <SaveButton savedAt={savedAt} pending={pending} onSave={save} error={error} disabled={!props.dbReady} />
        <CopyToWa text={waText} label="Copy summary for WhatsApp" />
      </div>
    </div>
  );
}

function formatRm(n: number): string {
  return "RM" + Math.round(n).toLocaleString("en-MY");
}
