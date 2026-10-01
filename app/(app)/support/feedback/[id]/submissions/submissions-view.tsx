"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { FeedbackAnswer, FeedbackField, FormRow } from "../../constants";
import { SMALL_BTN, StatusChip } from "../../feedback-chips";
import type { SubmissionRow } from "../../data";

const SELECT =
  "h-9 rounded-[10px] border border-sand-2 bg-white px-2.5 text-[12px] font-semibold text-navy outline-none focus:border-gold";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kuala_Lumpur",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : DATE_FMT.format(d);
}

function display(v: FeedbackAnswer | undefined): string {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function csvCell(text: string) {
  // Guard against spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function SubmissionsView({
  form,
  rows,
  truncated,
}: {
  form: FormRow;
  rows: SubmissionRow[];
  truncated: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [confirmExport, setConfirmExport] = useState(false);

  const knownIds = useMemo(() => new Set(form.fields.map((f) => f.id)), [form.fields]);
  const dropdowns = useMemo(() => form.fields.filter((f) => f.type === "dropdown"), [form.fields]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      for (const [id, want] of Object.entries(filters)) {
        if (want && display(r.answers[id]) !== want) return false;
      }
      if (!q) return true;
      const hay = [r.name, ...Object.values(r.answers).map((v) => display(v))].join(" \n ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, filters]);

  const summaries = useMemo(
    () =>
      form.fields
        .filter((f) => f.type === "dropdown" || f.type === "rating")
        .map((f) => {
          if (f.type === "rating") {
            const nums = filtered.map((r) => r.answers[f.id]).filter((v): v is number => typeof v === "number");
            const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
            return { field: f, kind: "rating" as const, avg, total: nums.length, counts: [] as [string, number][] };
          }
          const tally = new Map<string, number>();
          for (const r of filtered) {
            const v = display(r.answers[f.id]);
            if (v) tally.set(v, (tally.get(v) ?? 0) + 1);
          }
          const counts = [...tally.entries()].sort((a, b) => b[1] - a[1]);
          return { field: f, kind: "dropdown" as const, avg: 0, total: counts.reduce((a, [, n]) => a + n, 0), counts };
        }),
    [form.fields, filtered],
  );

  function otherAnswers(r: SubmissionRow) {
    return Object.entries(r.answers).filter(([k]) => !knownIds.has(k));
  }

  function download() {
    const header = [
      "Submitted at",
      "Name",
      "Role",
      "Page",
      ...form.fields.map((f) => f.label),
      "Other answers",
    ];
    const lines = [header.map(csvCell).join(",")];
    for (const r of filtered) {
      const other = otherAnswers(r)
        .map(([k, v]) => `${k}: ${display(v)}`)
        .join(" | ");
      lines.push(
        [formatDate(r.createdAt), r.name, r.roleLabel, r.pageUrl ?? "", ...form.fields.map((f) => display(r.answers[f.id])), other]
          .map(csvCell)
          .join(","),
      );
    }
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-${form.slug}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setConfirmExport(false);
  }

  return (
    <div>
      <div className="sticky top-0 z-20 lg:static flex items-center gap-3.5 border-b border-sand bg-white/85 backdrop-blur-md px-5 py-4 lg:bg-white lg:backdrop-blur-none lg:px-[30px] lg:py-5">
        <div className="min-w-0 flex-1">
          <Link href="/support/feedback" className="text-[12px] font-semibold text-taupe hover:text-navy">
            &larr; All forms
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <div className="text-2xl font-extrabold tracking-[-0.025em] text-navy">{form.title}</div>
            <StatusChip open={form.isOpen} />
          </div>
          <div className="mt-0.5 text-[13px] font-medium text-muted">
            {filtered.length === rows.length
              ? `${rows.length} ${rows.length === 1 ? "submission" : "submissions"}`
              : `${filtered.length} of ${rows.length} submissions`}
          </div>
        </div>
        <button
          type="button"
          disabled={filtered.length === 0}
          onClick={() => setConfirmExport(true)}
          className="flex-none rounded-[10px] border border-brand bg-brand px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      <div className="flex flex-col gap-3.5 px-5 py-[22px] pb-[30px] lg:px-[30px]">
        {truncated && (
          <div className="rounded-[10px] bg-warn-gold-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-warn-gold-text">
            Showing the newest 2,000 submissions only.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or answers"
            aria-label="Search submissions"
            className="h-9 min-w-[200px] flex-1 rounded-[10px] border border-sand-2 bg-white px-3 text-[12.5px] font-medium text-navy outline-none focus:border-gold"
          />
          {dropdowns.map((f) => (
            <select
              key={f.id}
              aria-label={`Filter by ${f.label}`}
              value={filters[f.id] ?? ""}
              onChange={(e) => setFilters((cur) => ({ ...cur, [f.id]: e.target.value }))}
              className={`${SELECT} max-w-[220px]`}
            >
              <option value="">{f.label}: all</option>
              {(f.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ))}
          {(search || Object.values(filters).some(Boolean)) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilters({});
              }}
              className={SMALL_BTN}
            >
              Clear
            </button>
          )}
        </div>

        {summaries.length > 0 && rows.length > 0 && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {summaries.map((s) => (
              <SummaryCard key={s.field.id} field={s.field} kind={s.kind} avg={s.avg} total={s.total} counts={s.counts} />
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-sand-2 bg-cream px-4 py-8 text-center text-[12.5px] font-medium text-muted">
            {rows.length === 0 ? "No submissions yet." : "No submissions match your filters."}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {filtered.map((r) => {
            const other = otherAnswers(r);
            return (
              <article key={r.id} className="rounded-2xl border border-sand bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <div className="text-[13.5px] font-bold text-navy">
                    {r.name}
                    {r.roleLabel && <span className="ml-1.5 text-[11.5px] font-semibold text-taupe">{r.roleLabel}</span>}
                  </div>
                  <div className="text-[11.5px] font-semibold text-taupe">{formatDate(r.createdAt)}</div>
                </div>
                <dl className="mt-3 flex flex-col gap-2.5">
                  {form.fields.map((f) => {
                    const text = display(r.answers[f.id]);
                    if (!text) return null;
                    return (
                      <div key={f.id}>
                        <dt className="text-[11.5px] font-bold text-muted">{f.label}</dt>
                        <dd className="mt-0.5 whitespace-pre-line break-words text-[13px] font-medium text-navy">
                          {f.type === "rating" ? `${text} / 5` : text}
                        </dd>
                      </div>
                    );
                  })}
                  {other.length > 0 && (
                    <div className="rounded-[10px] bg-cream px-3 py-2">
                      <dt className="text-[11.5px] font-bold text-muted">Other answers</dt>
                      {other.map(([k, v]) => (
                        <dd key={k} className="mt-0.5 whitespace-pre-line break-words text-[12.5px] font-medium text-navy">
                          <span className="text-taupe">{k}:</span> {display(v)}
                        </dd>
                      ))}
                    </div>
                  )}
                </dl>
                {r.pageUrl && (
                  <div className="mt-3 break-all border-t border-sand pt-2 text-[11.5px] font-medium text-taupe">
                    From: {r.pageUrl}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {confirmExport && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/55 p-4" onClick={() => setConfirmExport(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[380px] rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-[16px] font-bold text-navy">Export these submissions?</div>
            <p className="mt-2 text-[13px] font-medium text-muted">
              This downloads {filtered.length} {filtered.length === 1 ? "submission" : "submissions"} as a CSV file,
              including staff names. Keep the file safe and don&apos;t share it outside the agency.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button type="button" onClick={() => setConfirmExport(false)} className={SMALL_BTN}>
                Cancel
              </button>
              <button
                type="button"
                onClick={download}
                className="rounded-[8px] border border-brand bg-brand px-3.5 py-1.5 text-[12px] font-semibold text-white"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  field,
  kind,
  avg,
  total,
  counts,
}: {
  field: FeedbackField;
  kind: "rating" | "dropdown";
  avg: number;
  total: number;
  counts: [string, number][];
}) {
  const top = counts[0]?.[1] ?? 1;
  return (
    <section className="rounded-2xl border border-sand bg-white p-4">
      <div className="text-[12px] font-bold text-navy">{field.label}</div>
      {kind === "rating" ? (
        <div className="mt-2 text-[13px] font-medium text-muted">
          {total === 0 ? (
            "No ratings yet."
          ) : (
            <>
              <span className="text-[20px] font-extrabold text-navy">{avg.toFixed(1)}</span> / 5 average from {total}{" "}
              {total === 1 ? "rating" : "ratings"}
            </>
          )}
        </div>
      ) : counts.length === 0 ? (
        <div className="mt-2 text-[12.5px] font-medium text-muted">No answers yet.</div>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {counts.map(([label, n]) => (
            <li key={label}>
              <div className="flex items-baseline justify-between gap-3 text-[12px] font-medium text-navy">
                <span className="min-w-0 break-words">{label}</span>
                <span className="flex-none font-bold">{n}</span>
              </div>
              <div className="mt-0.5 h-1.5 rounded-full bg-cream">
                <div className="h-1.5 rounded-full bg-brand" style={{ width: `${Math.max(4, (n / top) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
