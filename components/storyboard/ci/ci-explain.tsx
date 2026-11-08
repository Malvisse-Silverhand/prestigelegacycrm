"use client";

import { useMemo, useState } from "react";
import { computeModule } from "@/lib/storyboard/engine";
import { rmWhole } from "@/lib/storyboard/engine/money";
import type { CiProofRow } from "@/lib/storyboard/defaults/ci";
import { buildCiWaSummary } from "@/lib/storyboard/wa-summary";
import { Accordion } from "../accordion";
import { CopyToWa } from "../copy-to-wa";
import { useT } from "../lang-context";
import { SaveButton } from "../save-button";
import { ScriptPanel } from "../script-panel";
import { SituationPicker } from "../situation-picker";
import { Note, TextField, Warn } from "../fields";
import { useModuleStepSave } from "../use-step-save";
import { CiSituation } from "./ci-scenes";
import { ciApproaches, ciCertChecks, ciCycle, ciIllnesses, ciSituations, ciStatPlaceholders } from "./ci-text";
import type { CiScreenProps } from "./types";

const EMPTY_PROOF: CiProofRow = { t: "", v: "", d: "" };

export function CiExplain(props: CiScreenProps) {
  const { t, lang } = useT();
  const { settings, stored } = props;
  const result = useMemo(() => computeModule("ci", stored, lang), [stored, lang]);
  const { out } = result;
  const step = useModuleStepSave("ci", props, "explain");

  const [proofs, setProofs] = useState<CiProofRow[]>(() =>
    Array.from({ length: 2 }, (_, i) => stored.proofs[i] ?? EMPTY_PROOF),
  );
  const [names, setNames] = useState<string[]>(() => Array.from({ length: 3 }, (_, i) => stored.approachNames[i] ?? ""));
  const approaches = ciApproaches(t);
  const cycle = ciCycle(t);

  const tokens = {
    name: stored.nick.trim() || t("common.prospect"),
    commits: String(stored.commitChecked.length),
    dep: String(out.depScore),
    recEarly: rmWhole(out.ciEarly),
    gapEarly: out.text.gapEarly,
    recLate: rmWhole(out.ciLate),
    gapLate: out.text.gapLate,
    runEarly: out.text.runEarly,
    runLate: out.text.runLate,
  };

  function save() {
    step.save({
      proofs: proofs.filter((p) => p.t || p.v || p.d),
      // An empty name shows the default in the current language, so it follows the language switch.
      approachNames: names,
    });
  }

  const setProof = (i: number, patch: Partial<CiProofRow>) =>
    setProofs((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const waText = buildCiWaSummary({ nick: stored.nick, out, agentFirstName: props.agentFirstName, lang });

  return (
    <div className="flex flex-col gap-5">
      <SituationPicker situations={ciSituations(t)} render={(i) => <CiSituation index={i} out={out} />} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <ScriptPanel module="ci" settings={settings} tokens={tokens} statPlaceholders={ciStatPlaceholders(t)} />
          <Note>{t("ci.explain.statNote")}</Note>

          <Accordion title={t("ci.explain.proofTitle")}>
            <div className="flex flex-col gap-4">
              <p className="m-0 text-[13px]">{t("ci.explain.proofIntro")}</p>
              {proofs.map((p, i) => (
                <div key={i} className="grid gap-3 rounded-[12px] border border-sand bg-cream p-3 sm:grid-cols-3">
                  <TextField label={t("ci.explain.proofTitleField")} value={p.t} maxLength={60} onChange={(v) => setProof(i, { t: v })} />
                  <TextField label={t("ci.explain.proofAmount")} value={p.v} maxLength={30} onChange={(v) => setProof(i, { v })} />
                  <TextField label={t("ci.explain.proofDetail")} value={p.d} maxLength={120} onChange={(v) => setProof(i, { d: v })} />
                </div>
              ))}
            </div>
          </Accordion>
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          <Accordion title={t("ci.explain.cycleTitle")}>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {cycle.map((c, i) => (
                <li key={c.t} className="flex items-start gap-3">
                  <span aria-hidden="true" className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gold text-[13px] font-bold text-navy">{i + 1}</span>
                  <span>
                    <strong className="block text-navy">{c.t}</strong>
                    {c.d}
                  </span>
                </li>
              ))}
            </ol>
          </Accordion>

          <Accordion title={t("ci.explain.approachesTitle")}>
            <div className="flex flex-col gap-4">
              <Warn role="status">{t("ci.explain.geOnly")}</Warn>
              {approaches.map((a, i) => (
                <div key={a.tag} className="rounded-[12px] border border-sand p-3">
                  <span className="inline-block rounded-full bg-navy px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-cream">{a.tag}</span>
                  <div className="mt-2">
                    <TextField
                      label={t("ci.explain.planName")}
                      value={names[i] || a.defaultName}
                      maxLength={60}
                      onChange={(v) => setNames((n) => n.map((x, j) => (j === i ? v : x)))}
                    />
                  </div>
                  <ul className="m-0 mt-2 list-disc pl-5 leading-6">
                    {a.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <p className="m-0 mt-2 text-xs text-muted-2">{a.line}</p>
                </div>
              ))}
            </div>
          </Accordion>

          <Accordion title={t("ci.explain.illTitle")} defaultOpen={false}>
            <ul className="m-0 grid list-none grid-cols-1 gap-x-4 gap-y-1 p-0 sm:grid-cols-2">
              {ciIllnesses(t).map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
            <p className="m-0 mt-3 text-xs text-muted-2">{t("ci.explain.illNote")}</p>
          </Accordion>

          <Accordion title={t("ci.explain.certTitle")}>
            <ul className="m-0 list-disc pl-5 leading-7">
              {ciCertChecks(t).map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="m-0 mt-3 text-xs text-muted-2">{t("ci.explain.certExample")}</p>
          </Accordion>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-sand pt-4">
        <SaveButton savedAt={step.savedAt} pending={step.pending} onSave={save} error={step.error} disabled={step.blocked} />
        <CopyToWa text={waText} label={t("common.copySummary")} />
      </div>
    </div>
  );
}
