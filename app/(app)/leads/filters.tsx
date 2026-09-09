"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SearchIcon, ChevronDownIcon } from "@/components/icons";
import { LEAD_VIEWS, isLeadView } from "./views";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
  { value: "unassigned", label: "Unassigned" },
  { value: "closed", label: "Closed" },
];

const selectClass =
  "w-full lg:w-auto appearance-none rounded-[10px] border border-sand-2 bg-white py-2 pr-8 pl-3 text-[12.5px] font-semibold text-navy lg:py-[11px] lg:pr-9 lg:pl-3.5";
const dateClass =
  "w-full lg:w-auto rounded-[10px] border border-sand-2 bg-white px-2.5 py-2 text-[12.5px] font-medium text-navy lg:px-3 lg:py-[11px]";

export function LeadFiltersBar({
  agents,
  showAgentFilter,
}: {
  agents: { id: string; full_name: string }[];
  showAgentFilter: boolean;
}) {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const view = searchParams.get("view") ?? undefined;

  // On a phone the four extra controls stacked to roughly a full screen before
  // a single lead was visible. They collapse behind a Filters button instead,
  // which also states how many are in play so a narrowed list is never a
  // mystery. Desktop has the width, so it keeps everything inline.
  const activeCount = (["from", "to", "status", "agent"] as const).filter((k) => searchParams.get(k)).length;
  const [open, setOpen] = useState(activeCount > 0);

  // Everything except `view`, so the chip's × clears just that.
  const withoutView = new URLSearchParams(searchParams.toString());
  withoutView.delete("view");
  withoutView.delete("page");

  return (
    <form
      ref={formRef}
      action="/leads"
      method="get"
      className="bg-cream px-5 py-3 lg:flex lg:flex-wrap lg:items-center lg:gap-2.5 lg:px-[30px] lg:py-[18px]"
    >
      <div className="flex flex-wrap items-center gap-2 lg:contents">
        {/* Arrived from a Dashboard alert card. Carried as a hidden field so
            changing another filter narrows the view instead of dropping it. */}
        {isLeadView(view) && (
          <>
            <input type="hidden" name="view" value={view} />
            <span className="flex items-center gap-1.5 rounded-[10px] border border-navy bg-navy px-2.5 py-2 text-[12px] font-semibold text-white lg:rounded-[11px] lg:px-3 lg:py-[9px] lg:text-[12.5px]">
              {LEAD_VIEWS[view]}
              <Link
                href={`/leads${withoutView.size > 0 ? `?${withoutView}` : ""}`}
                aria-label={`Clear ${LEAD_VIEWS[view]} filter`}
                className="text-white/70 hover:text-white"
              >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </Link>
            </span>
          </>
        )}

        <div className="flex min-w-[160px] flex-1 items-center gap-2 rounded-[10px] border border-sand-2 bg-white px-3 py-2 lg:min-w-[200px] lg:gap-2.5 lg:rounded-[11px] lg:px-3.5 lg:py-[11px]">
          <SearchIcon width={15} height={15} className="flex-none text-taupe" />
          <input
            name="q"
            defaultValue={searchParams.get("q") ?? ""}
            placeholder="Search name or phone…"
            className="w-full min-w-0 bg-transparent text-[13px] font-medium text-navy outline-none placeholder:text-taupe"
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="press flex flex-none items-center gap-1.5 rounded-[10px] border border-sand-2 bg-white px-3 py-2 text-[12.5px] font-semibold text-navy lg:hidden"
        >
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-navy px-1.5 py-[1px] text-[10px] font-bold text-white">{activeCount}</span>
          )}
          <ChevronDownIcon
            width={13}
            height={13}
            className={`text-taupe transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Submit is implicit on desktop (every control auto-submits on
            change); on a phone the search field needs a real button, because
            the extra filters are applied together when the panel closes. */}
        <button
          type="submit"
          className="press flex-none rounded-[10px] bg-navy px-3.5 py-2 text-[12.5px] font-semibold text-white lg:hidden"
        >
          Search
        </button>
      </div>

      <div
        className={`${open ? "grid" : "hidden"} mt-2 grid-cols-2 gap-2 lg:mt-0 lg:contents`}
      >
        <label className="lg:contents">
          <span className="mb-1 block text-[10.5px] font-bold tracking-[0.08em] text-taupe-2 uppercase lg:hidden">
            From
          </span>
          <span className="hidden text-[12.5px] font-semibold text-ink lg:inline">From</span>
          <input
            type="date"
            name="from"
            defaultValue={searchParams.get("from") ?? ""}
            onChange={() => formRef.current?.requestSubmit()}
            className={dateClass}
          />
        </label>

        <label className="lg:contents">
          <span className="mb-1 block text-[10.5px] font-bold tracking-[0.08em] text-taupe-2 uppercase lg:hidden">
            To
          </span>
          <span className="hidden text-[12.5px] font-semibold text-ink lg:inline">To</span>
          <input
            type="date"
            name="to"
            defaultValue={searchParams.get("to") ?? ""}
            onChange={() => formRef.current?.requestSubmit()}
            className={dateClass}
          />
        </label>

        <div className="relative">
          <select
            name="status"
            aria-label="Status"
            defaultValue={searchParams.get("status") ?? ""}
            onChange={() => formRef.current?.requestSubmit()}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon width={13} height={13} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy" />
        </div>

        {showAgentFilter && (
          <div className="relative">
            <select
              name="agent"
              aria-label="Agent"
              defaultValue={searchParams.get("agent") ?? ""}
              onChange={() => formRef.current?.requestSubmit()}
              className={selectClass}
            >
              <option value="">All Agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                </option>
              ))}
            </select>
            <ChevronDownIcon width={13} height={13} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy" />
          </div>
        )}

        {activeCount > 0 && (
          <Link
            href={`/leads${isLeadView(view) ? `?view=${view}` : ""}`}
            className="press col-span-2 rounded-[10px] border border-sand-2 bg-white py-2 text-center text-[12.5px] font-semibold text-navy lg:hidden"
          >
            Clear filters
          </Link>
        )}
      </div>
    </form>
  );
}
