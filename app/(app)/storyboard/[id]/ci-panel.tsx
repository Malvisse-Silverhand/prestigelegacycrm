"use client";

import { CI_COMMITMENTS, CI_SITUATIONS, type CiInputs, type CiResult } from "@/lib/storyboard/ci";
import { STORYBOARD_TEXT, type Lang } from "@/lib/storyboard/i18n";
import type { StoryboardProfile } from "@/lib/storyboard/modules";
import { ciCaption } from "@/lib/storyboard/story";
import { CheckChip, Group, MoneyField, NumberField, Segmented } from "./fields";
import { BreakdownStack, GapReveal, RunwayClock, StatTile } from "./story-blocks";

type Set = (patch: Partial<CiInputs>) => void;

const PCT_PRESETS = ["50", "70", "100"] as const;
const MONTH_PRESETS = ["6", "12", "24", "36"] as const;

export function CiInputsForm({ inputs, set, lang }: { inputs: CiInputs; set: Set; lang: Lang }) {
  const t = STORYBOARD_TEXT[lang].ci;
  const toggle = <K extends string>(list: K[], key: K) => (list.includes(key) ? list.filter((x) => x !== key) : [...list, key]);
  const months = lang === "bm" ? "bulan" : "months";

  return (
    <div className="flex flex-col gap-3">
      <Group title={t.groups.commitments} step={1} defaultOpen>
        {CI_COMMITMENTS.map((k) => (
          <CheckChip
            key={k}
            checked={inputs.commitments.includes(k)}
            onChange={() => set({ commitments: toggle(inputs.commitments, k) })}
            label={t.commitments[k]}
          />
        ))}
      </Group>
      <Group title={t.groups.situations} step={2}>
        {CI_SITUATIONS.map((k) => (
          <CheckChip
            key={k}
            checked={inputs.situations.includes(k)}
            onChange={() => set({ situations: toggle(inputs.situations, k) })}
            label={t.situations[k]}
          />
        ))}
      </Group>
      <Group title={t.groups.income} step={3} defaultOpen>
        <MoneyField label={t.monthlyIncome} value={inputs.monthlyIncome} onChange={(monthlyIncome) => set({ monthlyIncome })} />
        <MoneyField
          label={t.monthlyCommitment}
          value={inputs.monthlyCommitment}
          onChange={(monthlyCommitment) => set({ monthlyCommitment })}
        />
        <div className="sm:col-span-2">
          <Segmented
            label={t.replacePct}
            value={String(inputs.replacePct)}
            onChange={(v) => set({ replacePct: Number(v) })}
            options={PCT_PRESETS.map((v) => ({ value: v, label: `${v}%` }))}
          />
        </div>
        <div className="sm:col-span-2">
          <Segmented
            label={t.recoveryMonths}
            value={String(inputs.recoveryMonths)}
            onChange={(v) => set({ recoveryMonths: Number(v) })}
            options={MONTH_PRESETS.map((v) => ({ value: v, label: `${v} ${months}` }))}
          />
        </div>
        {/* Any other figure than the presets. */}
        <NumberField label={lang === "bm" ? "Lain: peratus" : "Other: percent"} value={inputs.replacePct} max={100} suffix="%" onChange={(replacePct) => set({ replacePct })} />
        <NumberField label={lang === "bm" ? "Lain: bulan" : "Other: months"} value={inputs.recoveryMonths} min={1} max={60} onChange={(recoveryMonths) => set({ recoveryMonths })} />
      </Group>
      <Group title={t.groups.costs} step={4}>
        <MoneyField label={t.rehabCost} value={inputs.rehabCost} onChange={(rehabCost) => set({ rehabCost })} />
        <MoneyField label={t.emergencyFund} value={inputs.emergencyFund} onChange={(emergencyFund) => set({ emergencyFund })} />
      </Group>
      <Group title={t.groups.existing} step={5}>
        <MoneyField label={t.savings} value={inputs.savings} onChange={(savings) => set({ savings })} />
        <MoneyField label={t.employerCi} value={inputs.employerCi} onChange={(employerCi) => set({ employerCi })} />
        <MoneyField label={t.existingCi} value={inputs.existingCi} onChange={(existingCi) => set({ existingCi })} hint={t.cashNote} />
      </Group>
    </div>
  );
}

export function CiGap({ result, profile, lang }: { result: CiResult; profile: StoryboardProfile; lang: Lang }) {
  const t = STORYBOARD_TEXT[lang];
  return (
    <GapReveal
      need={result.need}
      have={result.have}
      gap={result.gap}
      coveredPct={result.coveredPct}
      labels={{ need: t.common.need, have: t.common.have, gap: t.common.gap, covered: t.common.covered }}
      title={t.ci.gapTitle}
      caption={ciCaption(result, profile, lang)}
    />
  );
}

export function CiBreakdown({ result, lang }: { result: CiResult; lang: Lang }) {
  const t = STORYBOARD_TEXT[lang];
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <RunwayClock
        title={t.ci.runwayTitle}
        monthsLast={result.monthsCovered}
        monthsNeeded={result.recoveryMonths}
        lastLabel={t.ci.monthsLast}
        neededLabel={t.ci.monthsNeeded}
        monthsWord={t.common.months}
      />
      <BreakdownStack
        title={lang === "bm" ? "Pecahan keperluan" : "What the need is made of"}
        items={[
          { label: t.ci.runway, amount: result.runwayNeed },
          { label: t.ci.extraCosts, amount: result.extraCosts },
        ]}
      />
    </div>
  );
}

export function CiAnalytics({ result, profile, lang }: { result: CiResult; profile: StoryboardProfile; lang: Lang }) {
  const t = STORYBOARD_TEXT[lang];
  const dependants = Math.max(1, profile.dependants || 0);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile label={t.analytics.coveredShare} value={result.coveredPct} format="int" suffix="%" />
      <StatTile label={t.ci.monthlyNeed} value={result.monthlyNeed} format="rm" />
      <StatTile label={t.analytics.runway} value={Math.floor(result.monthsCovered)} format="int" suffix={` ${t.common.months}`} />
      <StatTile label={t.analytics.gapPerDependant} value={result.gap / dependants} format="rm" />
    </div>
  );
}
