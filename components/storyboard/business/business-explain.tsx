"use client";

import { useMemo, useState } from "react";
import { computeModule } from "@/lib/storyboard/engine";
import { rmWhole } from "@/lib/storyboard/engine/money";
import {
  BUSINESS_ENTITY_NOTES,
  BUSINESS_NEEDS,
  BUSINESS_OWNER_TABLE,
  BUSINESS_PLAN_TYPE_NOTE,
  BUSINESS_TAX_POINTS,
  type BusinessNeed,
} from "@/lib/storyboard/defaults/business";
import { buildBusinessWaSummary } from "@/lib/storyboard/wa-summary";
import { Accordion } from "../accordion";
import { CopyToWa } from "../copy-to-wa";
import { SaveButton } from "../save-button";
import { ScriptPanel } from "../script-panel";
import { SituationPicker } from "../situation-picker";
import { Note } from "../fields";
import { useModuleStepSave } from "../use-step-save";
import { BUSINESS_SITUATIONS, BusinessSituation } from "./business-scenes";
import type { BusinessScreenProps } from "./types";

export function BusinessExplain(props: BusinessScreenProps) {
  const { settings, stored } = props;
  const result = useMemo(() => computeModule("business", stored), [stored]);
  const { out } = result;
  const [need, setNeed] = useState<BusinessNeed>("keyman");
  const step = useModuleStepSave("business", props, "explain");

  const indices = settings.script.flatMap((s, i) => (s.group === need ? [i] : []));
  const lead = (out.keymen[0]?.name || stored.guarantor || "the owner").split("/")[0].trim() || "the owner";
  const tokens = {
    company: stored.company.trim() || "the business",
    name: lead,
    keyman: out.text.kmTotal,
    buysell: out.text.bsTotal,
    loan: out.text.loanGap,
    frozen: out.text.frozen,
    cash: rmWhole(out.eNeed),
  };
  const needLabel = BUSINESS_NEEDS.find((n) => n.key === need)?.label ?? "";
  const waText = buildBusinessWaSummary({ company: stored.company, out, agentFirstName: props.agentFirstName });

  return (
    <div className="flex flex-col gap-5">
      <SituationPicker
        situations={BUSINESS_SITUATIONS}
        label="Show the situation"
        render={(i) => <BusinessSituation index={i} out={out} />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <div role="tablist" aria-label="Script for each need" className="flex flex-wrap gap-2">
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
                {n.label}
              </button>
            ))}
          </div>
          <div id="biz-script-panel" role="tabpanel" aria-labelledby={`biz-script-tab-${need}`}>
            <ScriptPanel
              module="business"
              settings={settings}
              tokens={tokens}
              indices={indices}
              heading={`Conversation script · ${needLabel}`}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          <Accordion title="Certificate owner & who receives the money">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] border-collapse text-left text-[13px]">
                <caption className="sr-only">Who owns the certificate and who receives the money, for each need</caption>
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-muted-2">
                    <th scope="col" className="py-2 pr-2">Need</th>
                    <th scope="col" className="py-2 pr-2">Certificate owner</th>
                    <th scope="col" className="py-2">Money for</th>
                  </tr>
                </thead>
                <tbody>
                  {BUSINESS_OWNER_TABLE.map((r) => (
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

          <Accordion title="Entity type & its effect">
            <dl className="m-0 flex flex-col gap-3">
              {Object.entries(BUSINESS_ENTITY_NOTES).map(([k, e]) => (
                <div key={k} className={k === stored.entity ? "rounded-[10px] bg-cream px-3 py-2" : "px-3 py-2"}>
                  <dt className="font-bold text-navy">
                    {e.t}
                    {k === stored.entity ? <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-[11px] text-navy">this business</span> : null}
                  </dt>
                  <dd className="m-0">{e.d}</dd>
                </div>
              ))}
            </dl>
          </Accordion>

          <Accordion title="Suitable plan types">
            <p className="m-0">{BUSINESS_PLAN_TYPE_NOTE}</p>
          </Accordion>

          <Accordion title="Keyman tax treatment" defaultOpen={false}>
            <dl className="m-0 flex flex-col gap-2.5">
              {BUSINESS_TAX_POINTS.map((t) => (
                <div key={t.t}>
                  <dt className="font-bold text-navy">{t.t}</dt>
                  <dd className="m-0">{t.d}</dd>
                </div>
              ))}
            </dl>
          </Accordion>

          <Note>Agent explanation aid. Not an official operator document, a business valuation, or tax or legal advice.</Note>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-sand pt-4">
        <SaveButton savedAt={step.savedAt} pending={step.pending} onSave={() => step.save({})} error={step.error} disabled={step.blocked} />
        <CopyToWa text={waText} label="Copy summary for WhatsApp" />
      </div>
    </div>
  );
}
