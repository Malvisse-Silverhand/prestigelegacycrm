"use client";

import { useMemo, useState, useTransition } from "react";
import {
  LIMITS,
  ROADMAP_STATUSES,
  STATUS_HINT,
  STATUS_LABEL,
  type RoadmapInput,
  type RoadmapItem,
  type RoadmapStatus,
} from "./constants";
import { createRoadmapItem, deleteRoadmapItem, moveRoadmapItem, setRoadmapStatus, updateRoadmapItem } from "./actions";

const FIELD =
  "mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-white px-3.5 text-[13px] font-medium text-navy outline-none focus:border-gold";
const LABEL = "text-[12px] font-semibold text-navy";
const CHIP = "inline-flex flex-none items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-bold";
const SMALL_BTN =
  "rounded-[8px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-navy disabled:opacity-40";

const STATUS_STYLE: Record<RoadmapStatus, string> = {
  shipped: "bg-success-bg text-green",
  in_progress: "bg-warn-gold-bg text-warn-gold-text",
  planned: "bg-info-blue-bg text-info-blue-text",
  exploring: "bg-cream text-taupe",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function emptyDraft(status: RoadmapStatus): RoadmapInput {
  return { title: "", description: "", area: "", status, target: "", shippedOn: "" };
}

type Editing = { id: string | null; draft: RoadmapInput };

export function RoadmapView({ items, isAdmin }: { items: RoadmapItem[]; isAdmin: boolean }) {
  const [tab, setTab] = useState<RoadmapStatus>("in_progress");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<RoadmapItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const columns = useMemo(() => {
    const out: Record<RoadmapStatus, RoadmapItem[]> = { shipped: [], in_progress: [], planned: [], exploring: [] };
    for (const it of items) out[it.status].push(it);
    // Items arrive ordered by sort_order; shipped reads newest first.
    out.shipped.sort((a, b) => (b.shippedOn ?? "").localeCompare(a.shippedOn ?? "") || a.sortOrder - b.sortOrder);
    return out;
  }, [items]);

  function run(fn: () => Promise<{ error: string | null }>, after?: () => void) {
    setNotice(null);
    startTransition(async () => {
      try {
        const res = await fn();
        if (res.error) setNotice(res.error);
        else after?.();
      } catch {
        setNotice("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div>
      <div className="sticky top-0 z-20 lg:static flex items-center gap-3.5 border-b border-sand bg-white/85 backdrop-blur-md px-5 py-4 lg:bg-white lg:backdrop-blur-none lg:px-[30px] lg:py-5">
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-extrabold tracking-[-0.025em] text-navy">Roadmap</div>
          <div className="mt-0.5 text-[13px] font-medium text-muted">
            {columns.shipped.length} shipped · {columns.in_progress.length} in progress · {columns.planned.length}{" "}
            planned
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setEditing({ id: null, draft: emptyDraft(tab) })}
            className="flex-none rounded-[10px] border border-brand bg-brand px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            Add item
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3.5 px-5 py-[22px] pb-[30px] lg:px-[30px]">
        {notice && (
          <div className="rounded-[10px] border border-alert-red/30 bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-alert-red">
            {notice}
          </div>
        )}

        <div className="-mx-5 overflow-x-auto px-5 lg:hidden">
          <div className="flex w-max rounded-[10px] border border-sand-2 bg-cream p-[3px]">
            {ROADMAP_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTab(s)}
                className={
                  tab === s
                    ? "whitespace-nowrap rounded-[8px] bg-brand px-3.5 py-[7px] text-xs font-semibold text-white"
                    : "whitespace-nowrap px-3.5 py-[7px] text-xs font-semibold text-muted"
                }
              >
                {STATUS_LABEL[s]} · {columns[s].length}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4 lg:items-start">
          {ROADMAP_STATUSES.map((s) => (
            <section key={s} className={`${tab === s ? "block" : "hidden"} min-w-0 lg:block`}>
              <div className="mb-3 hidden items-center gap-2 lg:flex">
                <span className={`${CHIP} ${STATUS_STYLE[s]}`}>{STATUS_LABEL[s]}</span>
                <span className="text-[12px] font-semibold text-muted">{columns[s].length}</span>
              </div>
              <div className="mb-3 text-[12.5px] font-medium text-muted">{STATUS_HINT[s]}</div>

              <div className="flex flex-col gap-3">
                {columns[s].length === 0 && (
                  <div className="rounded-2xl border border-dashed border-sand-2 bg-cream px-4 py-6 text-center text-[12.5px] font-medium text-muted">
                    Nothing here yet.
                  </div>
                )}
                {columns[s].map((it, i) => (
                  <ItemCard
                    key={it.id}
                    item={it}
                    isAdmin={isAdmin}
                    pending={pending}
                    canMoveUp={s !== "shipped" && i > 0}
                    canMoveDown={s !== "shipped" && i < columns[s].length - 1}
                    onMove={(dir) => run(() => moveRoadmapItem(it.id, dir))}
                    onStatus={(next) => run(() => setRoadmapStatus(it.id, next))}
                    onEdit={() =>
                      setEditing({
                        id: it.id,
                        draft: {
                          title: it.title,
                          description: it.description ?? "",
                          area: it.area ?? "",
                          status: it.status,
                          target: it.target ?? "",
                          shippedOn: it.shippedOn ?? "",
                        },
                      })
                    }
                    onDelete={() => setDeleting(it)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {editing && isAdmin && (
        <ItemDialog
          editing={editing}
          onClose={() => setEditing(null)}
          onSave={(draft) =>
            editing.id ? updateRoadmapItem(editing.id, draft) : createRoadmapItem(draft)
          }
        />
      )}

      {deleting && isAdmin && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/55 p-4" onClick={() => setDeleting(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[380px] rounded-2xl bg-white p-6 shadow-elevated"
          >
            <div className="text-[16px] font-bold text-navy">Delete this item?</div>
            <p className="mt-2 text-[13px] font-medium text-muted">
              &ldquo;{deleting.title}&rdquo; will be removed from the roadmap. This can&apos;t be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button type="button" onClick={() => setDeleting(null)} className={SMALL_BTN}>
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteRoadmapItem(deleting.id), () => setDeleting(null))}
                className="rounded-[8px] border border-alert-red bg-alert-red px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item,
  isAdmin,
  pending,
  canMoveUp,
  canMoveDown,
  onMove,
  onStatus,
  onEdit,
  onDelete,
}: {
  item: RoadmapItem;
  isAdmin: boolean;
  pending: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (dir: "up" | "down") => void;
  onStatus: (s: RoadmapStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const when = item.status === "shipped" ? formatDate(item.shippedOn) : item.target;
  return (
    <article className="rounded-2xl border border-sand bg-white p-4">
      <div className="text-[14px] font-bold leading-snug text-navy">{item.title}</div>
      {item.description && (
        <p className="mt-1.5 whitespace-pre-line text-[12.5px] font-medium leading-relaxed text-muted">
          {item.description}
        </p>
      )}
      {(item.area || when) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.area && <span className={`${CHIP} border border-sand-2 bg-white text-muted`}>{item.area}</span>}
          {when && (
            <span className="text-[11.5px] font-semibold text-taupe">
              {item.status === "shipped" ? `Shipped ${when}` : `Target ${when}`}
            </span>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-sand pt-3">
          <select
            aria-label="Change status"
            value={item.status}
            disabled={pending}
            onChange={(e) => onStatus(e.target.value as RoadmapStatus)}
            className="h-8 rounded-[8px] border border-sand-2 bg-white px-2 text-[11.5px] font-semibold text-navy disabled:opacity-50"
          >
            {ROADMAP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          {item.status !== "shipped" && (
            <>
              <button
                type="button"
                aria-label="Move up"
                disabled={pending || !canMoveUp}
                onClick={() => onMove("up")}
                className={SMALL_BTN}
              >
                Up
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={pending || !canMoveDown}
                onClick={() => onMove("down")}
                className={SMALL_BTN}
              >
                Down
              </button>
            </>
          )}
          <button type="button" onClick={onEdit} className={SMALL_BTN}>
            Edit
          </button>
          <button type="button" onClick={onDelete} className={`${SMALL_BTN} text-alert-red`}>
            Delete
          </button>
        </div>
      )}
    </article>
  );
}

function ItemDialog({
  editing,
  onClose,
  onSave,
}: {
  editing: Editing;
  onClose: () => void;
  onSave: (draft: RoadmapInput) => Promise<{ error: string | null }>;
}) {
  const [form, setForm] = useState<RoadmapInput>(editing.draft);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await onSave(form);
        if (res.error) setError(res.error);
        else onClose();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/55 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-2xl bg-white p-6 shadow-elevated"
      >
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-bold text-navy">{editing.id ? "Edit item" : "Add item"}</div>
          <button type="button" onClick={onClose} className="text-[12.5px] font-semibold text-muted hover:text-navy">
            Close
          </button>
        </div>

        <div className="mt-4 border-t border-sand pt-4">
          <label className="block">
            <span className={LABEL}>Title</span>
            <input
              required
              minLength={2}
              maxLength={LIMITS.title}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={FIELD}
            />
          </label>

          <label className="mt-3.5 block">
            <span className={LABEL}>Description</span>
            <textarea
              rows={4}
              maxLength={LIMITS.description}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3.5 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
            />
          </label>

          <div className="mt-3.5 grid grid-cols-2 gap-3">
            <label className="block">
              <span className={LABEL}>Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as RoadmapStatus })}
                className={FIELD}
              >
                {ROADMAP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={LABEL}>Area</span>
              <input
                maxLength={LIMITS.area}
                placeholder="e.g. Leads"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className={FIELD}
              />
            </label>
          </div>

          <div className="mt-3.5">
            {form.status === "shipped" ? (
              <label className="block">
                <span className={LABEL}>Shipped on</span>
                <input
                  type="date"
                  value={form.shippedOn}
                  onChange={(e) => setForm({ ...form, shippedOn: e.target.value })}
                  className={FIELD}
                />
              </label>
            ) : (
              <label className="block">
                <span className={LABEL}>Target</span>
                <input
                  maxLength={LIMITS.target}
                  placeholder="e.g. Q4 2026"
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  className={FIELD}
                />
              </label>
            )}
          </div>

          {error && (
            <div className="mt-3.5 rounded-[10px] border border-alert-red/30 bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-alert-red">
              {error}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2.5">
            <button type="button" onClick={onClose} className={SMALL_BTN}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-[10px] border border-brand bg-brand px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
