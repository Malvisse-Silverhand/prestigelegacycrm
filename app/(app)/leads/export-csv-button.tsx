"use client";

import { useState } from "react";
import { malaysiaDateTime } from "@/lib/malaysia-date";
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
    malaysiaDateTime(l.created_at),
    l.status,
    l.profiles?.full_name ?? "",
    l.follow_up_date ?? "",
  ]);
  return [header, ...rows].map((r) => r.map(toCsvCell).join(",")).join("\n");
}

// Exports every lead matching the current filters, not just the page on
// screen -- the list on screen is capped to PAGE_SIZE (see data.ts), so this
// re-queries without pagination via the exportLeads server action.
//
// A file full of names, phone numbers and other personal details is easy to
// hand to the wrong person by accident once it's sitting in Downloads, so
// producing one asks first rather than starting the moment the button is
// tapped.
export function ExportCsvButton({
  total,
  variant = "header",
}: {
  /** How many leads the current filters match -- shown in the confirmation. */
  total: number;
  /** "bottom" is the same action, styled to sit at the end of a mobile list
   *  rather than crowded into the page header. */
  variant?: "header" | "bottom";
}) {
  const searchParams = useSearchParams();
  const [confirming, setConfirming] = useState(false);
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
      setConfirming(false);
    } catch {
      setError("Couldn't connect. Check your internet connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const triggerClass =
    variant === "bottom"
      ? "press flex w-full items-center justify-center gap-2 rounded-[11px] border border-sand-2 bg-white px-4 py-3 text-[13px] font-semibold text-navy"
      : "press flex items-center gap-2 rounded-[11px] border border-sand-2 bg-cream px-3 py-2 text-[12.5px] font-semibold text-navy disabled:opacity-60 lg:px-4 lg:py-2.5 lg:text-[13px]";

  const icon = (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M12 3v12M7 12l5 5 5-5M4 21h16" />
    </svg>
  );

  return (
    <div className={variant === "bottom" ? "flex flex-col gap-1.5" : "flex flex-col items-end gap-1.5"}>
      <button type="button" onClick={() => setConfirming(true)} className={triggerClass}>
        {icon}
        Export to CSV
      </button>

      {confirming && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-[15px] font-bold text-navy">
              Export {total} lead{total === 1 ? "" : "s"} to CSV?
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              The file includes names, phone numbers and other personal details for everyone currently matching your
              filters. Once it&apos;s downloaded it&apos;s on this device to keep safe -- only share it with people
              who should have it.
            </p>
            {error && (
              <div className="mt-3 rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
                {error}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={handleExport}
                className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Exporting…" : "Export"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
