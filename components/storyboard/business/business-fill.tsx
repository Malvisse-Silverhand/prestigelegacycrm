"use client";

import { useMemo, useState } from "react";
import { computeModule } from "@/lib/storyboard/engine";
import { rmWhole } from "@/lib/storyboard/engine/money";
import {
  businessFormToInputs,
  toBusinessForm,
  type BusinessForm,
  type BusinessNumKey,
  type KeyPersonForm,
  type PartnerForm,
} from "@/lib/storyboard/business-form";
import { BUSINESS_ENTITY_NOTES, BUSINESS_NEEDS, BUSINESS_ROLES, type BusinessNeed } from "@/lib/storyboard/defaults/business";
import { buildBusinessWaSummary } from "@/lib/storyboard/wa-summary";
import { Accordion } from "../accordion";
import { CopyToWa } from "../copy-to-wa";
import { SaveButton } from "../save-button";
import { SceneFrame } from "../scene-frame";
import { ScenarioFlow } from "../scenario-flow";
import { SceneLegend } from "../legend";
import { CARD, ChipGroup, Note, NumberField, SelectField, TextAreaField, TextField, Warn } from "../fields";
import { useModuleStepSave } from "../use-step-save";
import { BusinessChart3D, BUSINESS_SWATCH } from "./business-chart-3d";
import type { BusinessScreenProps } from "./types";

const MONTH_OPTIONS = [6, 12, 18, 24];
const CI_MONTH_OPTIONS = [3, 6, 12, 18];

function monthOptions(base: number[], current: string) {
  const n = Number(current);
  const all = Number.isFinite(n) && n > 0 && !base.includes(n) ? [...base, n].sort((a, b) => a - b) : base;
  return all.map((m) => ({ value: String(m), label: `${m} months` }));
}

export function BusinessFill(props: BusinessScreenProps) {
  const [form, setForm] = useState<BusinessForm>(() => toBusinessForm(props.stored));
  const [notes, setNotes] = useState(props.notes);
  const [need, setNeed] = useState<BusinessNeed>("keyman");
  const step = useModuleStepSave("business", props, "fill");

  const set = <K extends keyof BusinessForm>(key: K, value: BusinessForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const num = (key: BusinessNumKey) => ({ value: form[key], onChange: (v: string) => set(key, v) });
  const setKp = (i: number, patch: Partial<KeyPersonForm>) =>
    setForm((f) => ({ ...f, kps: f.kps.map((k, j) => (j === i ? { ...k, ...patch } : k)) }));
  const setPartner = (i: number, patch: Partial<PartnerForm>) =>
    setForm((f) => ({ ...f, partners: f.partners.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

  // Recomputed on every change. This is a preview: the server recomputes on save.
  const inputs = useMemo(() => businessFormToInputs(form), [form]);
  const result = useMemo(() => computeModule("business", inputs), [inputs]);
  const { out, scene } = result;
  const isCompany = out.isCompany;
  const company = form.company.trim() || "the business";
  const kCount = Math.max(0, Math.min(form.kps.length, Math.floor(Number(form.kCount) || 0)));
  const pCount = Math.max(0, Math.min(form.partners.length, Math.floor(Number(form.pCount) || 0)));
  const entityNote = BUSINESS_ENTITY_NOTES[form.entity];

  const waText = buildBusinessWaSummary({ company: form.company, out, agentFirstName: props.agentFirstName });
  const amounts: Record<BusinessNeed, number> = {
    keyman: out.kmTotal,
    buysell: out.bsTotal,
    loan: out.loanGap,
    enterprise: isCompany ? 0 : out.eGap,
  };

  const panel =
    need === "keyman"
      ? { title: "Total Keyman death / TPD suggested", big: out.text.kmTotal, sub: `Method: ${{ profit: "contribution to profit", salary: "salary multiple", replace: "replacement cost" }[form.kMethod]} · ${company}` }
      : need === "buysell"
        ? { title: "Total buy-sell funding needed", big: out.text.bsTotal, sub: `Business value used ${out.text.businessValue} · ${{ cross: "cross-purchase", entity: "entity-owned", own: "own life + hibah" }[form.structure]}` }
        : need === "loan"
          ? { title: "Loan protection gap", big: out.text.loanGap, sub: `Falling on the owner personally ${out.text.guar} less existing protection ${rmWhole(Number(form.lCover) || 0)}` }
          : { title: "Cash needed during transition", big: rmWhole(out.eNeed), sub: `Gap after existing cover ${out.text.eGap} · ${form.eMonths} months` };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-green">Business protection takaful</p>
        <h2 className="m-0 text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
          One death in a business, <span className="text-info-blue-text">four bills at once</span>
        </h2>
        <p className="m-0 max-w-[680px] text-[13px] leading-relaxed text-ink">
          The company loses a key person, partners need cash to buy the heirs&apos; shares, the bank wants the loan settled, and the
          owner&apos;s family loses income. Calculate each with the prospect&apos;s own numbers. All amounts in RM.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <form aria-label="Business protection inputs" onSubmit={(e) => e.preventDefault()} className="flex min-w-0 flex-col gap-3.5">
          <Accordion title="1. Business profile">
            <div className="flex flex-col gap-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <TextField label="Company / business name" hint="Appears in the summary." value={form.company} maxLength={80} onChange={(v) => set("company", v)} />
                <SelectField
                  label="Entity type"
                  hint="Check SSM: Sdn. Bhd. / PLT = separate entity. Enterprise = in the owner's name."
                  value={form.entity}
                  onChange={(v) => set("entity", v)}
                  options={[
                    { value: "sdn", label: "Sdn. Bhd. (company)" },
                    { value: "plt", label: "PLT / LLP" },
                    { value: "partner", label: "Enterprise · Partnership" },
                    { value: "sole", label: "Enterprise · Sole proprietor" },
                  ]}
                />
                <NumberField label="Annual revenue (RM)" {...num("revenue")} />
                <NumberField label="Net profit per year (RM)" hint={'Ask: "What was last year\'s net profit?"'} {...num("profit")} />
                <NumberField label="Fixed operating costs / month (RM)" hint="Salaries, rent, utilities, instalments." {...num("fixed")} />
                <NumberField label="Business cash reserve (RM)" hint="Deducted from the Keyman gap." {...num("reserve")} />
              </div>
              {entityNote ? (
                <Note>
                  <strong>{entityNote.t}:</strong> {entityNote.d}
                </Note>
              ) : null}
            </div>
          </Accordion>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-green">2. Choose the need</span>
            <div role="tablist" aria-label="Business needs" className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {BUSINESS_NEEDS.map((n) => {
                const on = need === n.key;
                return (
                  <button
                    key={n.key}
                    type="button"
                    role="tab"
                    id={`biz-tab-${n.key}`}
                    aria-selected={on}
                    aria-controls="biz-need-panel"
                    onClick={() => setNeed(n.key)}
                    className={`flex min-h-[88px] flex-col items-start gap-0.5 rounded-[14px] border px-3.5 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                      on ? "border-navy bg-navy text-cream shadow-card" : "border-sand bg-white text-navy"
                    }`}
                  >
                    <span className="text-base font-extrabold">{n.label}</span>
                    <span className={`text-xs ${on ? "text-white/80" : "text-muted-2"}`}>{n.sub}</span>
                    <span className="mt-1 text-sm font-bold tabular-nums">{amounts[n.key] > 0 ? rmWhole(amounts[n.key]) : "—"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div id="biz-need-panel" role="tabpanel" aria-labelledby={`biz-tab-${need}`} className="flex flex-col gap-3.5">
            {need === "keyman" ? (
              <>
                <p className="m-0 text-[13px] text-ink">
                  Keyman = the company protects itself from losses when a key person is gone. Money is paid to the company, not the heirs.
                  Partner share issues are calculated under Buy-sell.
                </p>
                <Accordion title="Calculation method">
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <SelectField
                      label="Recommended method"
                      hint="Profit = most accurate; salary = simplest; replacement = lowest."
                      value={form.kMethod}
                      onChange={(v) => set("kMethod", v)}
                      options={[
                        { value: "profit", label: "Contribution to profit" },
                        { value: "salary", label: "Salary multiple" },
                        { value: "replace", label: "Replacement cost" },
                      ]}
                    />
                    <NumberField label="Salary multiple (×)" hint="Used only for the salary method." decimal {...num("kMult")} />
                    <div className="sm:col-span-2">
                      <ChipGroup
                        legend="Number of key persons"
                        value={kCount}
                        onChange={(v) => set("kCount", String(v))}
                        options={[1, 2, 3].map((c) => ({ value: c, label: String(c) }))}
                      />
                    </div>
                  </div>
                </Accordion>
                {form.kps.slice(0, kCount).map((k, i) => (
                  <Accordion key={i} title={`Key person ${i + 1} · ${k.name || "unnamed"}`} defaultOpen={i === 0}>
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <TextField label="Name / label" value={k.name} onChange={(v) => setKp(i, { name: v })} />
                      <SelectField
                        label="Role"
                        value={BUSINESS_ROLES.includes(k.role) ? k.role : "Other"}
                        onChange={(v) => setKp(i, { role: v })}
                        options={BUSINESS_ROLES.map((r) => ({ value: r, label: r }))}
                      />
                      <NumberField label="Salary + allowances / year (RM)" value={k.salary} onChange={(v) => setKp(i, { salary: v })} />
                      <NumberField label="Impact on profit if gone (%)" decimal value={k.impact} onChange={(v) => setKp(i, { impact: v })} />
                      <SelectField
                        label="Months until stable again"
                        value={String(Number(k.stable) || 0)}
                        onChange={(v) => setKp(i, { stable: v })}
                        options={monthOptions(MONTH_OPTIONS, k.stable)}
                      />
                      <SelectField
                        label="If CI: expected disruption"
                        value={String(Number(k.ci) || 0)}
                        onChange={(v) => setKp(i, { ci: v })}
                        options={monthOptions(CI_MONTH_OPTIONS, k.ci)}
                      />
                      <NumberField label="Recruit / train / interim cost (RM)" value={k.cost} onChange={(v) => setKp(i, { cost: v })} />
                      <SelectField
                        label="Successor readiness"
                        value={k.succ}
                        onChange={(v) => setKp(i, { succ: v })}
                        options={[
                          { value: "ready", label: "Successor ready now" },
                          { value: "second", label: "Second-in-line, needs 1–6 months" },
                          { value: "none", label: "No suitable successor" },
                        ]}
                      />
                      <NumberField label="Existing Keyman death/TPD cover (RM)" value={k.exD} onChange={(v) => setKp(i, { exD: v })} />
                      <NumberField label="Existing Keyman CI cover (RM)" value={k.exC} onChange={(v) => setKp(i, { exC: v })} />
                    </div>
                  </Accordion>
                ))}
              </>
            ) : null}

            {need === "buysell" ? (
              <>
                <p className="m-0 text-[13px] text-ink">
                  If a partner dies, who buys their shares? Without buy-sell, the heirs inherit the shares: heirs want cash, the remaining
                  partners want control, and often nobody has the cash. Buy-sell = an agreement + takaful funding, so partners buy at an
                  agreed price and heirs receive cash.
                </p>
                <Accordion title="Business value">
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <SelectField
                      label="Valuation method"
                      value={form.valMethod}
                      onChange={(v) => set("valMethod", v)}
                      options={[
                        { value: "multiple", label: "Multiple of net profit" },
                        { value: "manual", label: "Value agreed by partners" },
                      ]}
                    />
                    {form.valMethod === "multiple" ? (
                      <NumberField label="Profit multiple (×)" decimal {...num("valMult")} />
                    ) : (
                      <NumberField label="Agreed business value (RM)" {...num("valManual")} />
                    )}
                  </div>
                  <p className="m-0 mt-3 text-[13px]">Business value used: <strong className="tabular-nums text-navy">{out.text.businessValue}</strong></p>
                </Accordion>
                <Accordion title="Partners & holdings">
                  <div className="flex flex-col gap-3.5">
                    <ChipGroup
                      legend="Number of partners"
                      value={pCount}
                      onChange={(v) => set("pCount", String(v))}
                      options={[2, 3, 4, 5].map((c) => ({ value: c, label: String(c) }))}
                    />
                    {form.partners.slice(0, pCount).map((p, i) => (
                      <fieldset key={i} className="m-0 grid gap-3 rounded-[12px] border border-sand bg-cream p-3 sm:grid-cols-2">
                        <legend className="px-1 text-[13px] font-bold text-navy">Partner {i + 1}</legend>
                        <TextField label="Name" value={p.name} onChange={(v) => setPartner(i, { name: v })} />
                        <NumberField label="Holding (%)" decimal value={p.pct} onChange={(v) => setPartner(i, { pct: v })} />
                        <NumberField label="Age" value={p.age} onChange={(v) => setPartner(i, { age: v })} />
                        <NumberField label="Existing buy-sell cover (RM)" value={p.ex} onChange={(v) => setPartner(i, { ex: v })} />
                      </fieldset>
                    ))}
                    <p role="status" aria-live="polite" className="m-0 text-[13px] font-semibold text-navy">
                      Total holding: {Math.round(out.pctTotal * 100) / 100}%
                    </p>
                    {Math.abs(out.pctTotal - 100) > 1e-9 && pCount > 0 ? (
                      <Warn>
                        The partner holdings total {Math.round(out.pctTotal * 100) / 100}%, not 100%. The figures are calculated as entered. Check the shareholding
                        before you present.
                      </Warn>
                    ) : null}
                  </div>
                </Accordion>
                <Accordion title="Structure & agreement">
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <SelectField
                      label="Funding structure"
                      hint="Cross suits 2–3 partners. Entity suits many. Own-life + hibah is common in takaful and needs an agreement."
                      value={form.structure}
                      onChange={(v) => set("structure", v)}
                      options={[
                        { value: "cross", label: "Cross-purchase: each partner covers the others" },
                        { value: "entity", label: "Entity: company covers each partner" },
                        { value: "own", label: "Own-life certificate, hibah to partners" },
                      ]}
                    />
                    <SelectField
                      label="Buy-sell / shareholder agreement"
                      hint="Without a written agreement, heirs can dispute the share price."
                      value={form.agreement}
                      onChange={(v) => set("agreement", v)}
                      options={[
                        { value: "none", label: "None" },
                        { value: "draft", label: "Verbal only" },
                        { value: "written", label: "Written agreement" },
                      ]}
                    />
                  </div>
                </Accordion>
              </>
            ) : null}

            {need === "loan" ? (
              <>
                <p className="m-0 text-[13px] text-ink">
                  Whose problem is the business debt? A director who gave a personal undertaking is personally liable. If they die, the bank
                  can claim from their estate: house, savings, family assets.
                </p>
                <Accordion title="Financing facilities">
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <NumberField label="Term loan balance (RM)" hint="Current balance, not the original amount." {...num("lTerm")} />
                    <NumberField label="Overdraft / working capital used (RM)" {...num("lOd")} />
                    <NumberField label="Hire purchase balance (RM)" hint="Lorries, vans, cars, machinery." {...num("lHp")} />
                    <NumberField label="Trade / invoice financing (RM)" {...num("lTrade")} />
                    <NumberField label="Other business debts (RM)" {...num("lOther")} />
                    <NumberField label="Total monthly instalments (RM)" {...num("lInst")} />
                  </div>
                  <p className="m-0 mt-3 text-[13px]">
                    Reserve covers instalments for <strong className="tabular-nums text-navy">{out.reserveMonths.toFixed(1)}</strong> months.
                  </p>
                </Accordion>
                <Accordion title="Personal undertaking & protection">
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <TextField label="Main person with the undertaking" value={form.guarantor} onChange={(v) => set("guarantor", v)} />
                    {isCompany ? (
                      <NumberField label="% of debt personally covered" decimal {...num("guarPct")} />
                    ) : (
                      <Note>For an enterprise, all business debt is personal (100%).</Note>
                    )}
                    <NumberField
                      label="Existing loan protection (RM)"
                      hint="e.g. business MRTT/MLTT, term takaful assigned to the bank."
                      {...num("lCover")}
                    />
                  </div>
                </Accordion>
              </>
            ) : null}

            {need === "enterprise" ? (
              isCompany ? (
                <Note>
                  This entity is a company / PLT: business assets don&apos;t freeze, but the owner&apos;s shares become part of the estate.
                  See Buy-sell. The Enterprise need is only calculated for enterprises and sole proprietors.
                </Note>
              ) : (
                <>
                  <p className="m-0 text-[13px] text-ink">
                    Owner gone, business &amp; accounts frozen. For an enterprise, bank accounts, stock and assets in the owner&apos;s name
                    become part of the estate and can be frozen until letters of administration and distribution are settled, while
                    salaries, rent, suppliers and instalments keep running.
                  </p>
                  <Accordion title="Assets & debts in the owner's name">
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <NumberField label="Business bank balance (RM)" {...num("eBank")} />
                      <NumberField label="Stock, equipment & business assets (RM)" {...num("eStock")} />
                      <NumberField label="Total business debt (RM)" {...num("eDebt")} />
                      <NumberField label="Monthly instalments (RM)" {...num("eInst")} />
                    </div>
                  </Accordion>
                  <Accordion title="Transition">
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <SelectField
                        label="Plan when the owner is gone"
                        value={form.ePlan}
                        onChange={(v) => set("ePlan", v)}
                        options={[
                          { value: "continue", label: "Heirs / staff continue" },
                          { value: "sell", label: "Sell the business" },
                          { value: "close", label: "Close in an orderly way" },
                        ]}
                      />
                      <SelectField
                        label="Transition period"
                        value={String(Number(form.eMonths) || 0)}
                        onChange={(v) => set("eMonths", v)}
                        options={monthOptions([3, 6, 12], form.eMonths)}
                      />
                      <NumberField label="Operating costs / month excl. salaries (RM)" {...num("eOpex")} />
                      <NumberField label="Staff salaries / month, total (RM)" {...num("eWages")} />
                      <NumberField label="Family income from the business / month (RM)" {...num("eFamily")} />
                      <NumberField label="Existing hibah takaful / cover (RM)" {...num("eHibah")} />
                      <SelectField
                        label="Will / estate documents"
                        value={form.eWill}
                        onChange={(v) => set("eWill", v)}
                        options={[
                          { value: "none", label: "None" },
                          { value: "preparing", label: "Being prepared" },
                          { value: "in_place", label: "Will in place" },
                        ]}
                      />
                    </div>
                  </Accordion>
                </>
              )
            ) : null}
          </div>

          <TextAreaField
            label="Conversation notes"
            value={notes}
            onChange={setNotes}
            placeholder="e.g. two directors, bank review next quarter"
            hint="Agent-only. Never shown to the client. Please don't enter IC numbers or personal medical details."
          />
        </form>

        <aside aria-label="Business needs dashboard" className="flex min-w-0 flex-col gap-4">
          {result.warnings.map((w) => (
            <Warn key={w} role="alert">{w}</Warn>
          ))}
          <SceneFrame
            caption={<span className="font-semibold text-navy tabular-nums">{result.caption}</span>}
            legend={<SceneLegend items={result.legend} swatches={result.legend.map((l) => BUSINESS_SWATCH[["Keyman", "Buy-sell", "Loan", "Enterprise"].indexOf(l.label)] ?? "#0f2540")} />}
          >
            <BusinessChart3D scene={scene} />
          </SceneFrame>

          <ScenarioFlow slides={result.flow} />

          <section className="rounded-[20px] bg-navy p-5 text-cream shadow-card" aria-label={panel.title}>
            <div className="text-[15px] text-white/80">{panel.title}</div>
            <div className="mt-1 text-[40px] font-bold leading-[1.1] tracking-tight text-gold tabular-nums">{panel.big}</div>
            <div className="mt-1 text-[13px] text-white/70">{panel.sub}</div>
          </section>

          {need === "keyman" ? (
            <section className={CARD}>
              <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">Each key person · 3 methods</h3>
              <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
                {out.keymen.map((k, i) => (
                  <li key={i} className="rounded-[12px] border border-sand bg-cream p-3 text-[13px]">
                    <strong className="text-navy">{k.name || `Key person ${i + 1}`}</strong>
                    <dl className="m-0 mt-1.5 grid grid-cols-3 gap-2 text-center">
                      {[["Profit", k.profit], ["Salary ×", k.salary], ["Replace", k.replace]].map(([l, v]) => (
                        <div key={l as string}>
                          <dt className="text-xs text-muted-2">{l}</dt>
                          <dd className="m-0 font-bold tabular-nums text-navy">{rmWhole(v as number)}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="m-0 mt-1.5 text-xs">Suggested death/TPD {rmWhole(k.death)} · CI {rmWhole(k.ci)}</p>
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-3 text-[13px]">
                Keyman CI suggested: <strong className="tabular-nums text-navy">{out.text.kmCITotal}</strong> · cash reserve{" "}
                {rmWhole(Number(form.reserve) || 0)} deducted
              </p>
            </section>
          ) : null}

          {need === "buysell" ? (
            <section className={CARD}>
              <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">Share value per partner</h3>
              <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0 text-sm">
                {out.partners.map((p, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-ink">{p.name || `Partner ${i + 1}`} {p.pct}%</span>
                    <span className="font-bold tabular-nums text-navy">{rmWhole(p.share)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-left text-[13px]">
                  <caption className="mb-1 text-left text-xs font-bold uppercase tracking-wide text-muted-2">Certificate matrix</caption>
                  <thead>
                    <tr className="text-xs text-muted-2">
                      <th scope="col" className="py-1 pr-2 font-semibold">Owner</th>
                      <th scope="col" className="py-1 pr-2 font-semibold">On the life of</th>
                      <th scope="col" className="py-1 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {out.matrix.map((m, i) => (
                      <tr key={i} className="border-t border-sand">
                        <td className="py-1.5 pr-2">{m.owner}</td>
                        <td className="py-1.5 pr-2">{m.life}</td>
                        <td className="py-1.5 text-right font-bold tabular-nums">{rmWhole(m.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="m-0 mt-3 text-[13px]">
                Without buy-sell, the heirs inherit the shares and may want cash while the partners want control.
                {form.agreement !== "written" ? " To discuss: no written buy-sell agreement, so price and timing can be disputed." : ""}
              </p>
            </section>
          ) : null}

          {need === "loan" ? (
            <section className={CARD}>
              <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">Debt breakdown</h3>
              <dl className="m-0 mt-3 flex flex-col gap-1.5 text-sm">
                {[
                  ["Total business debt", out.text.debt],
                  [`Falling on the owner personally (${out.guarPct}%)`, out.text.guar],
                  ["Existing loan protection", rmWhole(Number(form.lCover) || 0)],
                  ["Reserve covers instalments", `${out.reserveMonths.toFixed(1)} months`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-ink">{k}</dt>
                    <dd className="m-0 font-bold tabular-nums text-navy">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="m-0 mt-3 text-[13px]">
                What happens to that person&apos;s family: the bank can claim from the estate before the heirs receive anything.
              </p>
            </section>
          ) : null}

          {need === "enterprise" && !isCompany ? (
            <section className={CARD}>
              <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">Frozen assets &amp; transition cash</h3>
              <dl className="m-0 mt-3 flex flex-col gap-1.5 text-sm">
                {[
                  ["Assets that may be frozen", out.text.frozen],
                  ["Cash needed during transition", out.text.eNeed],
                  ["Gap after existing cover", out.text.eGap],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-ink">{k}</dt>
                    <dd className="m-0 font-bold tabular-nums text-navy">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="m-0 mt-3 text-[13px]">
                Why hibah takaful: it can be paid directly to the named beneficiary, not through the estate, subject to a valid nomination
                and the certificate terms.
              </p>
            </section>
          ) : null}

          <section className={CARD}>
            <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">One death, all the bills</h3>
            <dl className="m-0 mt-3 flex flex-col gap-1.5 text-sm">
              {out.rows.map((r) => (
                <div key={r.key} className="flex justify-between gap-3">
                  <dt className="text-ink">{r.label}</dt>
                  <dd className="m-0 font-bold tabular-nums text-navy">{rmWhole(r.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-sand pt-2">
                <dt className="font-bold text-navy">Total</dt>
                <dd className="m-0 font-extrabold tabular-nums text-navy">{out.text.total}</dd>
              </div>
            </dl>
          </section>

          <Accordion title="How we calculate & assumptions" defaultOpen={false}>
            <ul className="m-0 list-disc pl-5 leading-7">
              <li>Keyman profit method = (net profit + fixed costs × 12) × impact % × months to stabilise ÷ 12 × successor factor + replacement cost. Factors: ready 0.5, second-in-line 0.75, none 1.0. The cash reserve is deducted once from the total.</li>
              <li>Salary multiple = annual salary × multiple. Replacement cost = recruit/train cost + salary overlap during the stabilising months.</li>
              <li>Keyman CI = impact base × CI months ÷ 12 × factor + 50% of replacement cost − existing CI cover.</li>
              <li>Buy-sell: share value = business value × holding − existing cover. Cross-purchase: survivors buy in proportion to their own holdings.</li>
              <li>Loan: amount on the owner personally = debt × % covered; gap = that amount − existing loan protection.</li>
              <li>Enterprise: cash needed = (instalments + opex + salaries + family income) × transition months; gap = cash needed − existing hibah.</li>
              <li>Planning estimates only, not a business valuation, quotation, or tax or legal advice.</li>
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
