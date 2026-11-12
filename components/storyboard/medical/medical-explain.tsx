"use client";

import { useMemo, useState } from "react";
import { computeModule } from "@/lib/storyboard/engine";
import { rmWhole } from "@/lib/storyboard/engine/money";
import type { TKey } from "@/lib/storyboard/i18n";
import {
  MEDICAL_CLAIM_STEPS,
  MEDICAL_COMPARE,
  MEDICAL_GLOSSARY,
  MEDICAL_PLAN_ROWS,
  MEDICAL_TILES,
} from "@/lib/storyboard/defaults/medical";
import { buildMedicalWaSummary } from "@/lib/storyboard/wa-summary";
import { parseNumber } from "@/lib/storyboard/hibah-form";
import { Accordion } from "../accordion";
import { CopyToWa } from "../copy-to-wa";
import { SaveButton } from "../save-button";
import { ScriptPanel } from "../script-panel";
import { SituationPicker } from "../situation-picker";
import { CARD, Note, NumberField, TextAreaField, TextField, Warn } from "../fields";
import { useModuleStepSave } from "../use-step-save";
import { useT } from "../lang-context";
import { medicalSituations, MedicalSituation } from "./medical-scenes";
import type { MedicalScreenProps } from "./types";

export function MedicalExplain(props: MedicalScreenProps) {
  const { settings, stored } = props;
  const { t, lang } = useT();
  const result = useMemo(() => computeModule("medical", stored, lang), [stored, lang]);
  const { out } = result;
  const step = useModuleStepSave("medical", props, "explain");

  const [story, setStory] = useState(stored.story);
  const [paid, setPaid] = useState(stored.storyPaid ? String(stored.storyPaid) : "");
  const [client, setClient] = useState(stored.storyClient ? String(stored.storyClient) : "");
  const [prices, setPrices] = useState<string[]>(() => Array.from({ length: 4 }, (_, i) => stored.prices[i] ?? "[RM]"));
  const [ageNow, setAgeNow] = useState(stored.ageNow);
  const [priceNow, setPriceNow] = useState(stored.priceNow);
  const [ageLater, setAgeLater] = useState(stored.ageLater);
  const [priceLater, setPriceLater] = useState(stored.priceLater);

  const paidN = parseNumber(paid);
  const clientN = parseNumber(client);

  const tokens = {
    name: stored.nick.trim() || t("common.prospect"),
    level: t(("medical.level." + out.level) as TKey),
    reason: out.topFactors.length > 0 ? out.topFactors.join(", ") : t("medical.explain.reasonFallback"),
    scenario: out.billLabel,
    bill: out.text.bill,
    company: out.text.company,
    gap: out.text.gap,
  };

  function save() {
    step.save({
      story,
      storyPaid: paidN,
      storyClient: clientN,
      prices,
      ageNow,
      priceNow,
      ageLater,
      priceLater,
    });
  }

  const waText = buildMedicalWaSummary({ nick: stored.nick, out, agentFirstName: props.agentFirstName, lang });

  return (
    <div className="flex flex-col gap-5">
      <SituationPicker
        situations={medicalSituations(t)}
        render={(i) => <MedicalSituation index={i} out={out} inflation={out.inflation} />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <ScriptPanel module="medical" settings={settings} tokens={tokens} />

          <section aria-labelledby="story-h" className={CARD}>
            <h2 id="story-h" className="m-0 text-lg font-bold text-navy">{t("medical.explain.storyTitle")}</h2>
            <p className="m-0 mt-1 text-[13px] text-ink">
              {t("medical.explain.storyHelp")}
            </p>
            <div className="mt-3 flex flex-col gap-3.5">
              <TextAreaField label={t("medical.explain.story")} value={story} onChange={setStory} rows={4} maxLength={1500} placeholder={t("medical.explain.story.placeholder")} />
              <div className="grid gap-3.5 sm:grid-cols-2">
                <NumberField label={t("medical.explain.paidIn")} value={paid} onChange={setPaid} />
                <NumberField label={t("medical.explain.clientIn")} value={client} onChange={setClient} />
              </div>
              <dl className="m-0 grid grid-cols-3 gap-2 text-center text-sm">
                {[
                  [t("medical.explain.paid"), paid ? rmWhole(paidN) : "[RM]"],
                  [t("medical.explain.client"), client ? rmWhole(clientN) : "[RM]"],
                  [t("medical.explain.actual"), paid || client ? rmWhole(paidN + clientN) : "[RM]"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[10px] bg-cream px-2 py-2">
                    <dt className="text-xs text-muted-2">{k}</dt>
                    <dd className="m-0 font-bold tabular-nums text-navy">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          <Accordion title={t("medical.explain.whatTitle")}>
            <p className="m-0">
              {t("medical.explain.whatBody")}
            </p>
            <ul className="m-0 mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
              {MEDICAL_TILES.map((tile, i) => (
                <li key={tile.t} className="rounded-[10px] border border-sand bg-cream px-3 py-2">
                  <strong className="block text-navy">{t(("medical.tile." + i + ".t") as TKey)}</strong>
                  <span className="text-xs">{t(("medical.tile." + i + ".d") as TKey)}</span>
                </li>
              ))}
            </ul>
          </Accordion>

          <Accordion title={t("medical.explain.stepsTitle")}>
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {MEDICAL_CLAIM_STEPS.map((c, i) => (
                <li key={c.title} className="flex items-start gap-3">
                  <span aria-hidden="true" className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gold text-[13px] font-bold text-navy">
                    {i + 1}
                  </span>
                  <span>
                    <strong className="block text-navy">{t(("medical.claim." + i + ".title") as TKey)}</strong>
                    {t(("medical.claim." + i + ".desc") as TKey)}
                  </span>
                </li>
              ))}
            </ol>
          </Accordion>

          <Accordion title={t("medical.explain.panelTitle")}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left text-[13px]">
                <caption className="sr-only">{t("medical.explain.compareCaption")}</caption>
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-muted-2">
                    <th scope="col" className="py-2 pr-2"><span className="sr-only">{t("medical.explain.colTopic")}</span></th>
                    <th scope="col" className="py-2 pr-2">{t("medical.explain.colPanel")}</th>
                    <th scope="col" className="py-2">{t("medical.explain.colOwn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {MEDICAL_COMPARE.map((c, i) => (
                    <tr key={c.k} className="border-t border-sand align-top">
                      <th scope="row" className="py-2 pr-2 font-semibold text-navy">{t(("medical.compare." + i + ".k") as TKey)}</th>
                      <td className="py-2 pr-2">{t(("medical.compare." + i + ".a") as TKey)}</td>
                      <td className="py-2">{t(("medical.compare." + i + ".b") as TKey)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Accordion>

          <Accordion title={t("medical.explain.priceTitle")}>
            <div className="flex flex-col gap-3">
              <Warn role="status">
                {t("medical.explain.priceWarn")}
              </Warn>
              {MEDICAL_PLAN_ROWS.map((r, i) => (
                <TextField
                  key={r.suffix}
                  label={t("medical.explain.priceLabel", { plan: settings.planName, suffix: t(("medical.planRow." + i) as TKey) })}
                  value={prices[i]}
                  maxLength={24}
                  onChange={(v) => setPrices((p) => p.map((x, j) => (j === i ? v : x)))}
                />
              ))}
            </div>
          </Accordion>

          <Accordion title={t("medical.explain.ageTitle")}>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <TextField label={t("medical.explain.ageNow")} value={ageNow} maxLength={6} onChange={setAgeNow} />
              <TextField label={t("medical.explain.priceNow")} value={priceNow} maxLength={24} onChange={setPriceNow} />
              <TextField label={t("medical.explain.ageLater")} value={ageLater} maxLength={6} onChange={setAgeLater} />
              <TextField label={t("medical.explain.priceLater")} value={priceLater} maxLength={24} onChange={setPriceLater} />
            </div>
            <p className="m-0 mt-3 text-[13px]">
              {t("medical.explain.ageLine", { ageNow: ageNow || "?", priceNow: priceNow || "[RM]", ageLater: ageLater || "?", priceLater: priceLater || "[RM]" })}
            </p>
          </Accordion>

          <Accordion title={t("medical.explain.glossTitle")} defaultOpen={false}>
            <dl className="m-0 flex flex-col gap-2.5">
              {MEDICAL_GLOSSARY.map((g, i) => (
                <div key={g.t}>
                  <dt className="font-bold text-navy">{t(("medical.gloss." + i + ".t") as TKey)}</dt>
                  <dd className="m-0">{t(("medical.gloss." + i + ".d") as TKey)}</dd>
                </div>
              ))}
            </dl>
          </Accordion>

          <Accordion title={t("medical.explain.readyTitle")}>
            <p className="m-0">
              {t("medical.explain.readyBody")}
            </p>
          </Accordion>

          <Note>
            {t("medical.explain.inflationNote")}
          </Note>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-sand pt-4">
        <SaveButton savedAt={step.savedAt} pending={step.pending} onSave={save} error={step.error} disabled={step.blocked} />
        <CopyToWa text={waText} label={t("common.copySummary")} />
      </div>
    </div>
  );
}
