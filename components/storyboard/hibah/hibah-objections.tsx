"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HIBAH_DEFAULT_CONTENT } from "@/lib/storyboard/defaults/hibah";
import { COMMON_OBJECTIONS, type Objection } from "@/lib/storyboard/defaults/common";
import { addDays, OUTCOME_LABEL } from "@/lib/storyboard/outcome";
import { saveStoryboardSettings, setStoryboardOutcome } from "@/app/(app)/leads/[id]/storyboard/actions";
import { STORYBOARD_OUTCOMES, type StoryboardOutcome } from "@/lib/storyboard/types";
import { SaveButton } from "../save-button";
import { BTN_GHOST, BTN_PRIMARY, CARD } from "./fields";
import { useStepSave } from "./use-step-save";
import type { HibahScreenProps } from "./types";

// Built-in answers, to store only what the agent actually changed.
const DEFAULT_ANSWERS = new Map<string, string>([
  ...HIBAH_DEFAULT_CONTENT.objections.map((o) => [o.q, o.a] as [string, string]),
  ...HIBAH_DEFAULT_CONTENT.faq.map((o) => [o.q, o.a] as [string, string]),
  ...COMMON_OBJECTIONS.flatMap((g) => g.items.map((o) => [o.q, o.a] as [string, string])),
]);

function myToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date());
}

export function HibahObjections(props: HibahScreenProps) {
  const router = useRouter();
  const { settings, stored } = props;
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
  const step = useStepSave(props, "objections");

  const [choice, setChoice] = useState<StoryboardOutcome | null>(props.outcome);
  const [date, setDate] = useState(() => addDays(myToday(), 7));
  const [reason, setReason] = useState("");
  const [outcomeMsg, setOutcomeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [outcomePending, startOutcome] = useTransition();

  const isOpen = (q: string) => open[q] !== false;
  const toggleRaised = (q: string) => setRaised((r) => (r.includes(q) ? r.filter((x) => x !== q) : [...r, q]));

  const changed = useMemo(
    () => Object.entries(answers).filter(([q, a]) => DEFAULT_ANSWERS.has(q) && a.trim() !== "" && a !== DEFAULT_ANSWERS.get(q)),
    [answers],
  );

  function saveAnswers() {
    setListMsg(null);
    startList(async () => {
      try {
        const res = await saveStoryboardSettings({
          scope: "agent",
          module: "hibah",
          settings: { objections: changed.map(([q, a]) => ({ q, a })) },
        });
        setListMsg(res.error ?? "Saved as your personal answers.");
        if (!res.error) {
          setEditing(false);
          router.refresh();
        }
      } catch {
        setListMsg("Couldn't connect. Check your internet connection and try again.");
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
          module: "hibah",
          outcome: choice,
          followUpDate: choice === "follow_up_later" ? date : null,
          reason: choice === "not_interested" ? reason : null,
        });
        setOutcomeMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: res.message ?? "Outcome recorded." });
        if (!res.error) router.refresh();
      } catch {
        setOutcomeMsg({ ok: false, text: "Couldn't connect. Check your internet connection and try again." });
      }
    });
  }

  function renderItem(o: Objection, quoted: boolean) {
    const expanded = isOpen(o.q);
    const marked = raised.includes(o.q);
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
              <label htmlFor={id} className="text-xs font-semibold text-muted-2">Your answer</label>
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
            onClick={() => toggleRaised(o.q)}
            className={`min-h-11 rounded-full border px-4 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              marked ? "border-green bg-green text-white" : "border-navy bg-white text-navy"
            }`}
          >
            {marked ? "Raised ✓ logged" : "Mark as raised"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-[13px] text-ink">
          {editing
            ? "Customize mode: open any item and rewrite the answer in your own words. Saved as your personal answers for every lead."
            : "Open an objection to see a suggested answer, and mark the ones the prospect raised."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={BTN_GHOST} aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
            {editing ? "Done customizing" : "Customize answers"}
          </button>
          {editing ? (
            <button type="button" className={BTN_PRIMARY} onClick={saveAnswers} disabled={listPending}>
              {listPending ? "Saving..." : "Save my answers"}
            </button>
          ) : null}
        </div>
      </div>
      <p role="status" aria-live="polite" className="m-0 -mt-3 text-xs font-semibold text-green">{listMsg}</p>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <section className={CARD}>
            <h2 className="m-0 text-lg font-bold text-navy">Hibah-specific objections</h2>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
              {settings.objectionsSpecific.map((o) => renderItem(o, false))}
            </ul>
          </section>
          <section className={CARD}>
            <h2 className="m-0 text-lg font-bold text-navy">Common questions</h2>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
              {settings.faq.map((o) => renderItem(o, false))}
            </ul>
          </section>
        </div>

        <section className={`${CARD} min-w-0`}>
          <h2 className="m-0 text-lg font-bold text-navy">General objections (all products)</h2>
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
            Record the outcome · {raised.length} {raised.length === 1 ? "objection" : "objections"} logged
          </h2>
          <p className="m-0 mt-1 text-xs text-muted-2">
            Updates the lead stage and follow-up date. A lead already at Appointment or later never moves backwards.
          </p>
        </div>
        <div role="radiogroup" aria-label="Outcome" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
              {OUTCOME_LABEL[o]}
            </button>
          ))}
        </div>
        {choice === "follow_up_later" ? (
          <div className="flex max-w-xs flex-col gap-1.5">
            <label htmlFor="fu-date" className="text-[13px] font-semibold text-navy">Follow-up date</label>
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
            <label htmlFor="ni-reason" className="text-[13px] font-semibold text-navy">Reason</label>
            <input
              id="ni-reason"
              type="text"
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Already covered elsewhere"
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
            {outcomePending ? "Recording..." : "Record outcome"}
          </button>
          {!props.hasRow && props.dbReady ? <span className="text-xs text-muted-2">Save Step 1 first.</span> : null}
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
          Responses are conversation guides for registered agents. Product terms, contributions and Shariah positions must follow the
          operator&apos;s official materials.
        </p>
      </div>
    </div>
  );
}
