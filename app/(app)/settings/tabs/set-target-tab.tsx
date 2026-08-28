"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TargetRow } from "../types";
import { saveTargets } from "../actions";

function monthLabel(monthDate: string) {
  const [y, m] = monthDate.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-MY", { month: "short", year: "numeric" }).toUpperCase();
}

export function SetTargetTab({ monthDate, initialTargets }: { monthDate: string; initialTargets: TargetRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialTargets);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function updateRow(agentId: string, field: "ancTarget" | "nocTarget", value: string) {
    setSaved(false);
    const parsed = value === "" ? null : Number(value);
    setRows((prev) => prev.map((r) => (r.agentId === agentId ? { ...r, [field]: parsed } : r)));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveTargets(
          monthDate,
          rows.map((r) => ({ agentId: r.agentId, ancTarget: r.ancTarget, nocTarget: r.nocTarget })),
        );
        if (result.error) {
          setError(result.error);
          return;
        }
        setSaved(true);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="max-w-[520px] rounded-[18px] border border-sand bg-white px-[22px] pb-[22px] pt-5">
      <div className="flex items-center gap-2.5">
        <div className="flex-1 text-[15px] font-bold text-navy">Set Target</div>
        <span className="rounded-[6px] bg-warn-gold-bg px-2 py-1 text-[9.5px] font-bold tracking-[0.06em] text-warn-gold-text">
          {monthLabel(monthDate)}
        </span>
      </div>
      <div className="mt-[3px] text-[11.5px] font-medium text-taupe">Monthly ANC and number of cases (NOC) per agent</div>

      {rows.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-taupe px-4 py-6 text-center text-[12.5px] font-medium text-taupe-2">
          No agents in scope yet.
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-[1fr_84px_68px] items-center gap-2.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-taupe">
            <div>Agent</div>
            <div className="text-right">ANC (RM)</div>
            <div className="text-right">NOC</div>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {rows.map((row) => (
              <div key={row.agentId} className="grid grid-cols-[1fr_84px_68px] items-center gap-2.5">
                <div className="truncate text-[12.5px] font-semibold text-navy">{row.fullName}</div>
                <input
                  type="number"
                  value={row.ancTarget ?? ""}
                  onChange={(e) => updateRow(row.agentId, "ancTarget", e.target.value)}
                  className="h-[34px] w-full rounded-[9px] border border-sand-2 bg-cream px-2.5 text-right text-[12.5px] font-bold text-navy outline-none focus:border-gold"
                />
                <input
                  type="number"
                  value={row.nocTarget ?? ""}
                  onChange={(e) => updateRow(row.agentId, "nocTarget", e.target.value)}
                  className="h-[34px] w-full rounded-[9px] border border-sand-2 bg-cream px-2.5 text-right text-[12.5px] font-bold text-navy outline-none focus:border-gold"
                />
              </div>
            ))}
          </div>
        </>
      )}

      {error && <div className="mt-3 text-[12px] font-medium text-alert-red">{error}</div>}
      {saved && !error && <div className="mt-3 text-[12px] font-medium text-green">Targets saved.</div>}

      <button
        type="button"
        onClick={handleSave}
        disabled={pending || rows.length === 0}
        className="mt-4 flex h-10 w-full items-center justify-center rounded-[11px] bg-navy text-[13px] font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save targets"}
      </button>
    </div>
  );
}
