"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewRebalance, applyRebalance, type RebalancePlan } from "./actions";

// Rebalancing moves real leads between real people, so it never fires straight
// off the click: the preview shows exactly who gains and who loses, and only
// then is there a button that commits it.
export function RebalanceButton() {
  const router = useRouter();
  const [plan, setPlan] = useState<RebalancePlan | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setError(null);
    setDone(null);
    startTransition(async () => {
      try {
        setPlan(await previewRebalance());
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  function commit() {
    startTransition(async () => {
      try {
        const result = await applyRebalance();
        if (result.error) {
          setError(result.error);
          return;
        }
        setDone(result.moved);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="text-xs font-semibold text-info-blue-text hover:underline disabled:opacity-50 dark:text-[#8fb4dd]"
      >
        {pending && !plan ? "Checking…" : "Rebalance"}
      </button>

      {plan && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-navy/55 p-4"
          onClick={() => setPlan(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-elevated dark:bg-[#12283f]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[16px] font-bold text-navy dark:text-[#eef3f8]">Rebalance leads</div>
                <div className="mt-0.5 text-[12px] font-medium text-muted dark:text-[#7f93aa]">
                  Even shares across active team members only.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlan(null)}
                className="text-[12.5px] font-semibold text-muted dark:text-[#7f93aa]"
              >
                Close
              </button>
            </div>

            {plan.error ? (
              <p className="mt-4 text-[12.5px] font-semibold text-alert-red">{plan.error}</p>
            ) : done !== null ? (
              <div className="mt-5 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gold text-[20px] font-bold text-navy">
                  ✓
                </div>
                <div className="mt-3 text-[14px] font-bold text-navy dark:text-[#eef3f8]">
                  {done === 0 ? "Already balanced" : `${done} lead${done === 1 ? "" : "s"} reassigned`}
                </div>
                <p className="mt-1 text-[12px] font-medium text-muted dark:text-[#7f93aa]">
                  {done === 0
                    ? "Nothing needed to move."
                    : "Everyone who received leads has been notified."}
                </p>
                <button
                  type="button"
                  onClick={() => setPlan(null)}
                  className="mt-5 rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white dark:bg-gold dark:text-navy"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="mt-4 flex gap-2.5 border-y border-sand py-3 dark:border-white/10">
                  <Figure label="Open leads" value={plan.total} />
                  <Figure label="Will move" value={plan.moves} />
                  <Figure label="Unassigned" value={plan.unassigned} />
                </div>

                <div className="mt-3 flex flex-col gap-1.5">
                  {plan.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] bg-navy text-[10px] font-bold text-gold dark:bg-[#0b1a2b]">
                        {m.initials}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">
                        {m.name}
                      </span>
                      <span className="text-[11px] font-medium text-taupe dark:text-[#7f93aa]">
                        {m.current} → <span className="font-bold text-navy dark:text-[#eef3f8]">{m.target}</span>
                      </span>
                      <span
                        className={`w-[46px] text-right text-[11px] font-bold ${
                          m.delta > 0 ? "text-green" : m.delta < 0 ? "text-alert-red" : "text-taupe"
                        }`}
                      >
                        {m.delta > 0 ? `+${m.delta}` : m.delta < 0 ? m.delta : "—"}
                      </span>
                      <span className="w-[34px] text-right text-[10.5px] font-semibold text-taupe dark:text-[#7f93aa]">
                        {m.targetPct}%
                      </span>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-[11px] leading-relaxed font-medium text-taupe dark:text-[#7f93aa]">
                  Closed Won, Servicing and Closed Lost leads stay with the agent who earned them — only leads still in
                  play are moved.
                </p>

                {error && <div className="mt-3 text-[12px] font-semibold text-alert-red">{error}</div>}

                <div className="mt-5 flex justify-end gap-2.5 border-t border-sand pt-4 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setPlan(null)}
                    className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy dark:border-white/10 dark:text-[#eef3f8]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={pending || plan.moves === 0}
                    onClick={commit}
                    className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 dark:bg-gold dark:text-navy"
                  >
                    {pending ? "Rebalancing…" : plan.moves === 0 ? "Already balanced" : `Move ${plan.moves}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {error && !plan && <span className="text-xs font-semibold text-alert-red">{error}</span>}
    </>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 rounded-[10px] bg-cream px-3 py-2 dark:bg-[#0b1a2b]">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2 dark:text-[#7f93aa]">
        {label}
      </div>
      <div className="mt-0.5 text-[17px] font-extrabold text-navy dark:text-[#eef3f8]">{value}</div>
    </div>
  );
}
