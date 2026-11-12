"use client";

import { useMemo } from "react";
import { computeModule } from "@/lib/storyboard/engine";
import { rmWhole } from "@/lib/storyboard/engine/money";
import { buildHibahWaSummary } from "@/lib/storyboard/wa-summary";
import { Accordion } from "../accordion";
import { CopyToWa } from "../copy-to-wa";
import { useT } from "../lang-context";
import { SaveButton } from "../save-button";
import { ScriptPanel } from "../script-panel";
import { SituationPicker } from "../situation-picker";
import { hibahSituations, SituationScene } from "./hibah-situations";
import { useStepSave } from "./use-step-save";
import type { HibahScreenProps } from "./types";

export function HibahExplain(props: HibahScreenProps) {
  const { t, lang } = useT();
  const { settings, stored } = props;
  const result = useMemo(() => computeModule("hibah", stored, lang), [stored, lang]);
  const { out } = result;
  const step = useStepSave(props, "explain");

  const tokens = {
    name: stored.nick.trim() || t("common.prospect"),
    need: out.text.need,
    have: out.text.have,
    gap: out.text.gap,
    base: rmWhole(settings.base),
  };

  const waText = buildHibahWaSummary({ nick: stored.nick, out, planName: settings.planName, agentFirstName: props.agentFirstName, lang });
  const maxMult = Math.max(1, ...settings.mults);

  return (
    <div className="flex flex-col gap-5">
      <SituationPicker
        situations={hibahSituations(t, out, stored.home)}
        render={(i) => <SituationScene index={i} out={out} home={stored.home} />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <ScriptPanel module="hibah" settings={settings} tokens={tokens} />

        <div className="flex min-w-0 flex-col gap-3.5">
          <Accordion title={t("hibah.explain.benefitsTitle")}>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              <li><strong className="block text-navy">{t("hibah.explain.b1t")}</strong>{t("hibah.explain.b1d")}</li>
              <li><strong className="block text-navy">{t("hibah.explain.b2t")}</strong>{t("hibah.explain.b2d")}</li>
              <li><strong className="block text-navy">{t("hibah.explain.b3t")}</strong>{t("hibah.explain.b3d")}</li>
            </ul>
          </Accordion>

          <Accordion title={t("hibah.explain.vsTitle")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[12px] border border-sand bg-success-bg p-3">
                <div className="font-bold text-navy">{t("hibah.explain.benefTitle")}</div>
                <div className="text-xs text-green">{t("hibah.explain.benefSub")}</div>
                <div className="mt-1.5">{t("hibah.explain.benefBody")}</div>
              </div>
              <div className="rounded-[12px] border border-sand bg-cream p-3">
                <div className="font-bold text-navy">{t("hibah.explain.execTitle")}</div>
                <div className="text-xs text-muted-2">{t("hibah.explain.execSub")}</div>
                <div className="mt-1.5">{t("hibah.explain.execBody")}</div>
              </div>
            </div>
          </Accordion>

          <Accordion title={t("hibah.explain.multsTitle", { plan: settings.planName })}>
            <div className="flex flex-col gap-2.5">
              {settings.multLabels.map((label, i) => {
                const m = settings.mults[i] ?? 0;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 text-[13px]">{label}</span>
                    <div aria-hidden="true" className="h-2 w-16 overflow-hidden rounded-full bg-sand sm:w-24">
                      <div className="h-full rounded-full bg-green" style={{ width: `${Math.round((m / maxMult) * 100)}%` }} />
                    </div>
                    <span className="w-24 text-right text-[13px] font-bold tabular-nums text-navy">
                      {m ? rmWhole(settings.base * m) : t("hibah.explain.checkPds")}
                    </span>
                  </div>
                );
              })}
              <p className="m-0 text-xs text-muted-2">{t("hibah.explain.multsNote", { base: rmWhole(settings.base) })}</p>
            </div>
          </Accordion>

          <Accordion title={t("hibah.explain.stepsTitle")}>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              <li>{t("hibah.explain.step1")}</li>
              <li>{t("hibah.explain.step2")}</li>
              <li>{t("hibah.explain.step3")}</li>
            </ol>
          </Accordion>

          <Accordion title={t("hibah.explain.infoTitle")}>
            <ul className="m-0 list-disc pl-5">
              <li>{t("hibah.explain.info1")}</li>
              <li>{t("hibah.explain.info2")}</li>
              <li>{t("hibah.explain.info3")}</li>
              <li>{t("hibah.explain.info4")}</li>
              <li>{t("hibah.explain.info5")}</li>
            </ul>
          </Accordion>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-sand pt-4">
        <SaveButton savedAt={step.savedAt} pending={step.pending} onSave={() => step.save({})} error={step.error} disabled={step.blocked} />
        <CopyToWa text={waText} label={t("common.copySummary")} />
      </div>
    </div>
  );
}
