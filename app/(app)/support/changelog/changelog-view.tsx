"use client";

import { useState } from "react";
import { CHANGELOG, type ChangeKind } from "@/lib/changelog";

type Filter = "all" | ChangeKind;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "improved", label: "Improved" },
  { key: "fixed", label: "Fixed" },
];

const CHIP: Record<ChangeKind, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-success-bg text-green" },
  improved: { label: "Improved", cls: "bg-info-blue-bg text-info-blue-text" },
  fixed: { label: "Fixed", cls: "bg-warn-gold-bg text-warn-gold-text" },
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ChangelogView() {
  const [filter, setFilter] = useState<Filter>("all");

  const entries = CHANGELOG.map((e) => ({
    ...e,
    items: filter === "all" ? e.items : e.items.filter((i) => i.kind === filter),
  }));
  const visible = entries.filter((e) => e.items.length > 0);

  return (
    <div>
      <div className="sticky top-0 z-20 lg:static border-b border-sand bg-white/85 backdrop-blur-md px-5 py-4 lg:bg-white lg:backdrop-blur-none lg:px-[30px] lg:py-5">
        <div className="text-[22px] font-extrabold tracking-[-0.02em] text-navy">Changelog</div>
        <div className="mt-[3px] text-[13px] font-medium text-muted">
          What&apos;s new in the CRM, written for agents
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={
                filter === f.key
                  ? "rounded-full border border-brand bg-brand px-3.5 py-1.5 text-[12px] font-semibold text-white"
                  : "rounded-full border border-sand bg-white px-3.5 py-1.5 text-[12px] font-semibold text-muted-2 hover:border-sand-2 hover:text-navy"
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 lg:px-[30px] lg:py-6">
        {visible.length === 0 ? (
          <div className="rounded-card border border-sand bg-white p-6 text-center text-[13px] text-muted">
            Nothing to show for this filter.
          </div>
        ) : (
          <ol className="relative max-w-[760px] border-l-2 border-sand pl-5 lg:pl-7">
            {visible.map((entry) => {
              const isLatest = entry.date === CHANGELOG[0].date;
              return (
                <li key={entry.date} className="relative pb-7 last:pb-0">
                  <span
                    className={`absolute top-[5px] -left-[27px] h-3 w-3 rounded-full border-2 border-white lg:-left-[35px] ${
                      isLatest ? "bg-gold" : "bg-sand-2"
                    }`}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11.5px] font-semibold tracking-wide text-muted uppercase">
                      {formatDate(entry.date)}
                    </span>
                    {isLatest && (
                      <span className="rounded-full bg-gold px-2 py-[2px] text-[10px] font-bold text-navy">Latest</span>
                    )}
                  </div>
                  <div className="mt-1 text-[16px] font-bold text-navy">{entry.title}</div>
                  <ul className="mt-3 flex flex-col gap-2 rounded-card border border-sand bg-white p-4 shadow-card">
                    {entry.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span
                          className={`mt-[2px] w-[62px] flex-none rounded-full px-2 py-[2px] text-center text-[10px] font-bold ${CHIP[item.kind].cls}`}
                        >
                          {CHIP[item.kind].label}
                        </span>
                        <span className="text-[13px] leading-[1.5] text-navy">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
