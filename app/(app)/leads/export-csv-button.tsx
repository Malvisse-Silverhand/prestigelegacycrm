"use client";

import type { LeadRow } from "./data";

function toCsvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function ExportCsvButton({ leads }: { leads: LeadRow[] }) {
  function handleExport() {
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
    const csv = [header, ...rows].map((r) => r.map(toCsvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="flex items-center gap-2 rounded-[11px] border border-sand-2 bg-cream px-4 py-2.5 text-[13px] font-semibold text-navy"
    >
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M12 3v12M7 12l5 5 5-5M4 21h16" />
      </svg>
      Export to CSV
    </button>
  );
}
