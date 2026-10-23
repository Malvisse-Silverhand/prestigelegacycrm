"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewRebalance, applyRebalance, type RebalancePlan } from "./actions";
import { computeTargets, type RebalanceMode } from "@/lib/rebalance-targets";

// Rebalancing moves real leads between real people, so it never fires straight
// off the click: the dialog shows exactly who gains and who loses, and only
// then is there a button that commits it.
//
// The manager can split the book three ways: evenly, by a percentage per
// person, or by an exact number of leads per person. The numbers shown here are
// worked out live with the same function the server uses to do the move
// (lib/rebalance-targets), so what is previewed is what is applied -- and the
// server re-checks it all anyway.

const MODES: { id: RebalanceMode; label: string }[] = [
  { id: "even", label: "Even" },
  { id: "percent", label: "By %" },
  { id: "count", label: "By number" },
];

export function RebalanceButton() {
  const router = useRouter();
  // The starting picture: who holds what today. Always the even plan, which is
  // also the baseline the manual modes are seeded from.
  const [plan, setPlan] = useState<RebalancePlan | null>(null);
  const [mode, setMode] = useState<RebalanceMode>("even");
  const [values, setValues] = useState<Record<string, string>>({});
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setPlan(null);
    setMode("even");
    setValues({});
  }

  function open() {
    setError(null);
    setDone(null);
    setMode("even");
    setValues({});
    startTransition(async () => {
      try {
        setPlan(await previewRebalance());
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  const members = plan?.members;
  const total = plan?.total ?? 0;

  // Starting numbers for a manual mode: today's even split, so the manager
  // edits from something that already adds up instead of a blank form.
  function seedFor(next: RebalanceMode): Record<string, string> {
    if (!members || next === "even") return {};
    const even = computeTargets(
      "even",
      members.map((m) => ({ id: m.id, name: m.name, current: m.current })),
      undefined,
      total,
    );
    const out: Record<string, string> = {};
    for (const m of members) {
      const t = even.targets?.get(m.id) ?? 0;
      out[m.id] =
        next === "count"
          ? String(t)
          : String(total > 0 ? Math.round((t / total) * 10000) / 100 : Math.round((100 / members.length) * 100) / 100);
    }
    return out;
  }

  function pickMode(next: RebalanceMode) {
    if (next === mode) return;
    setError(null);
    setMode(next);
    setValues(seedFor(next));
  }

  const result = useMemo(() => {
    if (!members) return null;
    const numeric: Record<string, number> = {};
    for (const m of members) {
      const raw = (values[m.id] ?? "").trim();
      if (raw !== "") numeric[m.id] = Number(raw);
    }
    return {
      numeric,
      outcome: computeTargets(
        mode,
        members.map((m) => ({ id: m.id, name: m.name, current: m.current })),
        numeric,
        total,
      ),
    };
  }, [members, values, mode, total]);

  const targets = result?.outcome.targets;
  const problem = result?.outcome.error ?? null;
  const moves =
    plan && members && targets
      ? plan.unassigned + members.reduce((n, m) => n + Math.max(0, m.current - (targets.get(m.id) ?? 0)), 0)
      : 0;

  const entered = members ? members.reduce((s, m) => s + (Number(values[m.id]) || 0), 0) : 0;

  function commit() {
    if (!result || problem) return;
    startTransition(async () => {
      try {
        const res = await applyRebalance({ mode, values: mode === "even" ? undefined : result.numeric });
        if (res.error) {
          setError(res.error);
          return;
        }
        setDone(res.moved);
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/55 p-4" onClick={close}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-elevated dark:bg-[#12283f]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[16px] font-bold text-navy dark:text-[#eef3f8]">Rebalance leads</div>
                <div className="mt-0.5 text-[12px] font-medium text-muted dark:text-[#7f93aa]">
                  Choose how many leads each active team member gets.
                </div>
              </div>
              <button
                type="button"
                onClick={close}
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
                    : "Everyone who received leads has been notified in the app and by email."}
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 rounded-[10px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white dark:bg-gold dark:text-navy"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div
                  role="tablist"
                  aria-label="How to split the leads"
                  className="mt-4 flex gap-1 rounded-[11px] bg-cream p-1 dark:bg-[#0b1a2b]"
                >
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="tab"
                      aria-selected={mode === m.id}
                      onClick={() => pickMode(m.id)}
                      className={`flex-1 rounded-[8px] px-2 py-1.5 text-[12.5px] font-semibold transition-colors ${
                        mode === m.id
                          ? "bg-white text-navy shadow-sm dark:bg-[#12283f] dark:text-[#eef3f8]"
                          : "text-taupe hover:text-navy dark:text-[#7f93aa] dark:hover:text-[#eef3f8]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex gap-2.5 border-y border-sand py-3 dark:border-white/10">
                  <Figure label="Open leads" value={total} />
                  <Figure label="Will move" value={moves} />
                  <Figure label="Unassigned" value={plan.unassigned} />
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {plan.members.map((m) => {
                    const target = targets?.get(m.id);
                    const delta = target === undefined ? null : target - m.current;
                    return (
                      <div key={m.id} className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] bg-brand text-[10px] font-bold text-gold dark:bg-[#0b1a2b]">
                          {m.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">
                            {m.name}
                          </div>
                          <div className="text-[11px] font-medium text-taupe dark:text-[#7f93aa]">
                            {m.current} →{" "}
                            <span className="font-bold text-navy dark:text-[#eef3f8]">{target ?? "—"}</span>
                            {delta !== null && delta !== 0 && (
                              <span className={`ml-1.5 font-bold ${delta > 0 ? "text-green" : "text-alert-red"}`}>
                                {delta > 0 ? `+${delta}` : delta}
                              </span>
                            )}
                            {target !== undefined && total > 0 && (
                              <span className="ml-1.5 text-[10.5px] font-semibold">
                                · {Math.round((target / total) * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                        {mode !== "even" && (
                          <label className="flex flex-none items-center gap-1">
                            <input
                              type="number"
                              inputMode={mode === "count" ? "numeric" : "decimal"}
                              min={0}
                              max={mode === "percent" ? 100 : undefined}
                              step={mode === "count" ? 1 : "any"}
                              value={values[m.id] ?? ""}
                              onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value }))}
                              aria-label={`${m.name} ${mode === "count" ? "number of leads" : "percent share"}`}
                              className="w-[64px] rounded-[9px] border border-sand-2 bg-white px-2 py-1.5 text-right text-[13px] font-semibold text-navy outline-none focus:border-gold dark:border-white/10 dark:bg-[#0b1a2b] dark:text-[#eef3f8]"
                            />
                            <span className="w-3 text-[11px] font-semibold text-taupe dark:text-[#7f93aa]">
                              {mode === "percent" ? "%" : ""}
                            </span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                {mode !== "even" && (
                  <div className="mt-3 flex items-center justify-between gap-3 text-[11.5px] font-semibold">
                    <span className={problem ? "text-alert-red" : "text-green"}>
                      {mode === "percent"
                        ? `Total ${Math.round(entered * 10) / 10}%`
                        : `Placed ${entered} of ${total}`}
                      {problem ? "" : " ✓"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setValues(seedFor(mode))}
                      className="text-info-blue-text hover:underline dark:text-[#8fb4dd]"
                    >
                      Reset to even
                    </button>
                  </div>
                )}

                {mode !== "even" && problem && (
                  <p className="mt-1.5 text-[12px] font-semibold text-alert-red">{problem}</p>
                )}

                <p className="mt-3 text-[11px] leading-relaxed font-medium text-taupe dark:text-[#7f93aa]">
                  Closed Won, Servicing and Closed Lost leads stay with the agent who earned them — only leads still in
                  play are moved. Set someone to 0 to give them none. Each agent who receives leads gets an email.
                </p>

                {error && <div className="mt-3 text-[12px] font-semibold text-alert-red">{error}</div>}

                <div className="mt-5 flex justify-end gap-2.5 border-t border-sand pt-4 dark:border-white/10">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy dark:border-white/10 dark:text-[#eef3f8]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={pending || Boolean(problem) || moves === 0}
                    onClick={commit}
                    className="rounded-[10px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 dark:bg-gold dark:text-navy"
                  >
                    {pending ? "Rebalancing…" : moves === 0 ? "Nothing to move" : `Move ${moves}`}
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
