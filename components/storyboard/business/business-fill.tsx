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
import { BUSINESS_NEEDS, BUSINESS_ROLES, type BusinessNeed } from "@/lib/storyboard/defaults/business";
import type { TKey } from "@/lib/storyboard/i18n";
import { buildBusinessWaSummary } from "@/lib/storyboard/wa-summary";
import { Accordion } from "../accordion";
import { CopyToWa } from "../copy-to-wa";
import { SaveButton } from "../save-button";
import { SceneFrame } from "../scene-frame";
import { ScenarioFlow } from "../scenario-flow";
import { SceneLegend } from "../legend";
import { CARD, ChipGroup, Note, NumberField, SelectField, TextAreaField, TextField, Warn } from "../fields";
import { useModuleStepSave } from "../use-step-save";
import { useT } from "../lang-context";
import { BusinessChart3D, BUSINESS_SWATCH } from "./business-chart-3d";
import type { BusinessScreenProps } from "./types";

const MONTH_OPTIONS = [6, 12, 18, 24];
const CI_MONTH_OPTIONS = [3, 6, 12, 18];

function monthOptions(base: number[], current: string, label: (m: number) => string) {
  const n = Number(current);
  const all = Number.isFinite(n) && n > 0 && !base.includes(n) ? [...base, n].sort((a, b) => a - b) : base;
  return all.map((m) => ({ value: String(m), label: label(m) }));
}

/** Role values are stored in English; only the label is translated. */
const ROLE_KEYS: Record<string, TKey> = {
  "Owner / Founder": "business.role.owner",
  "CEO / Managing Director": "business.role.ceo",
  Director: "business.role.director",
  "Top Sales / BD": "business.role.sales",
  "Technical Specialist": "business.role.tech",
  "Operations Head": "business.role.ops",
  "Finance / Key Signatory": "business.role.finance",
  Other: "business.role.other",
};

/** Renders a translated sentence with one {placeholder} shown in bold, e.g. "...for {months} months." */
function WithStrong({ text, value }: { text: string; value: string }) {
  const [a, b] = text.split("\u0000");
  return (
    <>
      {a}
      <strong className="tabular-nums text-navy">{value}</strong>
      {b}
    </>
  );
}

export function BusinessFill(props: BusinessScreenProps) {
  const { t, lang } = useT();
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
  const result = useMemo(() => computeModule("business", inputs, lang), [inputs, lang]);
  const { out, scene } = result;
  const isCompany = out.isCompany;
  const company = form.company.trim() || t("business.the.business");
  const kCount = Math.max(0, Math.min(form.kps.length, Math.floor(Number(form.kCount) || 0)));
  const pCount = Math.max(0, Math.min(form.partners.length, Math.floor(Number(form.pCount) || 0)));
  const entityNote = (
    {
      sdn: { t: t("business.entity.sdn.t"), d: t("business.entity.sdn.d") },
      plt: { t: t("business.entity.plt.t"), d: t("business.entity.plt.d") },
      partner: { t: t("business.entity.partner.t"), d: t("business.entity.partner.d") },
      sole: { t: t("business.entity.sole.t"), d: t("business.entity.sole.d") },
    } as Record<string, { t: string; d: string }>
  )[form.entity];
  const monthLabel = (m: number) => t("business.months", { m });
  const needText: Record<BusinessNeed, { label: string; sub: string }> = {
    keyman: { label: t("business.need.keyman"), sub: t("business.need.keymanSub") },
    buysell: { label: t("business.need.buysell"), sub: t("business.need.buysellSub") },
    loan: { label: t("business.need.loan"), sub: t("business.need.loanSub") },
    enterprise: { label: t("business.need.enterprise"), sub: t("business.need.enterpriseSub") },
  };

  const waText = buildBusinessWaSummary({ company: form.company, out, agentFirstName: props.agentFirstName, lang });
  const legendOrder = [t("business.legend.keyman"), t("business.legend.buysell"), t("business.legend.loan"), t("business.legend.enterprise")];
  const amounts: Record<BusinessNeed, number> = {
    keyman: out.kmTotal,
    buysell: out.bsTotal,
    loan: out.loanGap,
    enterprise: isCompany ? 0 : out.eGap,
  };

  const panel =
    need === "keyman"
      ? {
          title: t("business.fill.panelKeyman"),
          big: out.text.kmTotal,
          sub: t("business.fill.panelKeymanSub", {
            method: { profit: t("business.fill.mProfit"), salary: t("business.fill.mSalary"), replace: t("business.fill.mReplace") }[form.kMethod],
            company,
          }),
        }
      : need === "buysell"
        ? {
            title: t("business.fill.panelBuysell"),
            big: out.text.bsTotal,
            sub: t("business.fill.panelBuysellSub", {
              value: out.text.businessValue,
              structure: { cross: t("business.fill.sCross"), entity: t("business.fill.sEntity"), own: t("business.fill.sOwn") }[form.structure],
            }),
          }
        : need === "loan"
          ? { title: t("business.fill.panelLoan"), big: out.text.loanGap, sub: t("business.fill.panelLoanSub", { guar: out.text.guar, cover: rmWhole(Number(form.lCover) || 0) }) }
          : { title: t("business.fill.panelEnt"), big: rmWhole(out.eNeed), sub: t("business.fill.panelEntSub", { gap: out.text.eGap, months: monthLabel(Number(form.eMonths)) }) };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-green">{t("business.fill.eyebrow")}</p>
        <h2 className="m-0 text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
          {t("business.fill.titleA")} <span className="text-info-blue-text">{t("business.fill.titleB")}</span>
        </h2>
        <p className="m-0 max-w-[680px] text-[13px] leading-relaxed text-ink">
          {t("business.fill.lead")}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <form aria-label={t("business.fill.formAria")} onSubmit={(e) => e.preventDefault()} className="flex min-w-0 flex-col gap-3.5">
          <Accordion title={t("business.fill.s1")}>
            <div className="flex flex-col gap-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <TextField label={t("business.fill.company")} hint={t("business.fill.companyHint")} value={form.company} maxLength={80} onChange={(v) => set("company", v)} />
                <SelectField
                  label={t("business.fill.entity")}
                  hint={t("business.fill.entityHint")}
                  value={form.entity}
                  onChange={(v) => set("entity", v)}
                  options={[
                    { value: "sdn", label: t("business.fill.optSdn") },
                    { value: "plt", label: t("business.fill.optPlt") },
                    { value: "partner", label: t("business.fill.optPartner") },
                    { value: "sole", label: t("business.fill.optSole") },
                  ]}
                />
                <NumberField label={t("business.fill.revenue")} {...num("revenue")} />
                <NumberField label={t("business.fill.profit")} hint={t("business.fill.profitHint")} {...num("profit")} />
                <NumberField label={t("business.fill.fixed")} hint={t("business.fill.fixedHint")} {...num("fixed")} />
                <NumberField label={t("business.fill.reserve")} hint={t("business.fill.reserveHint")} {...num("reserve")} />
              </div>
              {entityNote ? (
                <Note>
                  <strong>{entityNote.t}:</strong> {entityNote.d}
                </Note>
              ) : null}
            </div>
          </Accordion>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-green">{t("business.fill.s2")}</span>
            <div role="tablist" aria-label={t("business.fill.needsAria")} className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
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
                    <span className="text-base font-extrabold">{needText[n.key].label}</span>
                    <span className={`text-xs ${on ? "text-white/80" : "text-muted-2"}`}>{needText[n.key].sub}</span>
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
                  {t("business.fill.keymanIntro")}
                </p>
                <Accordion title={t("business.fill.method")}>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <SelectField
                      label={t("business.fill.methodRec")}
                      hint={t("business.fill.methodHint")}
                      value={form.kMethod}
                      onChange={(v) => set("kMethod", v)}
                      options={[
                        { value: "profit", label: t("business.fill.methodProfit") },
                        { value: "salary", label: t("business.fill.methodSalary") },
                        { value: "replace", label: t("business.fill.methodReplace") },
                      ]}
                    />
                    <NumberField label={t("business.fill.salaryMult")} hint={t("business.fill.salaryMultHint")} decimal {...num("kMult")} />
                    <div className="sm:col-span-2">
                      <ChipGroup
                        legend={t("business.fill.kCount")}
                        value={kCount}
                        onChange={(v) => set("kCount", String(v))}
                        options={[1, 2, 3].map((c) => ({ value: c, label: String(c) }))}
                      />
                    </div>
                  </div>
                </Accordion>
                {form.kps.slice(0, kCount).map((k, i) => (
                  <Accordion key={i} title={t("business.fill.kpTitle", { n: i + 1, name: k.name || t("business.unnamed") })} defaultOpen={i === 0}>
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <TextField label={t("business.fill.kpName")} value={k.name} onChange={(v) => setKp(i, { name: v })} />
                      <SelectField
                        label={t("business.fill.kpRole")}
                        value={BUSINESS_ROLES.includes(k.role) ? k.role : "Other"}
                        onChange={(v) => setKp(i, { role: v })}
                        options={BUSINESS_ROLES.map((r) => ({ value: r, label: ROLE_KEYS[r] ? t(ROLE_KEYS[r]) : r }))}
                      />
                      <NumberField label={t("business.fill.kpSalary")} value={k.salary} onChange={(v) => setKp(i, { salary: v })} />
                      <NumberField label={t("business.fill.kpImpact")} decimal value={k.impact} onChange={(v) => setKp(i, { impact: v })} />
                      <SelectField
                        label={t("business.fill.kpStable")}
                        value={String(Number(k.stable) || 0)}
                        onChange={(v) => setKp(i, { stable: v })}
                        options={monthOptions(MONTH_OPTIONS, k.stable, monthLabel)}
                      />
                      <SelectField
                        label={t("business.fill.kpCi")}
                        value={String(Number(k.ci) || 0)}
                        onChange={(v) => setKp(i, { ci: v })}
                        options={monthOptions(CI_MONTH_OPTIONS, k.ci, monthLabel)}
                      />
                      <NumberField label={t("business.fill.kpCost")} value={k.cost} onChange={(v) => setKp(i, { cost: v })} />
                      <SelectField
                        label={t("business.fill.kpSucc")}
                        value={k.succ}
                        onChange={(v) => setKp(i, { succ: v })}
                        options={[
                          { value: "ready", label: t("business.fill.succReady") },
                          { value: "second", label: t("business.fill.succSecond") },
                          { value: "none", label: t("business.fill.succNone") },
                        ]}
                      />
                      <NumberField label={t("business.fill.kpExD")} value={k.exD} onChange={(v) => setKp(i, { exD: v })} />
                      <NumberField label={t("business.fill.kpExC")} value={k.exC} onChange={(v) => setKp(i, { exC: v })} />
                    </div>
                  </Accordion>
                ))}
              </>
            ) : null}

            {need === "buysell" ? (
              <>
                <p className="m-0 text-[13px] text-ink">
                  {t("business.fill.buysellIntro")}
                </p>
                <Accordion title={t("business.fill.value")}>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <SelectField
                      label={t("business.fill.valMethod")}
                      value={form.valMethod}
                      onChange={(v) => set("valMethod", v)}
                      options={[
                        { value: "multiple", label: t("business.fill.valMultiple") },
                        { value: "manual", label: t("business.fill.valManual") },
                      ]}
                    />
                    {form.valMethod === "multiple" ? (
                      <NumberField label={t("business.fill.valMult")} decimal {...num("valMult")} />
                    ) : (
                      <NumberField label={t("business.fill.valAgreed")} {...num("valManual")} />
                    )}
                  </div>
                  <p className="m-0 mt-3 text-[13px]">{t("business.fill.valueUsed")} <strong className="tabular-nums text-navy">{out.text.businessValue}</strong></p>
                </Accordion>
                <Accordion title={t("business.fill.partners")}>
                  <div className="flex flex-col gap-3.5">
                    <ChipGroup
                      legend={t("business.fill.pCount")}
                      value={pCount}
                      onChange={(v) => set("pCount", String(v))}
                      options={[2, 3, 4, 5].map((c) => ({ value: c, label: String(c) }))}
                    />
                    {form.partners.slice(0, pCount).map((p, i) => (
                      <fieldset key={i} className="m-0 grid gap-3 rounded-[12px] border border-sand bg-cream p-3 sm:grid-cols-2">
                        <legend className="px-1 text-[13px] font-bold text-navy">{t("business.fill.partnerN", { n: i + 1 })}</legend>
                        <TextField label={t("business.fill.pName")} value={p.name} onChange={(v) => setPartner(i, { name: v })} />
                        <NumberField label={t("business.fill.pPct")} decimal value={p.pct} onChange={(v) => setPartner(i, { pct: v })} />
                        <NumberField label={t("business.fill.pAge")} value={p.age} onChange={(v) => setPartner(i, { age: v })} />
                        <NumberField label={t("business.fill.pEx")} value={p.ex} onChange={(v) => setPartner(i, { ex: v })} />
                      </fieldset>
                    ))}
                    <p role="status" aria-live="polite" className="m-0 text-[13px] font-semibold text-navy">
                      {t("business.fill.pctTotal", { pct: Math.round(out.pctTotal * 100) / 100 })}
                    </p>
                    {Math.abs(out.pctTotal - 100) > 1e-9 && pCount > 0 ? (
                      <Warn>
                        {t("business.fill.pctWarn", { pct: Math.round(out.pctTotal * 100) / 100 })}
                      </Warn>
                    ) : null}
                  </div>
                </Accordion>
                <Accordion title={t("business.fill.structure")}>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <SelectField
                      label={t("business.fill.structureLabel")}
                      hint={t("business.fill.structureHint")}
                      value={form.structure}
                      onChange={(v) => set("structure", v)}
                      options={[
                        { value: "cross", label: t("business.fill.structCross") },
                        { value: "entity", label: t("business.fill.structEntity") },
                        { value: "own", label: t("business.fill.structOwn") },
                      ]}
                    />
                    <SelectField
                      label={t("business.fill.agreement")}
                      hint={t("business.fill.agreementHint")}
                      value={form.agreement}
                      onChange={(v) => set("agreement", v)}
                      options={[
                        { value: "none", label: t("business.fill.agrNone") },
                        { value: "draft", label: t("business.fill.agrDraft") },
                        { value: "written", label: t("business.fill.agrWritten") },
                      ]}
                    />
                  </div>
                </Accordion>
              </>
            ) : null}

            {need === "loan" ? (
              <>
                <p className="m-0 text-[13px] text-ink">
                  {t("business.fill.loanIntro")}
                </p>
                <Accordion title={t("business.fill.facilities")}>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <NumberField label={t("business.fill.lTerm")} hint={t("business.fill.lTermHint")} {...num("lTerm")} />
                    <NumberField label={t("business.fill.lOd")} {...num("lOd")} />
                    <NumberField label={t("business.fill.lHp")} hint={t("business.fill.lHpHint")} {...num("lHp")} />
                    <NumberField label={t("business.fill.lTrade")} {...num("lTrade")} />
                    <NumberField label={t("business.fill.lOther")} {...num("lOther")} />
                    <NumberField label={t("business.fill.lInst")} {...num("lInst")} />
                  </div>
                  <p className="m-0 mt-3 text-[13px]">
                    <WithStrong text={t("business.fill.reserveFor", { months: "\u0000" })} value={out.reserveMonths.toFixed(1)} />
                  </p>
                </Accordion>
                <Accordion title={t("business.fill.undertaking")}>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <TextField label={t("business.fill.guarantor")} value={form.guarantor} onChange={(v) => set("guarantor", v)} />
                    {isCompany ? (
                      <NumberField label={t("business.fill.guarPct")} decimal {...num("guarPct")} />
                    ) : (
                      <Note>{t("business.fill.guarNote")}</Note>
                    )}
                    <NumberField
                      label={t("business.fill.lCover")}
                      hint={t("business.fill.lCoverHint")}
                      {...num("lCover")}
                    />
                  </div>
                </Accordion>
              </>
            ) : null}

            {need === "enterprise" ? (
              isCompany ? (
                <Note>
                  {t("business.fill.entCompanyNote")}
                </Note>
              ) : (
                <>
                  <p className="m-0 text-[13px] text-ink">
                    {t("business.fill.entIntro")}
                  </p>
                  <Accordion title={t("business.fill.entAssets")}>
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <NumberField label={t("business.fill.eBank")} {...num("eBank")} />
                      <NumberField label={t("business.fill.eStock")} {...num("eStock")} />
                      <NumberField label={t("business.fill.eDebt")} {...num("eDebt")} />
                      <NumberField label={t("business.fill.eInst")} {...num("eInst")} />
                    </div>
                  </Accordion>
                  <Accordion title={t("business.fill.entTransition")}>
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <SelectField
                        label={t("business.fill.ePlan")}
                        value={form.ePlan}
                        onChange={(v) => set("ePlan", v)}
                        options={[
                          { value: "continue", label: t("business.fill.planContinue") },
                          { value: "sell", label: t("business.fill.planSell") },
                          { value: "close", label: t("business.fill.planClose") },
                        ]}
                      />
                      <SelectField
                        label={t("business.fill.eMonths")}
                        value={String(Number(form.eMonths) || 0)}
                        onChange={(v) => set("eMonths", v)}
                        options={monthOptions([3, 6, 12], form.eMonths, monthLabel)}
                      />
                      <NumberField label={t("business.fill.eOpex")} {...num("eOpex")} />
                      <NumberField label={t("business.fill.eWages")} {...num("eWages")} />
                      <NumberField label={t("business.fill.eFamily")} {...num("eFamily")} />
                      <NumberField label={t("business.fill.eHibah")} {...num("eHibah")} />
                      <SelectField
                        label={t("business.fill.eWill")}
                        value={form.eWill}
                        onChange={(v) => set("eWill", v)}
                        options={[
                          { value: "none", label: t("business.fill.willNone") },
                          { value: "preparing", label: t("business.fill.willPreparing") },
                          { value: "in_place", label: t("business.fill.willInPlace") },
                        ]}
                      />
                    </div>
                  </Accordion>
                </>
              )
            ) : null}
          </div>

          <TextAreaField
            label={t("business.fill.notes")}
            value={notes}
            onChange={setNotes}
            placeholder={t("business.fill.notesPlaceholder")}
            hint={t("business.fill.notesHint")}
          />
        </form>

        <aside aria-label={t("business.fill.dashAria")} className="flex min-w-0 flex-col gap-4">
          {result.warnings.map((w) => (
            <Warn key={w} role="alert">{w}</Warn>
          ))}
          <SceneFrame
            caption={<span className="font-semibold text-navy tabular-nums">{result.caption}</span>}
            legend={<SceneLegend items={result.legend} swatches={result.legend.map((l) => BUSINESS_SWATCH[legendOrder.indexOf(l.label)] ?? "#0f2540")} />}
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
              <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">{t("business.fill.kpCardTitle")}</h3>
              <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
                {out.keymen.map((k, i) => (
                  <li key={i} className="rounded-[12px] border border-sand bg-cream p-3 text-[13px]">
                    <strong className="text-navy">{k.name || t("business.fill.kpCardN", { n: i + 1 })}</strong>
                    <dl className="m-0 mt-1.5 grid grid-cols-3 gap-2 text-center">
                      {[[t("business.fill.kpProfit"), k.profit], [t("business.fill.kpSalaryX"), k.salary], [t("business.fill.kpReplace"), k.replace]].map(([l, v]) => (
                        <div key={l as string}>
                          <dt className="text-xs text-muted-2">{l}</dt>
                          <dd className="m-0 font-bold tabular-nums text-navy">{rmWhole(v as number)}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="m-0 mt-1.5 text-xs">{t("business.fill.kpSuggested", { death: rmWhole(k.death), ci: rmWhole(k.ci) })}</p>
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-3 text-[13px]">
                {t("business.fill.ciSuggested")} <strong className="tabular-nums text-navy">{out.text.kmCITotal}</strong>{" "}
                {t("business.fill.ciRest", { reserve: rmWhole(Number(form.reserve) || 0) })}
              </p>
            </section>
          ) : null}

          {need === "buysell" ? (
            <section className={CARD}>
              <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">{t("business.fill.shareTitle")}</h3>
              <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0 text-sm">
                {out.partners.map((p, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-ink">{p.name || t("business.fill.partnerN", { n: i + 1 })} {p.pct}%</span>
                    <span className="font-bold tabular-nums text-navy">{rmWhole(p.share)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-left text-[13px]">
                  <caption className="mb-1 text-left text-xs font-bold uppercase tracking-wide text-muted-2">{t("business.fill.matrix")}</caption>
                  <thead>
                    <tr className="text-xs text-muted-2">
                      <th scope="col" className="py-1 pr-2 font-semibold">{t("business.fill.mxOwner")}</th>
                      <th scope="col" className="py-1 pr-2 font-semibold">{t("business.fill.mxLife")}</th>
                      <th scope="col" className="py-1 text-right font-semibold">{t("business.fill.mxAmount")}</th>
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
                {t("business.fill.shareNote")}
                {form.agreement !== "written" ? " " + t("business.fill.shareNoAgreement") : ""}
              </p>
            </section>
          ) : null}

          {need === "loan" ? (
            <section className={CARD}>
              <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">{t("business.fill.debtTitle")}</h3>
              <dl className="m-0 mt-3 flex flex-col gap-1.5 text-sm">
                {[
                  [t("business.fill.debtTotal"), out.text.debt],
                  [t("business.fill.debtGuar", { pct: out.guarPct }), out.text.guar],
                  [t("business.fill.debtCover"), rmWhole(Number(form.lCover) || 0)],
                  [t("business.fill.debtReserve"), t("business.months", { m: out.reserveMonths.toFixed(1) })],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-ink">{k}</dt>
                    <dd className="m-0 font-bold tabular-nums text-navy">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="m-0 mt-3 text-[13px]">
                {t("business.fill.debtNote")}
              </p>
            </section>
          ) : null}

          {need === "enterprise" && !isCompany ? (
            <section className={CARD}>
              <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">{t("business.fill.frozenTitle")}</h3>
              <dl className="m-0 mt-3 flex flex-col gap-1.5 text-sm">
                {[
                  [t("business.fill.frozenAssets"), out.text.frozen],
                  [t("business.fill.frozenNeed"), out.text.eNeed],
                  [t("business.fill.frozenGap"), out.text.eGap],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-ink">{k}</dt>
                    <dd className="m-0 font-bold tabular-nums text-navy">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="m-0 mt-3 text-[13px]">
                {t("business.fill.frozenNote")}
              </p>
            </section>
          ) : null}

          <section className={CARD}>
            <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-2">{t("business.fill.allBills")}</h3>
            <dl className="m-0 mt-3 flex flex-col gap-1.5 text-sm">
              {out.rows.map((r) => (
                <div key={r.key} className="flex justify-between gap-3">
                  <dt className="text-ink">{r.label}</dt>
                  <dd className="m-0 font-bold tabular-nums text-navy">{rmWhole(r.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-sand pt-2">
                <dt className="font-bold text-navy">{t("business.fill.total")}</dt>
                <dd className="m-0 font-extrabold tabular-nums text-navy">{out.text.total}</dd>
              </div>
            </dl>
          </section>

          <Accordion title={t("business.fill.assump")} defaultOpen={false}>
            <ul className="m-0 list-disc pl-5 leading-7">
              <li>{t("business.fill.assump1")}</li>
              <li>{t("business.fill.assump2")}</li>
              <li>{t("business.fill.assump3")}</li>
              <li>{t("business.fill.assump4")}</li>
              <li>{t("business.fill.assump5")}</li>
              <li>{t("business.fill.assump6")}</li>
              <li>{t("business.fill.assump7")}</li>
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
