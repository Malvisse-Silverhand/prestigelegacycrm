"use client";

import { useMemo, useState } from "react";
import { computeModule } from "@/lib/storyboard/engine";
import { rmWhole } from "@/lib/storyboard/engine/money";
import { BUSINESS_NEEDS, type BusinessNeed } from "@/lib/storyboard/defaults/business";
import { buildBusinessWaSummary } from "@/lib/storyboard/wa-summary";
import { Accordion } from "../accordion";
import { CopyToWa } from "../copy-to-wa";
import { SaveButton } from "../save-button";
import { ScriptPanel } from "../script-panel";
import { SituationPicker } from "../situation-picker";
import { Note } from "../fields";
import { useModuleStepSave } from "../use-step-save";
import { useT } from "../lang-context";
import { useBusinessSituations, BusinessSituation } from "./business-scenes";
import type { BusinessScreenProps } from "./types";

export function BusinessExplain(props: BusinessScreenProps) {
  const { settings, stored } = props;
  const { t, lang } = useT();
  const situations = useBusinessSituations();
  const result = useMemo(() => computeModule("business", stored, lang), [stored, lang]);
  const { out } = result;
  const [need, setNeed] = useState<BusinessNeed>("keyman");
  const step = useModuleStepSave("business", props, "explain");

  const indices = settings.script.flatMap((s, i) => (s.group === need ? [i] : []));
  const lead = (out.keymen[0]?.name || stored.guarantor || t("business.the.owner")).split("/")[0].trim() || t("business.the.owner");
  const tokens = {
    company: stored.company.trim() || t("business.the.business"),
    name: lead,
    keyman: out.text.kmTotal,
    buysell: out.text.bsTotal,
    loan: out.text.loanGap,
    frozen: out.text.frozen,
    cash: rmWhole(out.eNeed),
  };
  const needLabels: Record<BusinessNeed, string> = {
    keyman: t("business.need.keyman"),
    buysell: t("business.need.buysell"),
    loan: t("business.need.loan"),
    enterprise: t("business.need.enterprise"),
  };
  const needLabel = needLabels[need];
  const waText = buildBusinessWaSummary({ company: stored.company, out, agentFirstName: props.agentFirstName, lang });
  const ownerTable = [
    { need: needLabels.keyman, owner: t("business.explain.ownKeyman"), money: t("business.explain.moneyKeyman") },
    { need: needLabels.buysell, owner: t("business.explain.ownBuysell"), money: t("business.explain.moneyBuysell") },
    { need: needLabels.loan, owner: t("business.explain.ownLoan"), money: t("business.explain.moneyLoan") },
    { need: needLabels.enterprise, owner: t("business.explain.ownEnterprise"), money: t("business.explain.moneyEnterprise") },
  ];
  const entityNotes = [
    { k: "sdn", t: t("business.entity.sdn.t"), d: t("business.entity.sdn.d") },
    { k: "plt", t: t("business.entity.plt.t"), d: t("business.entity.plt.d") },
    { k: "partner", t: t("business.entity.partner.t"), d: t("business.entity.partner.d") },
    { k: "sole", t: t("business.entity.sole.t"), d: t("business.entity.sole.d") },
  ];
  const taxPoints = [
    { t: t("business.explain.tax1t"), d: t("business.explain.tax1d") },
    { t: t("business.explain.tax2t"), d: t("business.explain.tax2d") },
    { t: t("business.explain.tax3t"), d: t("business.explain.tax3d") },
  ];

  return (
    <div className="flex flex-col gap-5">
      <SituationPicker
        situations={situations}
        label={t("business.explain.situation")}
        render={(i) => <BusinessSituation index={i} out={out} />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <div role="tablist" aria-label={t("business.explain.scriptAria")} className="flex flex-wrap gap-2">
            {BUSINESS_NEEDS.map((n) => (
              <button
                key={n.key}
                type="button"
                role="tab"
                id={`biz-script-tab-${n.key}`}
                aria-selected={need === n.key}
                aria-controls="biz-script-panel"
                onClick={() => setNeed(n.key)}
                className={`min-h-11 rounded-full border px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  need === n.key ? "border-navy bg-navy text-cream" : "border-sand-2 bg-white text-navy"
                }`}
              >
                {needLabels[n.key]}
              </button>
            ))}
          </div>
          <div id="biz-script-panel" role="tabpanel" aria-labelledby={`biz-script-tab-${need}`}>
            <ScriptPanel
              module="business"
              settings={settings}
              tokens={tokens}
              indices={indices}
              heading={t("business.explain.scriptHeading", { need: needLabel })}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          <Accordion title={t("business.explain.ownerTitle")}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] border-collapse text-left text-[13px]">
                <caption className="sr-only">{t("business.explain.ownerCaption")}</caption>
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-muted-2">
                    <th scope="col" className="py-2 pr-2">{t("business.explain.colNeed")}</th>
                    <th scope="col" className="py-2 pr-2">{t("business.explain.colOwner")}</th>
                    <th scope="col" className="py-2">{t("business.explain.colMoney")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerTable.map((r) => (
                    <tr key={r.need} className="border-t border-sand align-top">
                      <th scope="row" className="py-2 pr-2 font-semibold text-navy">{r.need}</th>
                      <td className="py-2 pr-2">{r.owner}</td>
                      <td className="py-2">{r.money}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Accordion>

          <Accordion title={t("business.explain.entityTitle")}>
            <dl className="m-0 flex flex-col gap-3">
              {entityNotes.map((e) => (
                <div key={e.k} className={e.k === stored.entity ? "rounded-[10px] bg-cream px-3 py-2" : "px-3 py-2"}>
                  <dt className="font-bold text-navy">
                    {e.t}
                    {e.k === stored.entity ? <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-[11px] text-navy">{t("business.explain.thisBusiness")}</span> : null}
                  </dt>
                  <dd className="m-0">{e.d}</dd>
                </div>
              ))}
            </dl>
          </Accordion>

          <Accordion title={t("business.explain.planTitle")}>
            <p className="m-0">{t("business.explain.planNote")}</p>
          </Accordion>

          <Accordion title={t("business.explain.taxTitle")} defaultOpen={false}>
            <dl className="m-0 flex flex-col gap-2.5">
              {taxPoints.map((p) => (
                <div key={p.t}>
                  <dt className="font-bold text-navy">{p.t}</dt>
                  <dd className="m-0">{p.d}</dd>
                </div>
              ))}
            </dl>
          </Accordion>

          <Note>{t("business.explain.note")}</Note>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-sand pt-4">
        <SaveButton savedAt={step.savedAt} pending={step.pending} onSave={() => step.save({})} error={step.error} disabled={step.blocked} />
        <CopyToWa text={waText} label={t("common.copySummary")} />
      </div>
    </div>
  );
}
