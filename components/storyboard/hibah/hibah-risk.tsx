"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStoryboardSettings } from "@/app/(app)/leads/[id]/storyboard/actions";
import { Accordion } from "../accordion";
import { SaveButton } from "../save-button";
import { BTN_GHOST, BTN_PRIMARY, CARD } from "./fields";
import { useStepSave } from "./use-step-save";
import type { HibahScreenProps } from "./types";

type Item = { label: string; detail: string };

export type RiskLevel = "Low" | "Moderate" | "High";

export function riskLevel(count: number): RiskLevel {
  return count === 0 ? "Low" : count <= 2 ? "Moderate" : "High";
}

const LEVEL_NOTE: Record<RiskLevel, string> = {
  Low: "Likely standard terms. Still declare everything accurately.",
  Moderate: "Possible loading or exclusion. Prepare reports before submitting.",
  High: "Possible postponement, exclusion or decline. Discuss before submitting, and prepare an alternative plan.",
};
const LEVEL_STYLE: Record<RiskLevel, string> = {
  Low: "bg-success-bg text-green",
  Moderate: "bg-warn-gold-bg text-warn-gold-text",
  High: "bg-alert-red-bg text-alert-red",
};

export function HibahRisk(props: HibahScreenProps) {
  const router = useRouter();
  const { settings, stored } = props;
  const nickLabel = stored.nick.trim() || "the prospect";
  const [items, setItems] = useState<Item[]>(settings.riskItems);
  const [checked, setChecked] = useState<string[]>(stored.riskChecked);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [listMsg, setListMsg] = useState<string | null>(null);
  const [listPending, startList] = useTransition();
  const step = useStepSave(props, "risk");

  const labels = new Set(items.map((i) => i.label));
  const tickedCount = checked.filter((l) => labels.has(l)).length;
  const level = riskLevel(tickedCount);

  const toggle = (label: string) => setChecked((c) => (c.includes(label) ? c.filter((l) => l !== label) : [...c, label]));

  function addItem() {
    const label = draft.trim().slice(0, 80);
    if (!label || items.some((i) => i.label.toLowerCase() === label.toLowerCase())) return;
    setItems((list) => [...list, { label, detail: "Your own note." }]);
    setDraft("");
  }

  function saveList() {
    setListMsg(null);
    startList(async () => {
      try {
        const res = await saveStoryboardSettings({ scope: "agent", module: "hibah", settings: { riskItems: items } });
        setListMsg(res.error ?? "Saved as your personal checklist.");
        if (!res.error) router.refresh();
      } catch {
        setListMsg("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <section aria-labelledby="chk-h" className={CARD}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id="chk-h" className="m-0 text-lg font-bold text-navy">Check before filling in the proposal form</h2>
              <p className="m-0 mt-1 text-[13px] text-ink">
                Tick what applies to {nickLabel}. This is a guide to likely outcomes; the actual decision is made by the underwriter.
              </p>
            </div>
            <button type="button" className={BTN_GHOST} aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
              {editing ? "Done customizing" : "Customize checklist"}
            </button>
          </div>

          <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
            {items.map((it) => {
              const id = `chk-${it.label.replace(/[^a-zA-Z0-9]/g, "-")}`;
              const expanded = open[it.label] !== false;
              return (
                <li key={it.label} className="rounded-[12px] border border-sand px-3 py-1.5">
                  <div className="flex min-h-11 items-center gap-3">
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked.includes(it.label)}
                      onChange={() => toggle(it.label)}
                      className="h-5 w-5 flex-none accent-[var(--brand-primary)]"
                    />
                    <label htmlFor={id} className="flex-1 cursor-pointer text-sm font-semibold text-navy">{it.label}</label>
                    {editing ? (
                      <button
                        type="button"
                        className="min-h-11 px-2 text-xs font-semibold text-alert-red"
                        onClick={() => setItems((list) => list.filter((x) => x.label !== it.label))}
                        aria-label={`Remove ${it.label}`}
                      >
                        Remove
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-label={`More about ${it.label}`}
                      onClick={() => setOpen((o) => ({ ...o, [it.label]: !expanded }))}
                      className="flex h-11 w-11 items-center justify-center text-lg text-muted-2 focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                    </button>
                  </div>
                  {expanded ? <p className="m-0 pb-2 pl-8 text-[13px] leading-relaxed text-ink">{it.detail}</p> : null}
                </li>
              );
            })}
          </ul>

          {editing ? (
            <div className="mt-4 flex flex-col gap-2">
              <label htmlFor="add-item" className="text-[13px] font-semibold text-navy">New check item</label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="add-item"
                  type="text"
                  maxLength={80}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add your own check, e.g. Pregnant"
                  className="min-h-11 min-w-0 flex-1 rounded-[10px] border border-sand-2 bg-white px-3 text-sm text-navy focus-visible:outline-2 focus-visible:outline-brand"
                />
                <button type="button" className={BTN_GHOST} onClick={addItem}>Add check</button>
                <button type="button" className={BTN_PRIMARY} onClick={saveList} disabled={listPending}>
                  {listPending ? "Saving..." : "Save my checklist"}
                </button>
              </div>
            </div>
          ) : null}
          <p role="status" aria-live="polite" className="m-0 mt-2 text-xs font-semibold text-green">{listMsg}</p>

          <div className={`mt-4 rounded-[16px] px-5 py-4 ${LEVEL_STYLE[level]}`} role="status" aria-live="polite">
            <div className="text-xs font-bold uppercase tracking-wide">
              Underwriting risk · {tickedCount} {tickedCount === 1 ? "factor" : "factors"}
            </div>
            <div className="text-4xl font-extrabold leading-tight tracking-tight">{level}</div>
            <div className="text-[13px]">{LEVEL_NOTE[level]}</div>
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-3.5">
          <Accordion title="Hibah specific">
            <ul className="m-0 list-disc pl-5 leading-7">
              <li>Hibah: a large amount may need a medical examination and financial underwriting.</li>
              <li>The hibah nomination must be valid and complete; inform the beneficiaries.</li>
            </ul>
          </Accordion>
          <Accordion title="Why claims get rejected">
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {settings.riskReasons.map((r) => (
                <li key={r.label}>
                  <strong className="block text-navy">{r.label}</strong>
                  {r.detail}
                </li>
              ))}
            </ul>
            <p className="m-0 mt-3 text-xs text-muted-2">
              Disclose fully and honestly. An exclusion for one condition is far better than an entire claim being rejected.
            </p>
          </Accordion>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-sand pt-4">
        <SaveButton
          savedAt={step.savedAt}
          pending={step.pending}
          onSave={() => step.save({ riskChecked: checked.filter((l) => labels.has(l)) })}
          error={step.error}
          disabled={step.blocked}
        />
      </div>
    </div>
  );
}
