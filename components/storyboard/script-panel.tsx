"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStoryboardSettings } from "@/app/(app)/leads/[id]/storyboard/actions";
import type { BuiltModule } from "@/lib/storyboard/modules";
import { fillScript, MODULE_CONTENT, type ResolvedSettings } from "@/lib/storyboard/settings";
import { BTN_GHOST, BTN_PRIMARY, CARD } from "./hibah/fields";
import { useT } from "./lang-context";

type Props = {
  module: BuiltModule;
  settings: ResolvedSettings;
  /** Values for {tokens} in the script. */
  tokens: Record<string, string>;
  /** Only show these script steps (Business shows one need at a time). */
  indices?: number[];
  /** Overrides the default "Conversation script" heading. */
  heading?: string;
  /** Statistics to quote. Org statistics win; otherwise these bracketed placeholders show. */
  statPlaceholders?: string[];
};

/** The conversation script: read it, or rewrite it as the agent's own personal script. */
export function ScriptPanel({ module, settings, tokens, indices, heading, statPlaceholders = [] }: Props) {
  const router = useRouter();
  const { t, lang } = useT();
  // Compare against the default of the language being edited.
  const defaults = MODULE_CONTENT[module].localised[lang].script;
  const [editing, setEditing] = useState(false);
  const [script, setScript] = useState<string[]>(() => settings.script.map((s) => s.text));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = indices ?? settings.script.map((_, i) => i);
  const tokenList = Object.keys(tokens).map((k) => `{${k}}`).join(", ");

  function save() {
    setMsg(null);
    // Steps left at the default are stored empty, so later default fixes still reach this agent.
    const overrides = script.map((text, i) => (text.trim() === defaults[i].text ? "" : text));
    startTransition(async () => {
      try {
        const res = await saveStoryboardSettings({ scope: "agent", module, settings: { script: overrides }, lang });
        setMsg(res.error ?? t("script.saved"));
        if (!res.error) {
          setEditing(false);
          router.refresh();
        }
      } catch {
        setMsg(t("common.connectError"));
      }
    });
  }

  const stats = settings.statistics.length > 0 ? settings.statistics : statPlaceholders;

  return (
    <section aria-labelledby={`script-h-${module}`} className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`script-h-${module}`} className="m-0 text-lg font-bold text-navy">{heading ?? t("script.heading")}</h2>
        <button type="button" className={BTN_GHOST} aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
          {editing ? t("script.customizeDone") : t("script.customize")}
        </button>
      </div>
      {editing ? (
        <p className="mb-0 mt-2 text-[13px] text-ink">
          {t("script.editHelp", { tokens: tokenList })}
        </p>
      ) : null}
      <ol className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
        {shown.map((i, n) => {
          const st = settings.script[i];
          if (!st) return null;
          return (
            <li key={`${i}-${st.title}`} className="flex gap-3">
              <span aria-hidden="true" className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gold text-[13px] font-bold text-navy">
                {n + 1}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-2">{st.title}</span>
                {editing ? (
                  <>
                    <label htmlFor={`script-${module}-${i}`} className="sr-only">{t("script.stepAria", { n: n + 1 })}</label>
                    <textarea
                      id={`script-${module}-${i}`}
                      rows={4}
                      maxLength={1200}
                      value={script[i]}
                      onChange={(e) => setScript((s) => s.map((t, j) => (j === i ? e.target.value : t)))}
                      className="mt-1 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2 text-sm text-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
                    />
                  </>
                ) : (
                  <p className="m-0 mt-1 text-sm leading-relaxed text-navy">
                    <strong>{t("script.say")}</strong> {fillScript(script[i], tokens)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {editing ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className={BTN_PRIMARY} onClick={save} disabled={pending}>
            {pending ? t("common.saving") : t("script.save")}
          </button>
          <button
            type="button"
            className={BTN_GHOST}
            onClick={() => setScript((cur) => cur.map((t, j) => (shown.includes(j) ? defaults[j].text : t)))}
          >
            {t("script.reset")}
          </button>
        </div>
      ) : null}
      <p role="status" aria-live="polite" className="m-0 mt-2 text-xs font-semibold text-green">{msg}</p>
      {stats.length > 0 ? (
        <div className="mt-4 rounded-[12px] bg-cream px-3.5 py-3">
          <h3 className="m-0 text-[13px] font-bold text-navy">
            {settings.statistics.length > 0 ? t("script.statsAdmin") : t("script.statsFill")}
          </h3>
          <ul className="m-0 mt-1.5 list-disc pl-5 text-[13px] text-ink">
            {stats.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="m-0 mt-1.5 text-xs text-muted-2">{t("script.statsNote")}</p>
        </div>
      ) : null}
    </section>
  );
}
