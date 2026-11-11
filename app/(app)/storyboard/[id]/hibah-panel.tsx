"use client";

import { useState } from "react";
import { calcHibah, HIBAH_EXPENSE_KEYS, type HibahInputs, type HibahResult, type LoanCover } from "@/lib/storyboard/hibah";
import { STORYBOARD_TEXT, type Lang } from "@/lib/storyboard/i18n";
import type { StoryboardProfile } from "@/lib/storyboard/modules";
import { hibahCaption } from "@/lib/storyboard/story";
import { Group, MoneyField, NumberField, Segmented, SelectField } from "./fields";
import { BreakdownStack, GapReveal, StatTile, YearTimeline } from "./story-blocks";

type Set = (patch: Partial<HibahInputs>) => void;

export function HibahInputsForm({ inputs, set, lang }: { inputs: HibahInputs; set: Set; lang: Lang }) {
  const t = STORYBOARD_TEXT[lang].hibah;
  const coverOptions = (Object.keys(t.cover) as LoanCover[]).map((value) => ({ value, label: t.cover[value] }));
  return (
    <div className="flex flex-col gap-3">
      <Group title={t.groups.family} step={1} defaultOpen>
        <div className="sm:col-span-2">
          <Segmented
            label={t.scenario}
            value={inputs.scenario}
            onChange={(scenario) => set({ scenario })}
            options={[
              { value: "death", label: t.death },
              { value: "tpd", label: t.tpd },
            ]}
          />
        </div>
        <MoneyField label={t.netIncome} value={inputs.netIncome} onChange={(netIncome) => set({ netIncome })} />
        <NumberField label={t.supportYears} value={inputs.supportYears} min={1} max={30} onChange={(supportYears) => set({ supportYears })} />
        <NumberField label={t.inflation} value={inputs.inflationPct} max={15} suffix="%" onChange={(inflationPct) => set({ inflationPct })} />
        {inputs.scenario === "tpd" && (
          <MoneyField label={t.tpdCareCost} value={inputs.tpdCareCost} onChange={(tpdCareCost) => set({ tpdCareCost })} />
        )}
      </Group>

      <Group title={t.groups.monthly} step={2}>
        <div className="sm:col-span-2">
          <Segmented
            label={t.method}
            value={inputs.method}
            onChange={(method) => set({ method })}
            options={[
              { value: "income", label: t.methodIncome },
              { value: "itemised", label: t.methodItemised },
            ]}
          />
        </div>
        {inputs.method === "income" ? (
          <NumberField label={t.replacePct} value={inputs.replacePct} max={100} suffix="%" onChange={(replacePct) => set({ replacePct })} />
        ) : (
          HIBAH_EXPENSE_KEYS.map((k) => (
            <MoneyField
              key={k}
              label={t.expenses[k]}
              value={inputs.expenses[k]}
              onChange={(v) => set({ expenses: { ...inputs.expenses, [k]: v } })}
            />
          ))
        )}
        <MoneyField
          label={t.otherContribution}
          hint={t.otherContributionHint}
          value={inputs.otherContribution}
          onChange={(otherContribution) => set({ otherContribution })}
        />
      </Group>

      <Group title={t.groups.debts} step={3}>
        <MoneyField label={t.houseLoan} value={inputs.houseLoan} onChange={(houseLoan) => set({ houseLoan })} />
        <SelectField label={t.loanCover} value={inputs.houseCover} options={coverOptions} onChange={(houseCover) => set({ houseCover })} />
        {inputs.houseCover === "partial" && (
          <MoneyField label={t.loanCovered} value={inputs.houseCovered} onChange={(houseCovered) => set({ houseCovered })} />
        )}
        <MoneyField label={t.carLoan} value={inputs.carLoan} onChange={(carLoan) => set({ carLoan })} />
        <SelectField label={t.loanCover} value={inputs.carCover} options={coverOptions} onChange={(carCover) => set({ carCover })} />
        {inputs.carCover === "partial" && (
          <MoneyField label={t.loanCovered} value={inputs.carCovered} onChange={(carCovered) => set({ carCovered })} />
        )}
        <MoneyField label={t.otherDebt} value={inputs.otherDebt} onChange={(otherDebt) => set({ otherDebt })} />
      </Group>

      <Group title={t.groups.oneOff} step={4}>
        <MoneyField label={t.educationFund} value={inputs.educationFund} onChange={(educationFund) => set({ educationFund })} />
        <MoneyField label={t.emergencyFund} value={inputs.emergencyFund} onChange={(emergencyFund) => set({ emergencyFund })} />
        <MoneyField label={t.funeralCost} value={inputs.funeralCost} onChange={(funeralCost) => set({ funeralCost })} />
      </Group>

      <Group title={t.groups.existing} step={5}>
        <MoneyField label={t.savings} value={inputs.savings} onChange={(savings) => set({ savings })} />
        <MoneyField label={t.existingBenefit} value={inputs.existingBenefit} onChange={(existingBenefit) => set({ existingBenefit })} />
      </Group>
    </div>
  );
}

export function HibahGap({ result, profile, lang }: { result: HibahResult; profile: StoryboardProfile; lang: Lang }) {
  const t = STORYBOARD_TEXT[lang];
  return (
    <GapReveal
      need={result.need}
      have={result.have}
      gap={result.gap}
      coveredPct={result.coveredPct}
      labels={{ need: t.common.need, have: t.common.have, gap: t.common.gap, covered: t.common.covered }}
      title={lang === "bm" ? "Jurang perlindungan keluarga" : "Family protection gap"}
      caption={hibahCaption(result, profile, lang)}
    />
  );
}

export function HibahBreakdown({ result, lang }: { result: HibahResult; lang: Lang }) {
  const t = STORYBOARD_TEXT[lang].hibah;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <BreakdownStack
        title={lang === "bm" ? "Pecahan keperluan" : "What the need is made of"}
        items={[
          { label: t.breakdown.support, amount: result.support },
          { label: t.breakdown.debt, amount: result.debt },
          { label: t.breakdown.oneOff, amount: result.oneOff },
        ]}
      />
      <YearTimeline title={t.yearlyTitle} values={result.yearly} yearPrefix={lang === "bm" ? "T" : "Y"} />
    </div>
  );
}

// Analytics beside the story: the same result cut a few more ways, and one
// "what if" so the agent can show how sensitive the gap is to income.
export function HibahAnalytics({
  result,
  inputs,
  profile,
  lang,
}: {
  result: HibahResult;
  inputs: HibahInputs;
  profile: StoryboardProfile;
  lang: Lang;
}) {
  const t = STORYBOARD_TEXT[lang];
  const [incomeShift, setIncomeShift] = useState(0);
  const dependants = Math.max(1, profile.dependants || 0);
  const monthlyHave = result.monthlyBase > 0 ? result.have / result.monthlyBase : 0;
  const shifted = calcHibah({ ...inputs, netIncome: inputs.netIncome * (1 + incomeShift / 100) });
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t.analytics.coveredShare} value={result.coveredPct} format="int" suffix="%" />
        <StatTile label={t.analytics.gapPerDependant} value={result.gap / dependants} format="rm" />
        <StatTile label={t.analytics.runway} value={Math.floor(monthlyHave)} format="int" suffix={` ${t.common.months}`} />
        <StatTile label={t.analytics.monthlyToClose} value={result.monthlyBase} format="rm" />
      </div>
      {inputs.method === "income" && (
        <div className="rounded-[16px] border border-sand bg-white px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12.5px] font-bold text-navy">
              {t.analytics.sensitivity} {t.analytics.sensitivityIncome.toLowerCase()} {incomeShift > 0 ? "+" : ""}
              {incomeShift}%
            </span>
            <span className="text-[13px] font-extrabold text-navy tabular-nums">
              {t.common.gap}: RM{Math.round(shifted.gap).toLocaleString("en-MY")}
            </span>
          </div>
          <input
            type="range"
            min={-30}
            max={30}
            step={5}
            value={incomeShift}
            onChange={(e) => setIncomeShift(Number(e.target.value))}
            className="mt-2 w-full accent-[#0f2540]"
            aria-label={t.analytics.sensitivityIncome}
          />
        </div>
      )}
    </div>
  );
}
