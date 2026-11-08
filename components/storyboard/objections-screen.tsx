"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { COMMON_CONTENT, type Objection } from "@/lib/storyboard/defaults/common";
import type { BuiltModule } from "@/lib/storyboard/modules";
import { addDays, outcomeLabel as outcomeLabelFor } from "@/lib/storyboard/outcome";
import { MODULE_CONTENT } from "@/lib/storyboard/settings";
import { saveStoryboardSettings, setStoryboardOutcome } from "@/app/(app)/leads/[id]/storyboard/actions";
import { STORYBOARD_OUTCOMES, type StoryboardOutcome } from "@/lib/storyboard/types";
import { SaveButton } from "./save-button";
import { useT } from "./lang-context";
import { BTN_GHOST, BTN_PRIMARY, CARD } from "./hibah/fields";
import { useModuleStepSave } from "./use-step-save";
import type { ScreenProps, TickedStored } from "./screen-types";

function myToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date());
}

type Props<S extends TickedStored> = ScreenProps<S> & {
  module: BuiltModule;
  /** e.g. "Medical card objections". */
  specificTitle: string;
  /** Shown labels for the four outcomes; the stored value is unchanged. */
  outcomeLabels?: Partial<Record<StoryboardOutcome, string>>;
  footnote?: string;
};

/** Step 4 for every module: suggested answers, "raised" log and the outcome. */
export function ObjectionsScreen<S extends TickedStored>(props: Props<S>) {
  const router = useRouter();
  const { t, lang } = useT();
  const { settings, stored, module } = props;

  // Built-in answers, to store only what the agent actually changed.
  const defaults = useMemo(() => {
    const c = MODULE_CONTENT[module].localised[lang];
    return new Map<string, string>([
      ...c.objections.map((o) => [o.q, o.a] as [string, string]),
      ...c.faq.map((o) => [o.q, o.a] as [string, string]),
      ...COMMON_CONTENT[lang].objections.flatMap((g) => g.items.map((o) => [o.q, o.a] as [string, string])),
    ]);
  }, [module, lang]);

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const o of [...settings.objectionsSpecific, ...settings.objectionGroups.flatMap((g) => g.items), ...settings.faq]) out[o.q] = o.a;
    return out;
  });
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [raised, setRaised] = useState<string[]>(stored.raised);
  const [editing, setEditing] = useState(false);
  const [listMsg, setListMsg] = useState<string | null>(null);
  const [listPending, startList] = useTransition();
  const step = useModuleStepSave(module, props, "objections");

  const [choice, setChoice] = useState<StoryboardOutcome | null>(props.outcome);
  const [date, setDate] = useState(() => addDays(myToday(), 7));
  const [reason, setReason] = useState("");
  const [outcomeMsg, setOutcomeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [outcomePending, startOutcome] = useTransition();

  const isOpen = (q: string) => open[q] !== false;
  // Raised is stored by key: the English question for a default item, so it survives a language switch.
  const toggleRaised = (key: string) => setRaised((r) => (r.includes(key) ? r.filter((x) => x !== key) : [...r, key]));

  const changed = useMemo(
    () => Object.entries(answers).filter(([q, a]) => defaults.has(q) && a.trim() !== "" && a !== defaults.get(q)),
    [answers, defaults],
  );

  function saveAnswers() {
    setListMsg(null);
    startList(async () => {
      try {
        const res = await saveStoryboardSettings({
          scope: "agent",
          module,
          settings: { objections: changed.map(([q, a]) => ({ q, a })) },
          lang,
        });
        setListMsg(res.error ?? t("obj.savedAnswers"));
        if (!res.error) {
          setEditing(false);
          router.refresh();
        }
      } catch {
        setListMsg(t("common.connectError"));
      }
    });
  }

  function record() {
    if (!choice) return;
    setOutcomeMsg(null);
    startOutcome(async () => {
      try {
        const res = await setStoryboardOutcome({
          leadId: props.leadId,
          module,
          outcome: choice,
          followUpDate: choice === "follow_up_later" ? date : null,
          reason: choice === "not_interested" ? reason : null,
          lang,
        });
        setOutcomeMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: res.message ?? t("obj.recorded") });
        if (!res.error) router.refresh();
      } catch {
        setOutcomeMsg({ ok: false, text: t("common.connectError") });
      }
    });
  }

  function renderItem(o: Objection, quoted: boolean) {
    const expanded = isOpen(o.q);
    const rkey = o.key ?? o.q;
    const marked = raised.includes(rkey);
    const id = `ans-${o.q.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40)}`;
    return (
      <li key={o.q} className="rounded-[12px] border border-sand">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen((s) => ({ ...s, [o.q]: !expanded }))}
          className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold text-navy focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
        >
          <span>{quoted ? `“${o.q}”` : o.q}</span>
          <span aria-hidden="true" className="text-muted-2">{expanded ? "−" : "+"}</span>
        </button>
        <div id={`${id}-panel`} hidden={!expanded} className="flex flex-col items-start gap-2.5 px-3 pb-3">
          {editing ? (
            <>
              <label htmlFor={id} className="text-xs font-semibold text-muted-2">{t("obj.yourAnswer")}</label>
              <textarea
                id={id}
                rows={4}
                maxLength={1200}
                value={answers[o.q] ?? o.a}
                onChange={(e) => setAnswers((a) => ({ ...a, [o.q]: e.target.value }))}
                className="w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2 text-sm text-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
              />
            </>
          ) : (
            <p className="m-0 text-[13px] leading-relaxed text-ink">{answers[o.q] ?? o.a}</p>
          )}
          <button
            type="button"
            aria-pressed={marked}
            onClick={() => toggleRaised(rkey)}
            className={`min-h-11 rounded-full border px-4 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              marked ? "border-green bg-green text-white" : "border-navy bg-white text-navy"
            }`}
          >
            {marked ? t("obj.raised") : t("obj.markRaised")}
          </button>
        </div>
      </li>
    );
  }

  const outcomeLabel = (o: StoryboardOutcome) => props.outcomeLabels?.[o] ?? outcomeLabelFor(o, lang);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-[13px] text-ink">
          {editing ? t("obj.helpEditing") : t("obj.help")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={BTN_GHOST} aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
            {editing ? t("obj.customizeDone") : t("obj.customize")}
          </button>
          {editing ? (
            <button type="button" className={BTN_PRIMARY} onClick={saveAnswers} disabled={listPending}>
              {listPending ? t("common.saving") : t("obj.saveAnswers")}
            </button>
          ) : null}
        </div>
      </div>
      <p role="status" aria-live="polite" className="m-0 -mt-3 text-xs font-semibold text-green">{listMsg}</p>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <section className={CARD}>
            <h2 className="m-0 text-lg font-bold text-navy">{props.specificTitle}</h2>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
              {settings.objectionsSpecific.map((o) => renderItem(o, false))}
            </ul>
          </section>
          <section className={CARD}>
            <h2 className="m-0 text-lg font-bold text-navy">{t("obj.common")}</h2>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
              {settings.faq.map((o) => renderItem(o, false))}
            </ul>
          </section>
        </div>

        <section className={`${CARD} min-w-0`}>
          <h2 className="m-0 text-lg font-bold text-navy">{t("obj.general")}</h2>
          <div className="mt-3 flex flex-col gap-4">
            {settings.objectionGroups.map((g) => (
              <div key={g.name}>
                <h3 className="m-0 mb-2 flex items-center justify-between text-sm font-bold text-navy">
                  <span>{g.name}</span>
                  <span className="rounded-full bg-sand px-2 py-0.5 text-xs text-muted-2">{g.items.length}</span>
                </h3>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">{g.items.map((o) => renderItem(o, true))}</ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section aria-labelledby="outcome-h" className={`${CARD} flex flex-col gap-3`}>
        <div>
          <h2 id="outcome-h" className="m-0 text-base font-bold text-navy">
            {t("obj.recordHeading", { n: raised.length, unit: raised.length === 1 ? t("obj.objection") : t("obj.objections") })}
          </h2>
          <p className="m-0 mt-1 text-xs text-muted-2">
            {t("obj.recordHint")}
          </p>
        </div>
        <div role="radiogroup" aria-label={t("obj.outcomeAria")} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STORYBOARD_OUTCOMES.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={choice === o}
              onClick={() => setChoice(o)}
              className={`min-h-11 rounded-[12px] border px-3 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                choice === o ? "border-navy bg-navy text-cream" : "border-sand-2 bg-white text-navy hover:bg-sand-3"
              }`}
            >
              {outcomeLabel(o)}
            </button>
          ))}
        </div>
        {choice === "follow_up_later" ? (
          <div className="flex max-w-xs flex-col gap-1.5">
            <label htmlFor="fu-date" className="text-[13px] font-semibold text-navy">{t("obj.followUpDate")}</label>
            <input
              id="fu-date"
              type="date"
              value={date}
              min={myToday()}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-11 rounded-[10px] border border-sand-2 bg-white px-3 text-sm text-navy focus-visible:outline-2 focus-visible:outline-brand"
            />
          </div>
        ) : null}
        {choice === "not_interested" ? (
          <div className="flex max-w-md flex-col gap-1.5">
            <label htmlFor="ni-reason" className="text-[13px] font-semibold text-navy">{t("obj.reason")}</label>
            <input
              id="ni-reason"
              type="text"
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("obj.reasonPlaceholder")}
              className="min-h-11 rounded-[10px] border border-sand-2 bg-white px-3 text-sm text-navy focus-visible:outline-2 focus-visible:outline-brand"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={BTN_PRIMARY}
            onClick={record}
            disabled={!choice || outcomePending || !props.dbReady || !props.hasRow}
          >
            {outcomePending ? t("obj.recording") : t("obj.recordBtn")}
          </button>
          {!props.hasRow && props.dbReady ? <span className="text-xs text-muted-2">{t("obj.saveStep1")}</span> : null}
          <span role="status" aria-live="polite" className={`text-xs font-semibold ${outcomeMsg?.ok ? "text-green" : "text-alert-red"}`}>
            {outcomeMsg?.text}
          </span>
        </div>
      </section>

      <div className="flex flex-col gap-3 border-t border-sand pt-4">
        <SaveButton
          savedAt={step.savedAt}
          pending={step.pending}
          onSave={() => step.save({ raised })}
          error={step.error}
          disabled={step.blocked}
        />
        <p className="m-0 text-xs text-muted-2">
          {props.footnote ?? t("obj.footnote")}
        </p>
      </div>
    </div>
  );
}
