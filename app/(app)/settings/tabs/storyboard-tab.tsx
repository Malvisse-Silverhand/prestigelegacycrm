"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOrgStoryboardSettings } from "@/app/(app)/leads/[id]/storyboard/actions";
import { HIBAH_DEFAULT_PLAN } from "@/lib/storyboard/defaults/hibah";
import { BUILT_MODULES, MODULE_NAME, type BuiltModule } from "@/lib/storyboard/modules";
import { MODULE_CONTENT, type OrgSettings } from "@/lib/storyboard/settings";

const INPUT =
  "min-h-11 w-full rounded-[10px] border border-sand-2 bg-white px-3 text-sm text-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand";

export type StoryboardTabData = { settings: Partial<Record<BuiltModule, OrgSettings>>; message: string | null };

const STAT_HINT: Record<BuiltModule, string> = {
  hibah: "e.g. [statistic + source]",
  medical: "e.g. [medical inflation figure + source]",
  ci: "e.g. [statistic + source: deaths from heart disease, year]",
  business: "e.g. [statistic + source]",
};

/** SuperAdmin-only organisation defaults for the Financial Storyboard modules. */
export function StoryboardTab({ initial }: { initial: StoryboardTabData }) {
  const [module, setModule] = useState<BuiltModule>("hibah");
  return (
    <div className="flex max-w-[720px] flex-col gap-5">
      {initial.message ? (
        <p role="alert" className="m-0 rounded-[12px] border border-warn-orange bg-warn-gold-bg px-4 py-3 text-sm font-semibold text-warn-gold-text">
          {initial.message}
        </p>
      ) : null}

      <div role="tablist" aria-label="Storyboard module" className="flex flex-wrap gap-2">
        {BUILT_MODULES.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            id={`sb-tab-${m}`}
            aria-selected={module === m}
            aria-controls="sb-module-panel"
            onClick={() => setModule(m)}
            className={`min-h-11 rounded-[12px] border px-4 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              module === m ? "border-brand bg-brand text-white" : "border-sand bg-white text-ink"
            }`}
          >
            {MODULE_NAME[m]}
          </button>
        ))}
      </div>

      <div id="sb-module-panel" role="tabpanel" aria-labelledby={`sb-tab-${module}`}>
        <ModuleDefaults key={module} module={module} initial={initial.settings[module] ?? {}} />
      </div>

      <p className="m-0 text-xs text-muted-2">Mortgage defaults arrive with that module.</p>
    </div>
  );
}

function ModuleDefaults({ module, initial }: { module: BuiltModule; initial: OrgSettings }) {
  const router = useRouter();
  const isHibah = module === "hibah";
  const [planName, setPlanName] = useState(initial.planName ?? MODULE_CONTENT[module].planName);
  const [base, setBase] = useState(String(initial.base ?? HIBAH_DEFAULT_PLAN.base));
  const [mults, setMults] = useState<string[]>((initial.mults ?? HIBAH_DEFAULT_PLAN.mults).map(String));
  const [stats, setStats] = useState((initial.statistics ?? []).join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    const statistics = stats.split("\n").map((l) => l.trim()).filter(Boolean);
    const settings = isHibah
      ? { planName, base: Number(base) || 0, mults: mults.map((m) => Number(m) || 0), statistics }
      : { planName, statistics };
    startTransition(async () => {
      try {
        const res = await saveOrgStoryboardSettings({ module, settings });
        if (res.error) {
          setError(res.error);
          return;
        }
        setSaved(true);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  const idp = `sb-${module}`;
  return (
    <section className="rounded-[16px] border border-sand bg-white p-4 sm:p-5" aria-labelledby={`${idp}-h`}>
      <h3 id={`${idp}-h`} className="m-0 text-[15px] font-bold text-navy">{MODULE_NAME[module]} defaults</h3>
      <p className="m-0 mt-1 text-[12.5px] text-muted">
        Every agent sees these in the {MODULE_NAME[module]} storyboard. Great Eastern plans only. Confirm the plan name against the
        plan&apos;s PDS. Agents can still change their own script, objection answers and checklist.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idp}-plan`} className="text-[13px] font-semibold text-navy">Plan name</label>
          <input id={`${idp}-plan`} className={INPUT} value={planName} maxLength={80} onChange={(e) => setPlanName(e.target.value)} />
        </div>
        {isHibah ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idp}-base`} className="text-[13px] font-semibold text-navy">Example base amount (RM)</label>
            <input
              id={`${idp}-base`}
              className={INPUT}
              inputMode="numeric"
              value={base}
              onChange={(e) => setBase(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </div>
        ) : null}
      </div>

      {isHibah ? (
        <fieldset className="m-0 mt-4 border-0 p-0">
          <legend className="mb-1.5 text-[13px] font-semibold text-navy">Benefit multiples (× base amount, 0 = check the PDS)</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {HIBAH_DEFAULT_PLAN.multLabels.map((label, i) => (
              <div key={label} className="flex flex-col gap-1">
                <label htmlFor={`${idp}-mult-${i}`} className="text-xs text-muted-2">{label}</label>
                <input
                  id={`${idp}-mult-${i}`}
                  className={INPUT}
                  inputMode="decimal"
                  value={mults[i] ?? "0"}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, "");
                    setMults((m) => m.map((x, j) => (j === i ? v : x)));
                  }}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor={`${idp}-stats`} className="text-[13px] font-semibold text-navy">Statistics placeholders (one per line, up to 5)</label>
        <textarea
          id={`${idp}-stats`}
          rows={4}
          value={stats}
          onChange={(e) => setStats(e.target.value)}
          placeholder={STAT_HINT[module]}
          className="rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-sm text-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
        />
        <span className="text-xs text-muted-2">Shown to agents as lines they may quote. Always include the source; never invent a figure.</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="min-h-11 rounded-[12px] bg-brand px-6 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save defaults"}
        </button>
        <span role="status" aria-live="polite" className="text-xs font-semibold">
          {error ? <span className="text-alert-red">{error}</span> : saved ? <span className="text-green">Saved ✓</span> : null}
        </span>
      </div>
    </section>
  );
}
