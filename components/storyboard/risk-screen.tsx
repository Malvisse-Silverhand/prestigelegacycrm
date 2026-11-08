"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { saveStoryboardSettings } from "@/app/(app)/leads/[id]/storyboard/actions";
import type { BuiltModule } from "@/lib/storyboard/modules";
import { Accordion } from "./accordion";
import { SaveButton } from "./save-button";
import { useT } from "./lang-context";
import { BTN_GHOST, BTN_PRIMARY, CARD } from "./hibah/fields";
import { useModuleStepSave } from "./use-step-save";
import type { ScreenProps, TickedStored } from "./screen-types";

type Item = { label: string; detail: string; key?: string };

/** Ticks are stored by key: the English label of a default item, or the label of one the agent added. */
const keyOf = (i: Item) => i.key ?? i.label;

export type RiskLevel = "Low" | "Moderate" | "High";

export function riskLevel(count: number): RiskLevel {
  return count === 0 ? "Low" : count <= 2 ? "Moderate" : "High";
}

const LEVEL_STYLE: Record<RiskLevel, string> = {
  Low: "bg-success-bg text-green",
  Moderate: "bg-warn-gold-bg text-warn-gold-text",
  High: "bg-alert-red-bg text-alert-red",
};

type Props<S extends TickedStored> = ScreenProps<S> & {
  module: BuiltModule;
  /** Who the checklist is about (nickname or company). */
  subject: string;
  /** Heading of the module-specific box beside the checklist, e.g. "Medical card specific". */
  specificTitle: string;
  specificPoints: string[];
  /** Extra content under the specific box. */
  aside?: ReactNode;
};

/** Step 3 for every module: tick what applies, see the likely underwriting outcome. */
export function RiskScreen<S extends TickedStored>(props: Props<S>) {
  const router = useRouter();
  const { t, lang } = useT();
  const { settings, stored, module } = props;
  const [items, setItems] = useState<Item[]>(settings.riskItems);
  const [checked, setChecked] = useState<string[]>(stored.riskChecked);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [listMsg, setListMsg] = useState<string | null>(null);
  const [listPending, startList] = useTransition();
  const step = useModuleStepSave(module, props, "risk");

  const labels = new Set(items.map(keyOf));
  const tickedCount = checked.filter((l) => labels.has(l)).length;
  const level = riskLevel(tickedCount);

  const toggle = (label: string) => setChecked((c) => (c.includes(label) ? c.filter((l) => l !== label) : [...c, label]));

  function addItem() {
    const label = draft.trim().slice(0, 80);
    if (!label || items.some((i) => i.label.toLowerCase() === label.toLowerCase())) return;
    setItems((list) => [...list, { label, detail: t("risk.ownNote") }]);
    setDraft("");
  }

  function saveList() {
    setListMsg(null);
    startList(async () => {
      try {
        const res = await saveStoryboardSettings({ scope: "agent", module, settings: { riskItems: items }, lang });
        setListMsg(res.error ?? t("risk.savedList"));
        if (!res.error) router.refresh();
      } catch {
        setListMsg(t("common.connectError"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <section aria-labelledby="chk-h" className={CARD}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id="chk-h" className="m-0 text-lg font-bold text-navy">{t("risk.title")}</h2>
              <p className="m-0 mt-1 text-[13px] text-ink">
                {t("risk.intro", { subject: props.subject })}
              </p>
            </div>
            <button type="button" className={BTN_GHOST} aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
              {editing ? t("risk.customizeDone") : t("risk.customize")}
            </button>
          </div>

          <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
            {items.map((it) => {
              const itemKey = keyOf(it);
              const id = `chk-${itemKey.replace(/[^a-zA-Z0-9]/g, "-")}`;
              const expanded = open[itemKey] !== false;
              return (
                <li key={itemKey} className="rounded-[12px] border border-sand px-3 py-1.5">
                  <div className="flex min-h-11 items-center gap-3">
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked.includes(itemKey)}
                      onChange={() => toggle(itemKey)}
                      className="h-5 w-5 flex-none accent-[var(--brand-primary)]"
                    />
                    <label htmlFor={id} className="flex-1 cursor-pointer text-sm font-semibold text-navy">{it.label}</label>
                    {editing ? (
                      <button
                        type="button"
                        className="min-h-11 px-2 text-xs font-semibold text-alert-red"
                        onClick={() => setItems((list) => list.filter((x) => keyOf(x) !== itemKey))}
                        aria-label={t("risk.removeAria", { label: it.label })}
                      >
                        {t("risk.remove")}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-label={t("risk.moreAria", { label: it.label })}
                      onClick={() => setOpen((o) => ({ ...o, [itemKey]: !expanded }))}
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
              <label htmlFor="add-item" className="text-[13px] font-semibold text-navy">{t("risk.newItem")}</label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="add-item"
                  type="text"
                  maxLength={80}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t("risk.placeholder")}
                  className="min-h-11 min-w-0 flex-1 rounded-[10px] border border-sand-2 bg-white px-3 text-sm text-navy focus-visible:outline-2 focus-visible:outline-brand"
                />
                <button type="button" className={BTN_GHOST} onClick={addItem}>{t("risk.add")}</button>
                <button type="button" className={BTN_PRIMARY} onClick={saveList} disabled={listPending}>
                  {listPending ? t("common.saving") : t("risk.saveList")}
                </button>
              </div>
            </div>
          ) : null}
          <p role="status" aria-live="polite" className="m-0 mt-2 text-xs font-semibold text-green">{listMsg}</p>

          <div className={`mt-4 rounded-[16px] px-5 py-4 ${LEVEL_STYLE[level]}`} role="status" aria-live="polite">
            <div className="text-xs font-bold uppercase tracking-wide">
              {t("risk.heading", { n: tickedCount, unit: tickedCount === 1 ? t("risk.factor") : t("risk.factors") })}
            </div>
            <div className="text-4xl font-extrabold leading-tight tracking-tight">{t(`risk.level.${level}` as const)}</div>
            <div className="text-[13px]">{t(`risk.note.${level}` as const)}</div>
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-3.5">
          <Accordion title={props.specificTitle}>
            <ul className="m-0 list-disc pl-5 leading-7">
              {props.specificPoints.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Accordion>
          {props.aside}
          <Accordion title={t("risk.why")}>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {settings.riskReasons.map((r) => (
                <li key={r.label}>
                  <strong className="block text-navy">{r.label}</strong>
                  {r.detail}
                </li>
              ))}
            </ul>
            <p className="m-0 mt-3 text-xs text-muted-2">
              {t("risk.disclose")}
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
