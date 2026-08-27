"use client";

import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { SearchIcon, ChevronDownIcon } from "@/components/icons";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
  { value: "unassigned", label: "Unassigned" },
  { value: "closed", label: "Closed" },
];

export function LeadFiltersBar({
  agents,
  showAgentFilter,
}: {
  agents: { id: string; full_name: string }[];
  showAgentFilter: boolean;
}) {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action="/leads"
      method="get"
      className="flex flex-wrap items-center gap-2.5 bg-cream px-[30px] py-[18px]"
    >
      <div className="flex flex-1 min-w-[200px] items-center gap-2.5 rounded-[11px] border border-sand-2 bg-white px-3.5 py-[11px]">
        <SearchIcon width={16} height={16} className="text-taupe" />
        <input
          name="q"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder="Search name, phone or lead source…"
          className="flex-1 bg-transparent text-[13px] font-medium text-navy outline-none placeholder:text-taupe"
        />
      </div>

      <span className="text-[12.5px] font-semibold text-ink">From</span>
      <input
        type="date"
        name="from"
        defaultValue={searchParams.get("from") ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-[11px] border border-sand-2 bg-white px-3 py-[11px] text-[12.5px] font-medium text-navy"
      />
      <span className="text-[12.5px] font-semibold text-ink">To</span>
      <input
        type="date"
        name="to"
        defaultValue={searchParams.get("to") ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-[11px] border border-sand-2 bg-white px-3 py-[11px] text-[12.5px] font-medium text-navy"
      />

      <div className="relative">
        <select
          name="status"
          defaultValue={searchParams.get("status") ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className="appearance-none rounded-[11px] border border-sand-2 bg-white py-[11px] pr-9 pl-3.5 text-[12.5px] font-semibold text-navy"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon width={13} height={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy" />
      </div>

      {showAgentFilter && (
        <div className="relative">
          <select
            name="agent"
            defaultValue={searchParams.get("agent") ?? ""}
            onChange={() => formRef.current?.requestSubmit()}
            className="appearance-none rounded-[11px] border border-sand-2 bg-white py-[11px] pr-9 pl-3.5 text-[12.5px] font-semibold text-navy"
          >
            <option value="">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </select>
          <ChevronDownIcon width={13} height={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy" />
        </div>
      )}
    </form>
  );
}
