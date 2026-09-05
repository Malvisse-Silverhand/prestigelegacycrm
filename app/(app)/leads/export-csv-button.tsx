"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { exportLeads } from "./actions";
import type { LeadRow } from "./data";

function toCsvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function buildCsv(leads: LeadRow[]) {
  const header = ["Name", "Phone", "Date of Birth", "State", "Occupation", "Created", "Status", "Agent", "FU Date"];
  const rows = leads.map((l) => [
    l.full_name,
    l.phone,
    l.date_of_birth ?? "",
    l.state ?? "",
    l.occupation ?? "",
    new Date(l.created_at).toLocaleString("en-MY"),
    l.status,
    l.profiles?.full_name ?? "",
    l.follow_up_date ?? "",
  ]);
  return [header, ...rows].map((r) => r.map(toCsvCell).join(",")).join("\n");
}

// Exports every lead matching the current filters, not just the page on
// screen -- the list on screen is capped to PAGE_SIZE (see data.ts), so this
// re-queries without pagination via the exportLeads server action.
export function ExportCsvButton() {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setPending(true);
    setError(null);
    try {
      const result = await exportLeads({
        q: searchParams.get("q") ?? undefined,
        from: searchParams.get("from") ?? undefined,
        to: searchParams.get("to") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        agent: searchParams.get("agent") ?? undefined,
        view: searchParams.get("view") ?? undefined,
      });
      if (result.error || !result.leads) {
        setError(result.error ?? "Couldn't export leads. Please try again.");
        return;
      }
      const csv = buildCsv(result.leads);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't connect. Check your internet connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleExport}
        disabled={pending}
        className="flex items-center gap-2 rounded-[11px] border border-sand-2 bg-cream px-4 py-2.5 text-[13px] font-semibold text-navy disabled:opacity-60"
      >
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M12 3v12M7 12l5 5 5-5M4 21h16" />
        </svg>
        {pending ? "Exporting…" : "Export to CSV"}
      </button>
      {error && <div className="text-[11.5px] font-medium text-alert-red">{error}</div>}
    </div>
  );
}
