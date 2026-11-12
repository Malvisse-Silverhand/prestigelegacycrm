"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  attachPracticeStoryboard,
  deletePracticeStoryboard,
  renamePracticeStoryboard,
  searchOwnLeads,
  type OwnLead,
} from "@/app/(app)/storyboards/practice-actions";
import { moduleName } from "@/lib/storyboard/modules";
import { PRACTICE_TITLE_MAX } from "@/lib/storyboard/practice";
import type { StoryboardModule } from "@/lib/storyboard/types";
import { useT } from "../lang-context";
import { BTN_GHOST, BTN_PRIMARY } from "../hibah/fields";
import { Modal } from "./modal";

type Props = {
  id: string;
  module: StoryboardModule;
  /** Current title, or null when untitled. */
  title: string | null;
  /** Show an Open link (the hub list does; the session page itself does not). */
  showOpen?: boolean;
  /** Where to go after deleting (default: refresh in place). */
  afterDeleteHref?: string;
};

const DANGER =
  "inline-flex min-h-11 items-center justify-center rounded-[12px] bg-alert-red px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alert-red disabled:cursor-not-allowed disabled:opacity-60";
const FIELD =
  "min-h-11 w-full rounded-[10px] border border-sand-2 bg-white px-3 text-sm text-navy focus-visible:outline-2 focus-visible:outline-brand";

type Dlg = "rename" | "attach" | "delete" | null;

/** Open / Rename / Attach to lead / Delete for one practice session (owner only). */
export function PracticeActions({ id, module, title, showOpen = false, afterDeleteHref }: Props) {
  const router = useRouter();
  const { t, lang } = useT();
  const [dlg, setDlg] = useState<Dlg>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const name = title ?? t("practice.untitled");

  // rename
  const [draft, setDraft] = useState(title ?? "");
  // attach
  const [q, setQ] = useState("");
  const [leads, setLeads] = useState<OwnLead[]>([]);
  const [searching, setSearching] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);

  function open(d: Exclude<Dlg, null>) {
    setError(null);
    setDraft(title ?? "");
    setQ("");
    setChosen(null);
    setDlg(d);
  }
  const close = () => setDlg(null);

  // Debounced lead search while the attach dialog is open.
  useEffect(() => {
    if (dlg !== "attach") return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchOwnLeads({ q });
        if (cancelled) return;
        setLeads(res.leads);
        if (res.error) setError(res.error);
      } catch {
        if (!cancelled) setError(t("common.connectError"));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dlg, q, t]);

  function rename() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await renamePracticeStoryboard({ id, title: draft, lang });
        if (res.error) return setError(res.error);
        close();
        router.refresh();
      } catch {
        setError(t("common.connectError"));
      }
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await deletePracticeStoryboard({ id, lang });
        if (res.error) return setError(res.error);
        close();
        if (afterDeleteHref) router.push(afterDeleteHref);
        else router.refresh();
      } catch {
        setError(t("common.connectError"));
      }
    });
  }

  function attach() {
    if (!chosen) return setError(t("practice.attachPick"));
    setError(null);
    startTransition(async () => {
      try {
        const res = await attachPracticeStoryboard({ id, leadId: chosen, lang });
        if (res.error || !res.url) return setError(res.error ?? t("practice.err.attachFailed"));
        close();
        router.push(res.url);
      } catch {
        setError(t("common.connectError"));
      }
    });
  }

  const err = error ? (
    <p role="alert" className="m-0 text-sm font-semibold text-alert-red">
      {error}
    </p>
  ) : null;

  return (
    <div className="flex flex-wrap gap-2">
      {showOpen ? (
        <a href={`/storyboards/practice/${id}/fill`} aria-label={`${t("practice.open")}: ${name}`} className={BTN_PRIMARY}>
          {t("practice.open")}
        </a>
      ) : null}
      <button type="button" className={BTN_GHOST} aria-label={`${t("practice.rename")}: ${name}`} onClick={() => open("rename")}>
        {t("practice.rename")}
      </button>
      <button type="button" className={BTN_GHOST} aria-label={`${t("practice.attach")}: ${name}`} onClick={() => open("attach")}>
        {t("practice.attach")}
      </button>
      <button type="button" className={BTN_GHOST} aria-label={`${t("practice.delete")}: ${name}`} onClick={() => open("delete")}>
        {t("practice.delete")}
      </button>

      <Modal open={dlg === "rename"} onClose={close} title={t("practice.renameTitle")} titleId={`pr-rename-${id}`}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            rename();
          }}
        >
          <label htmlFor={`pr-name-${id}`} className="text-xs font-semibold text-navy">
            {t("practice.renameLabel")}
          </label>
          <input
            id={`pr-name-${id}`}
            value={draft}
            maxLength={PRACTICE_TITLE_MAX}
            onChange={(e) => setDraft(e.target.value)}
            className={FIELD}
            autoFocus
          />
          {err}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={BTN_GHOST} onClick={close}>
              {t("practice.cancel")}
            </button>
            <button type="submit" className={BTN_PRIMARY} disabled={pending}>
              {pending ? t("practice.saving") : t("practice.renameSave")}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={dlg === "attach"} onClose={close} title={t("practice.attachTitle")} titleId={`pr-attach-${id}`}>
        <p className="m-0 text-sm text-ink">{t("practice.attachBody", { module: moduleName(module, lang) })}</p>
        <label htmlFor={`pr-q-${id}`} className="text-xs font-semibold text-navy">
          {t("practice.attachSearch")}
        </label>
        <input
          id={`pr-q-${id}`}
          type="search"
          value={q}
          maxLength={60}
          onChange={(e) => setQ(e.target.value)}
          className={FIELD}
          autoFocus
        />
        <fieldset className="m-0 max-h-56 overflow-y-auto rounded-[12px] border border-sand p-2">
          <legend className="px-1 text-xs font-semibold text-muted-2">{t("practice.attachLegend")}</legend>
          <p role="status" aria-live="polite" className="m-0 px-1 text-xs text-muted-2">
            {searching ? t("practice.attachSearching") : leads.length === 0 ? t("practice.attachNone") : ""}
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {leads.map((l) => (
              <li key={l.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-2 text-sm text-navy hover:bg-sand-3">
                  <input type="radio" name={`pr-lead-${id}`} checked={chosen === l.id} onChange={() => setChosen(l.id)} />
                  <span className="font-semibold">{l.name}</span>
                  {l.leadNo != null ? <span className="text-xs text-muted-2">{t("practice.leadNo", { no: l.leadNo })}</span> : null}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        {err}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={BTN_GHOST} onClick={close}>
            {t("practice.cancel")}
          </button>
          <button type="button" className={BTN_PRIMARY} disabled={pending} onClick={attach}>
            {pending ? t("practice.attaching") : t("practice.attachConfirm")}
          </button>
        </div>
      </Modal>

      <Modal open={dlg === "delete"} onClose={close} title={t("practice.deleteTitle")} titleId={`pr-delete-${id}`}>
        <p className="m-0 text-sm text-ink">{t("practice.deleteBody", { name })}</p>
        {err}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={BTN_GHOST} onClick={close} autoFocus>
            {t("practice.cancel")}
          </button>
          <button type="button" className={DANGER} disabled={pending} onClick={remove}>
            {pending ? t("practice.deleting") : t("practice.deleteConfirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
