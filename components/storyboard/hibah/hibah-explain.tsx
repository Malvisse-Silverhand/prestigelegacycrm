"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { computeModule } from "@/lib/storyboard/engine";
import { rmWhole } from "@/lib/storyboard/engine/money";
import { HIBAH_DEFAULT_CONTENT } from "@/lib/storyboard/defaults/hibah";
import { fillScript } from "@/lib/storyboard/settings";
import { buildHibahWaSummary } from "@/lib/storyboard/wa-summary";
import { saveStoryboardSettings } from "@/app/(app)/leads/[id]/storyboard/actions";
import { Accordion } from "../accordion";
import { CopyToWa } from "../copy-to-wa";
import { SaveButton } from "../save-button";
import { SceneFrame } from "../scene-frame";
import { SITUATIONS, SituationScene } from "./hibah-situations";
import { BTN_GHOST, BTN_PRIMARY, CARD } from "./fields";
import { useStepSave } from "./use-step-save";
import type { HibahScreenProps } from "./types";

export function HibahExplain(props: HibahScreenProps) {
  const router = useRouter();
  const { settings, stored } = props;
  const result = useMemo(() => computeModule("hibah", stored), [stored]);
  const { out } = result;
  const [scene, setScene] = useState(0);
  const [editing, setEditing] = useState(false);
  const [script, setScript] = useState<string[]>(() => settings.script.map((s) => s.text));
  const [scriptMsg, setScriptMsg] = useState<string | null>(null);
  const [scriptPending, startScript] = useTransition();
  const step = useStepSave(props, "explain");

  const tokens = {
    name: stored.nick.trim() || "the prospect",
    need: out.text.need,
    have: out.text.have,
    gap: out.text.gap,
    base: rmWhole(settings.base),
  };

  function saveScript() {
    setScriptMsg(null);
    // Steps left at the default are stored empty, so later default fixes still reach this agent.
    const overrides = script.map((text, i) => (text.trim() === HIBAH_DEFAULT_CONTENT.script[i].text ? "" : text));
    startScript(async () => {
      try {
        const res = await saveStoryboardSettings({ scope: "agent", module: "hibah", settings: { script: overrides } });
        setScriptMsg(res.error ?? "Saved as your personal script.");
        if (!res.error) {
          setEditing(false);
          router.refresh();
        }
      } catch {
        setScriptMsg("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  const waText = buildHibahWaSummary({ nick: stored.nick, out, planName: settings.planName, agentFirstName: props.agentFirstName });
  const maxMult = Math.max(1, ...settings.mults);

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="2D situations" className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-2">Show the situation · 2D</span>
          {SITUATIONS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-pressed={scene === i}
              onClick={() => setScene(i)}
              className={`flex min-h-14 items-center gap-3 rounded-[14px] border px-3.5 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                scene === i ? "border-navy bg-navy text-cream" : "border-sand bg-white text-navy"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[13px] font-bold ${
                  scene === i ? "bg-gold text-navy" : "border border-sand bg-cream text-navy"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-bold">{s.title}</span>
                <span className={`text-xs ${scene === i ? "text-white/75" : "text-muted-2"}`}>{s.sub(out, stored.home)}</span>
              </span>
            </button>
          ))}
          <div className="flex gap-2">
            <button type="button" className={BTN_GHOST} onClick={() => setScene((scene + 3) % 4)} aria-label="Previous situation">
              ‹ Prev
            </button>
            <button type="button" className={BTN_GHOST} onClick={() => setScene((scene + 1) % 4)} aria-label="Next situation">
              Next ›
            </button>
          </div>
        </div>
        <SceneFrame caption={<span className="font-semibold text-navy">{SITUATIONS[scene].title}</span>}>
          <SituationScene index={scene} out={out} home={stored.home} />
        </SceneFrame>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <section aria-labelledby="script-h" className={CARD}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="script-h" className="m-0 text-lg font-bold text-navy">Conversation script</h2>
            <button type="button" className={BTN_GHOST} aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
              {editing ? "Done customizing" : "Customize script"}
            </button>
          </div>
          {editing ? (
            <p className="mb-0 mt-2 text-[13px] text-ink">
              Edit the script in your own words. Tokens {"{name}"}, {"{need}"}, {"{have}"}, {"{gap}"} and {"{base}"} fill in from this
              lead. Saved as your personal script for every lead.
            </p>
          ) : null}
          <ol className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
            {settings.script.map((st, i) => (
              <li key={st.title} className="flex gap-3">
                <span aria-hidden="true" className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gold text-[13px] font-bold text-navy">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-2">{st.title}</span>
                  {editing ? (
                    <>
                      <label htmlFor={`script-${i}`} className="sr-only">Script step {i + 1}</label>
                      <textarea
                        id={`script-${i}`}
                        rows={4}
                        maxLength={1200}
                        value={script[i]}
                        onChange={(e) => setScript((s) => s.map((t, j) => (j === i ? e.target.value : t)))}
                        className="mt-1 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2 text-sm text-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
                      />
                    </>
                  ) : (
                    <p className="m-0 mt-1 text-sm leading-relaxed text-navy">
                      <strong>Say:</strong> {fillScript(script[i], tokens)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {editing ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" className={BTN_PRIMARY} onClick={saveScript} disabled={scriptPending}>
                {scriptPending ? "Saving..." : "Save my script"}
              </button>
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => setScript(HIBAH_DEFAULT_CONTENT.script.map((s) => s.text))}
              >
                Reset to default
              </button>
            </div>
          ) : null}
          <p role="status" aria-live="polite" className="m-0 mt-2 text-xs font-semibold text-green">{scriptMsg}</p>
          {settings.statistics.length > 0 ? (
            <div className="mt-4 rounded-[12px] bg-cream px-3.5 py-3">
              <h3 className="m-0 text-[13px] font-bold text-navy">Statistics to quote (set by your admin)</h3>
              <ul className="m-0 mt-1.5 list-disc pl-5 text-[13px] text-ink">
                {settings.statistics.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <div className="flex min-w-0 flex-col gap-3.5">
          <Accordion title="Benefits for the family">
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              <li><strong className="block text-navy">Daily life keeps running</strong>Groceries, utilities, rent and adjustment costs.</li>
              <li><strong className="block text-navy">Children&apos;s dreams continue</strong>School fees, equipment and education.</li>
              <li><strong className="block text-navy">Spouse has choices</strong>Less pressure to make big decisions while grieving.</li>
            </ul>
          </Accordion>

          <Accordion title="Beneficiary vs executor">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[12px] border border-sand bg-success-bg p-3">
                <div className="font-bold text-navy">Hibah beneficiary</div>
                <div className="text-xs text-green">receives directly</div>
                <div className="mt-1.5">Uses it for their own needs.</div>
              </div>
              <div className="rounded-[12px] border border-sand bg-cream p-3">
                <div className="font-bold text-navy">Executor (wasi)</div>
                <div className="text-xs text-muted-2">administers only</div>
                <div className="mt-1.5">Distributes by faraid.</div>
              </div>
            </div>
          </Accordion>

          <Accordion title={`${settings.planName} · benefit multiples`}>
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
                      {m ? rmWhole(settings.base * m) : "Check PDS"}
                    </span>
                  </div>
                );
              })}
              <p className="m-0 text-xs text-muted-2">
                Example base {rmWhole(settings.base)}, illustration only. Categories are not added together. Plan name and multiples are
                set by your admin in Settings; confirm each figure against the plan&apos;s PDS before showing a prospect.
              </p>
            </div>
          </Accordion>

          <Accordion title="3 steps">
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              <li>1. Discuss needs: budget and dependants</li>
              <li>2. Review illustration, contribution, term, conditions &amp; exclusions</li>
              <li>3. Apply, check the certificate &amp; hibah nomination, inform the beneficiaries</li>
            </ol>
          </Accordion>

          <Accordion title="Information needed for quotation">
            <ul className="m-0 list-disc pl-5">
              <li>Name &amp; date of birth</li>
              <li>Occupation</li>
              <li>Smoker or non-smoker</li>
              <li>Existing illness (yes / no)</li>
              <li>Ever had an accident or been hospitalised</li>
            </ul>
          </Accordion>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-sand pt-4">
        <SaveButton savedAt={step.savedAt} pending={step.pending} onSave={() => step.save({})} error={step.error} disabled={step.blocked} />
        <CopyToWa text={waText} label="Copy summary for WhatsApp" />
      </div>
    </div>
  );
}
