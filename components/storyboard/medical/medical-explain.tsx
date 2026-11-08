"use client";

import { useMemo, useState } from "react";
import { computeModule } from "@/lib/storyboard/engine";
import { rmWhole } from "@/lib/storyboard/engine/money";
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
import { MEDICAL_SITUATIONS, MedicalSituation } from "./medical-scenes";
import type { MedicalScreenProps } from "./types";

export function MedicalExplain(props: MedicalScreenProps) {
  const { settings, stored } = props;
  const result = useMemo(() => computeModule("medical", stored), [stored]);
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
    name: stored.nick.trim() || "the prospect",
    level: out.level,
    reason: out.topFactors.length > 0 ? out.topFactors.join(", ") : "the factors we ticked",
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

  const waText = buildMedicalWaSummary({ nick: stored.nick, out, agentFirstName: props.agentFirstName });

  return (
    <div className="flex flex-col gap-5">
      <SituationPicker
        situations={MEDICAL_SITUATIONS}
        render={(i) => <MedicalSituation index={i} out={out} inflation={out.inflation} />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <ScriptPanel module="medical" settings={settings} tokens={tokens} />

          <section aria-labelledby="story-h" className={CARD}>
            <h2 id="story-h" className="m-0 text-lg font-bold text-navy">Your claim story</h2>
            <p className="m-0 mt-1 text-[13px] text-ink">
              Agent-only. Use only a real claim you handled, with the client&apos;s consent and no names or hospital details that identify
              them. Past claims don&apos;t guarantee future ones. This is never copied to the client summary or the WhatsApp text.
            </p>
            <div className="mt-3 flex flex-col gap-3.5">
              <TextAreaField label="Story" value={story} onChange={setStory} rows={4} maxLength={1500} placeholder="[Your claim story]" />
              <div className="grid gap-3.5 sm:grid-cols-2">
                <NumberField label="Takaful paid (RM)" value={paid} onChange={setPaid} />
                <NumberField label="Client paid (RM)" value={client} onChange={setClient} />
              </div>
              <dl className="m-0 grid grid-cols-3 gap-2 text-center text-sm">
                {[
                  ["Takaful paid", paid ? rmWhole(paidN) : "[RM]"],
                  ["Client paid", client ? rmWhole(clientN) : "[RM]"],
                  ["Actual bill", paid || client ? rmWhole(paidN + clientN) : "[RM]"],
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
          <Accordion title="What is a medical card, really?">
            <p className="m-0">
              Panel hospitals can claim directly from the takaful operator. Contributions go into a tabarru&apos; fund, a shared fund where
              participants help one another. Paid on actual charges up to the plan limits, subject to terms and exclusions.
            </p>
            <ul className="m-0 mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
              {MEDICAL_TILES.map((t) => (
                <li key={t.t} className="rounded-[10px] border border-sand bg-cream px-3 py-2">
                  <strong className="block text-navy">{t.t}</strong>
                  <span className="text-xs">{t.d}</span>
                </li>
              ))}
            </ul>
          </Accordion>

          <Accordion title="4-step claim process">
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {MEDICAL_CLAIM_STEPS.map((c, i) => (
                <li key={c.title} className="flex items-start gap-3">
                  <span aria-hidden="true" className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gold text-[13px] font-bold text-navy">
                    {i + 1}
                  </span>
                  <span>
                    <strong className="block text-navy">{c.title}</strong>
                    {c.desc}
                  </span>
                </li>
              ))}
            </ol>
          </Accordion>

          <Accordion title="A company panel is good. But it isn't yours.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left text-[13px]">
                <caption className="sr-only">Company panel compared with an own medical card</caption>
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-muted-2">
                    <th scope="col" className="py-2 pr-2"><span className="sr-only">Topic</span></th>
                    <th scope="col" className="py-2 pr-2">Company panel</th>
                    <th scope="col" className="py-2">Own medical card</th>
                  </tr>
                </thead>
                <tbody>
                  {MEDICAL_COMPARE.map((c) => (
                    <tr key={c.k} className="border-t border-sand align-top">
                      <th scope="row" className="py-2 pr-2 font-semibold text-navy">{c.k}</th>
                      <td className="py-2 pr-2">{c.a}</td>
                      <td className="py-2">{c.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Accordion>

          <Accordion title="How much a month for peace of mind?">
            <div className="flex flex-col gap-3">
              <Warn role="status">
                Fill prices from the official illustration or quotation for this prospect&apos;s age, gender and class. Contributions can
                be revised; subject to underwriting. Leave as [RM] until you have the figure.
              </Warn>
              {MEDICAL_PLAN_ROWS.map((r, i) => (
                <TextField
                  key={r.suffix}
                  label={`Monthly for ${settings.planName} ${r.suffix}`}
                  value={prices[i]}
                  maxLength={24}
                  onChange={(v) => setPrices((p) => p.map((x, j) => (j === i ? v : x)))}
                />
              ))}
            </div>
          </Accordion>

          <Accordion title="Effect of age · same plan, same class">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <TextField label="Age now" value={ageNow} maxLength={6} onChange={setAgeNow} />
              <TextField label="Price now" value={priceNow} maxLength={24} onChange={setPriceNow} />
              <TextField label="Later age" value={ageLater} maxLength={6} onChange={setAgeLater} />
              <TextField label="Price later" value={priceLater} maxLength={24} onChange={setPriceLater} />
            </div>
            <p className="m-0 mt-3 text-[13px]">
              Age {ageNow || "?"}: {priceNow || "[RM]"} · Age {ageLater || "?"}: {priceLater || "[RM]"}. Waiting can mean paying more each
              month, and health may change in between.
            </p>
          </Accordion>

          <Accordion title="Read a quotation like an insider" defaultOpen={false}>
            <dl className="m-0 flex flex-col gap-2.5">
              {MEDICAL_GLOSSARY.map((g) => (
                <div key={g.t}>
                  <dt className="font-bold text-navy">{g.t}</dt>
                  <dd className="m-0">{g.d}</dd>
                </div>
              ))}
            </dl>
          </Accordion>

          <Accordion title="Get ready today">
            <p className="m-0">
              Declare health honestly. Hidden information can lead to a rejected claim or a cancelled certificate. If unsure, tell the
              underwriter. A free-look period applies after you receive the certificate. [Check the days and refund terms in the PDS.]
            </p>
          </Accordion>

          <Note>
            Medical inflation: use the latest published figure and name the source when you present it. Takaful operators are regulated
            by Bank Negara Malaysia.
          </Note>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-sand pt-4">
        <SaveButton savedAt={step.savedAt} pending={step.pending} onSave={save} error={step.error} disabled={step.blocked} />
        <CopyToWa text={waText} label="Copy summary for WhatsApp" />
      </div>
    </div>
  );
}
