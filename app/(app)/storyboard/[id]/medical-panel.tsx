"use client";

import {
  MEDICAL_BILL_SCENARIOS,
  MEDICAL_RISK_FACTORS,
  MEDICAL_RISK_MAX,
  type Employment,
  type MedicalInputs,
  type MedicalResult,
} from "@/lib/storyboard/medical";
import { STORYBOARD_TEXT, rm, type Lang } from "@/lib/storyboard/i18n";
import type { StoryboardProfile } from "@/lib/storyboard/modules";
import { medicalCaption } from "@/lib/storyboard/story";
import { CheckChip, Group, MoneyField, Segmented, SelectField } from "./fields";
import { BillInflation, GapReveal, RiskGauge, StatTile, WhoPays } from "./story-blocks";

type Set = (patch: Partial<MedicalInputs>) => void;
const GROUPS = ["work", "lifestyle", "travel", "health"] as const;

export function MedicalInputsForm({ inputs, set, lang }: { inputs: MedicalInputs; set: Set; lang: Lang }) {
  const t = STORYBOARD_TEXT[lang].medical;
  const toggle = (key: (typeof MEDICAL_RISK_FACTORS)[number]["key"]) =>
    set({ risks: inputs.risks.includes(key) ? inputs.risks.filter((r) => r !== key) : [...inputs.risks, key] });

  return (
    <div className="flex flex-col gap-3">
      {GROUPS.map((g, n) => (
        <Group key={g} title={t.groups[g]} step={n + 1} defaultOpen={n === 0}>
          {MEDICAL_RISK_FACTORS.filter((f) => f.group === g).map((f) => (
            <CheckChip key={f.key} checked={inputs.risks.includes(f.key)} onChange={() => toggle(f.key)} label={t.risks[f.key]} />
          ))}
        </Group>
      ))}

      <Group title={lang === "bm" ? "Apa yang prospek ada" : "What the prospect has"} step={5} defaultOpen>
        <div className="sm:col-span-2">
          <Segmented<Employment>
            label={t.employment}
            value={inputs.employment}
            onChange={(employment) => set({ employment })}
            options={(Object.keys(t.employmentOptions) as Employment[]).map((value) => ({ value, label: t.employmentOptions[value] }))}
          />
        </div>
        {inputs.employment === "salaried" && (
          <MoneyField label={t.companyCover} value={inputs.companyCover} onChange={(companyCover) => set({ companyCover })} />
        )}
        <MoneyField label={t.savings} value={inputs.savings} onChange={(savings) => set({ savings })} />
      </Group>

      <Group title={t.bill} step={6} defaultOpen>
        <div className="grid grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-2">
          {MEDICAL_BILL_SCENARIOS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => set({ billKey: s.key })}
              className={
                inputs.billKey === s.key
                  ? "flex items-center justify-between gap-2 rounded-[12px] border border-brand bg-brand px-3 py-2.5 text-left text-[12.5px] font-semibold text-white"
                  : "flex items-center justify-between gap-2 rounded-[12px] border border-sand-2 bg-white px-3 py-2.5 text-left text-[12.5px] font-medium text-ink hover:border-taupe"
              }
            >
              <span>{t.bills[s.key]}</span>
              <span className={`font-bold tabular-nums ${inputs.billKey === s.key ? "text-gold" : "text-navy"}`}>{rm(s.amount)}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title={lang === "bm" ? "Kalau simpan sendiri" : "If self-funding"} step={7}>
        <MoneyField label={t.monthlySaving} value={inputs.monthlySaving} onChange={(monthlySaving) => set({ monthlySaving })} />
        <SelectField
          label={t.ownCard}
          value={String(inputs.ownCardMonthly) as "300" | "500"}
          onChange={(v) => set({ ownCardMonthly: Number(v) })}
          options={[
            { value: "300", label: t.ownCardOptions[300] },
            { value: "500", label: t.ownCardOptions[500] },
          ]}
        />
      </Group>
    </div>
  );
}

export function MedicalRisk({ result, lang }: { result: MedicalResult; lang: Lang }) {
  const t = STORYBOARD_TEXT[lang].medical;
  return (
    <RiskGauge
      score={result.riskScore}
      max={MEDICAL_RISK_MAX}
      level={result.riskLevel}
      levelText={t.level[result.riskLevel]}
      line={t.levelLine[result.riskLevel]}
      topLabel={t.topReason}
      top={result.topRisk ? t.risks[result.topRisk] : t.noReason}
    />
  );
}

export function MedicalGap({ result, lang }: { result: MedicalResult; lang: Lang }) {
  const t = STORYBOARD_TEXT[lang];
  return (
    <GapReveal
      need={result.bill}
      have={result.have}
      gap={result.gap}
      coveredPct={result.coveredPct}
      labels={{ need: lang === "bm" ? "Bil" : "Bill", have: t.common.have, gap: t.common.gap, covered: t.common.covered }}
      title={lang === "bm" ? "Perlu ditanggung sendiri" : "Paid out of pocket"}
      caption={medicalCaption(result, lang)}
    />
  );
}

export function MedicalBreakdown({ result, lang }: { result: MedicalResult; lang: Lang }) {
  const t = STORYBOARD_TEXT[lang];
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <WhoPays
        title={t.medical.whoPays}
        segments={[
          { label: t.medical.company, amount: result.companyUsed, tone: "have" },
          { label: t.medical.ownSavings, amount: result.savingsUsed, tone: "gold" },
          { label: t.common.gap, amount: result.gap, tone: "gap" },
        ]}
      />
      <BillInflation
        title={lang === "bm" ? "Kos rawatan terus naik" : "Treatment costs keep rising"}
        today={result.bill}
        later={result.billIn5Years}
        todayLabel={lang === "bm" ? "Hari ini" : "Today"}
        laterLabel={t.medical.billIn5}
      />
    </div>
  );
}

export function MedicalAnalytics({
  result,
  inputs,
  profile,
  lang,
}: {
  result: MedicalResult;
  inputs: MedicalInputs;
  profile: StoryboardProfile;
  lang: Lang;
}) {
  const t = STORYBOARD_TEXT[lang];
  const dependants = Math.max(1, profile.dependants || 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t.analytics.riskScore} value={result.riskScore} format="int" suffix={` / ${MEDICAL_RISK_MAX}`} />
        <StatTile label={t.analytics.coveredShare} value={result.coveredPct} format="int" suffix="%" />
        <StatTile label={t.analytics.gapPerDependant} value={result.gap / dependants} format="rm" />
        <StatTile label={t.medical.ownCardYear} value={result.ownCardYearly} format="rm" />
      </div>
      <div className="rounded-[16px] border border-sand bg-white px-4 py-3.5 text-[13px] font-semibold text-navy">
        {t.medical.yearsToSave(rm(inputs.monthlySaving), result.yearsToSave)}
      </div>
    </div>
  );
}
