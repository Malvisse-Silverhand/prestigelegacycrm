"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveDistributionSchedule,
  setDistributionActive,
  runDistributionNow,
  removePool,
  type RunNowResult,
} from "../daily-distribution-actions";
import {
  setWeeklyReportEnabled,
  setWeeklyReportOptIn,
  sendMyWeeklyReportPreview,
} from "../weekly-report-actions";
import type { DailyDistributionData, PoolSummary } from "../daily-distribution-data";
import {
  DEFAULT_RUN_HOUR,
  MAX_DAILY_COUNT,
  WEEKDAYS,
  hourLabel,
  isoWeekdayOf,
  mytClock,
  nextRun,
  validateScheduleInput,
  type DistributionRun,
  type ScheduleInput,
  type SplitMode,
} from "@/lib/daily-distribution-shared";
import { planAssignments } from "@/lib/lead-assignment-plan";
import { computeTargets } from "@/lib/rebalance-targets";
import { ROLE_LABEL, type Role } from "@/lib/profile-types";

export type WeeklyReportSettings = {
  masterEnabled: boolean;
  optIn: boolean;
  canReceive: boolean;
  isSuperAdmin: boolean;
};

const CARD = "rounded-[14px] border border-sand bg-white p-4 dark:border-white/10 dark:bg-[#12283f]";
const LABEL = "text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2 dark:text-[#7f93aa]";
const FIELD =
  "h-[38px] w-full rounded-[9px] border border-sand-2 bg-cream px-3 text-[12.5px] font-medium text-navy outline-none focus:border-gold dark:border-white/10 dark:bg-[#0b1a2b] dark:text-[#eef3f8]";
const BTN_PRIMARY =
  "press inline-flex h-10 items-center justify-center rounded-[10px] bg-brand px-5 text-[12.5px] font-bold text-white disabled:opacity-50 dark:bg-gold dark:text-navy";
const BTN_SECONDARY =
  "press inline-flex h-10 items-center justify-center rounded-[10px] border border-sand-2 bg-white px-5 text-[12.5px] font-semibold text-navy disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-[#eef3f8]";
const MUTED = "text-[11.5px] font-medium text-muted dark:text-[#7f93aa]";
const HEADING = "text-[14px] font-bold text-navy dark:text-[#eef3f8]";
const ERROR_TEXT = "text-[12px] font-semibold text-alert-red";
const NETWORK_ERROR = "Couldn't connect. Check your internet connection and try again.";

const MODES: { id: SplitMode; label: string }[] = [
  { id: "even", label: "Even" },
  { id: "percent", label: "By %" },
  { id: "count", label: "By number" },
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DEFAULT_DAYS = [1, 2, 3, 4, 5];

function fmtN(n: number) {
  return n.toLocaleString("en-US");
}

// YYYY-MM-DD -> "Thu 6 Nov"
function fmtDayShort(date: string) {
  const wd = WEEKDAYS.find((w) => w.iso === isoWeekdayOf(date))?.short ?? "";
  const month = MONTHS[Number(date.slice(5, 7)) - 1] ?? "";
  return `${wd} ${Number(date.slice(8, 10))} ${month}`;
}

// YYYY-MM-DD -> dd/mm/yyyy
function fmtDate(date: string) {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}

function fmtTimestampDate(iso: string) {
  return fmtDate(mytClock(new Date(iso)).date);
}

function roleLabel(role: string) {
  return ROLE_LABEL[role as Role] ?? role;
}

type FormSnapshot = {
  dailyCount: number;
  runHour: number;
  days: number[];
  mode: SplitMode;
  recipients: string[];
  split: Record<string, number>;
};

function snapshotKey(s: FormSnapshot) {
  const recipients = [...s.recipients].sort();
  const split: Record<string, number> = {};
  if (s.mode !== "even") for (const id of recipients) split[id] = s.split[id] ?? 0;
  return JSON.stringify({
    c: s.dailyCount,
    h: s.runHour,
    d: [...s.days].sort(),
    m: s.mode,
    r: recipients,
    s: split,
  });
}

export function DailyDistributionTab({
  data,
  weekly,
  myEmail,
}: {
  data: DailyDistributionData;
  weekly: WeeklyReportSettings | null;
  myEmail: string;
}) {
  if (!data.migrationReady) {
    return (
      <div className={`${CARD} max-w-xl`}>
        <p className="text-[13px] font-semibold text-navy dark:text-[#eef3f8]">
          Daily distribution needs a one-time database update. Ask your administrator to run the latest migration.
        </p>
      </div>
    );
  }
  return <ReadyTab data={data} weekly={weekly} myEmail={myEmail} />;
}

function ReadyTab({
  data,
  weekly,
  myEmail,
}: {
  data: DailyDistributionData;
  weekly: WeeklyReportSettings | null;
  myEmail: string;
}) {
  const router = useRouter();
  const { schedule, team, pools, poolRemaining, runs } = data;
  const teamIds = useMemo(() => new Set(team.map((m) => m.id)), [team]);

  // -- Form state --------------------------------------------------------------
  const [dailyCount, setDailyCount] = useState(String(schedule?.dailyCount ?? 10));
  const [runHour, setRunHour] = useState(schedule?.runHour ?? DEFAULT_RUN_HOUR);
  const [days, setDays] = useState<number[]>(schedule?.daysOfWeek ?? DEFAULT_DAYS);
  const [mode, setMode] = useState<SplitMode>(schedule?.mode ?? "even");
  const [recipients, setRecipients] = useState<string[]>(
    (schedule?.recipients ?? []).filter((id) => teamIds.has(id)),
  );
  const [values, setValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [id, v] of Object.entries(schedule?.splitValues ?? {})) out[id] = String(v);
    return out;
  });
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savePending, startSave] = useTransition();

  // -- Status switch (optimistic, rolled back on error) --------------------------
  const [activeOverride, setActiveOverride] = useState<boolean | null>(null);
  const active = activeOverride ?? schedule?.isActive ?? false;
  const [activeError, setActiveError] = useState<string | null>(null);
  const [activePending, startActive] = useTransition();

  // -- Pool / run-now ------------------------------------------------------------
  const [removeTarget, setRemoveTarget] = useState<PoolSummary | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removePending, startRemove] = useTransition();
  const [confirmRun, setConfirmRun] = useState(false);
  const [runResult, setRunResult] = useState<RunNowResult | null>(null);
  const [runPending, startRun] = useTransition();

  const dailyNumber = Number(dailyCount);
  const numericValues = useMemo(() => {
    const out: Record<string, number> = {};
    for (const id of recipients) {
      const raw = (values[id] ?? "").trim();
      if (raw !== "") out[id] = Number(raw);
    }
    return out;
  }, [recipients, values]);

  const input: ScheduleInput = {
    isActive: active,
    dailyCount: dailyNumber,
    runHour,
    daysOfWeek: days,
    mode,
    recipients,
    splitValues: mode === "even" ? undefined : numericValues,
  };
  const validation = validateScheduleInput(input, teamIds);
  const problem = validation.ok ? null : validation.error;

  const dirty = useMemo(() => {
    if (!schedule) return true;
    const current = snapshotKey({
      dailyCount: dailyNumber,
      runHour,
      days,
      mode,
      recipients,
      split: mode === "even" ? {} : numericValues,
    });
    const savedKey = snapshotKey({
      dailyCount: schedule.dailyCount,
      runHour: schedule.runHour,
      days: schedule.daysOfWeek,
      mode: schedule.mode,
      recipients: schedule.recipients,
      split: schedule.splitValues,
    });
    return current !== savedKey;
  }, [schedule, dailyNumber, runHour, days, mode, recipients, numericValues]);

  const preview = useMemo(() => {
    if (!Number.isInteger(dailyNumber) || dailyNumber < 1 || dailyNumber > MAX_DAILY_COUNT) return null;
    const members = team.filter((m) => recipients.includes(m.id)).map((m) => ({ id: m.id, name: m.name, load: m.load }));
    if (members.length === 0) return null;
    const plan = planAssignments(dailyNumber, members, {
      mode,
      values: mode === "even" ? undefined : numericValues,
    });
    return plan.error === undefined ? plan.counts : null;
  }, [dailyNumber, team, recipients, mode, numericValues]);

  function touch() {
    setTouched(true);
    setSaved(false);
  }

  function seedFor(next: SplitMode, ids: string[]): Record<string, string> {
    if (next === "even" || ids.length === 0) return {};
    const total = Number.isInteger(dailyNumber) && dailyNumber > 0 ? dailyNumber : 0;
    const even = computeTargets(
      "even",
      ids.map((id) => ({ id, name: id, current: 0 })),
      undefined,
      total,
    );
    const out: Record<string, string> = {};
    for (const id of ids) {
      const t = even.targets?.get(id) ?? 0;
      out[id] =
        next === "count"
          ? String(t)
          : String(total > 0 ? Math.round((t / total) * 10000) / 100 : Math.round((100 / ids.length) * 100) / 100);
    }
    return out;
  }

  function pickMode(next: SplitMode) {
    if (next === mode) return;
    touch();
    setMode(next);
    setValues(seedFor(next, recipients));
  }

  function toggleRecipient(id: string) {
    touch();
    setRecipients((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleDay(iso: number) {
    touch();
    setDays((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()));
  }

  function save() {
    if (!validation.ok) return;
    setSaveError(null);
    setSaved(false);
    startSave(async () => {
      try {
        const res = await saveDistributionSchedule(validation.value);
        if (res.error) {
          setSaveError(res.error);
          return;
        }
        setSaved(true);
        router.refresh();
      } catch {
        setSaveError(NETWORK_ERROR);
      }
    });
  }

  function toggleActive(next: boolean) {
    const previous = active;
    setActiveOverride(next);
    setActiveError(null);
    startActive(async () => {
      try {
        const res = await setDistributionActive(next);
        if (res.error) {
          setActiveOverride(previous);
          setActiveError(res.error);
          return;
        }
        router.refresh();
      } catch {
        setActiveOverride(previous);
        setActiveError(NETWORK_ERROR);
      }
    });
  }

  function confirmRemove() {
    if (!removeTarget) return;
    const id = removeTarget.id;
    setRemoveError(null);
    startRemove(async () => {
      try {
        const res = await removePool(id);
        if (res.error) {
          setRemoveError(res.error);
          return;
        }
        setRemoveTarget(null);
        router.refresh();
      } catch {
        setRemoveError(NETWORK_ERROR);
      }
    });
  }

  function confirmRunNow() {
    startRun(async () => {
      try {
        const res = await runDistributionNow();
        setRunResult(res);
        setConfirmRun(false);
        if (!res.error) router.refresh();
      } catch {
        setRunResult({ error: NETWORK_ERROR });
        setConfirmRun(false);
      }
    });
  }

  // -- Derived display -----------------------------------------------------------
  const next = schedule ? nextRun({ ...schedule, isActive: active }, mytClock()) : null;
  const daysLeft = schedule && schedule.dailyCount > 0 ? Math.ceil(poolRemaining / schedule.dailyCount) : null;
  const lastRun = runs[0] ?? null;
  const entered = recipients.reduce((s, id) => s + (numericValues[id] ?? 0), 0);
  const canRunNow = schedule !== null && schedule.recipients.length > 0 && poolRemaining > 0;
  const runCount = schedule ? Math.min(schedule.dailyCount, poolRemaining) : 0;
  const hours = useMemo(() => {
    const list: number[] = [];
    if (runHour < 6) list.push(runHour);
    for (let h = 6; h <= 23; h++) list.push(h);
    return list;
  }, [runHour]);

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      {/* Status */}
      <section className={CARD} aria-label="Status">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className={HEADING}>Daily distribution is {active ? "on" : "off"}</h3>
            <p className={`mt-0.5 ${MUTED}`}>
              {schedule ? "Turn it off any time to pause the daily hand-out." : "Save a schedule below, then switch it on."}
            </p>
          </div>
          <Switch
            checked={active}
            disabled={activePending || !schedule}
            onChange={toggleActive}
            label="Daily distribution on or off"
            large
          />
        </div>
        {activeError && <p className={`mt-2 ${ERROR_TEXT}`}>{activeError}</p>}
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <Figure
            label="Next run"
            value={
              <span suppressHydrationWarning>
                {next ? `${fmtDayShort(next.date)}, ${hourLabel(next.hour)}` : active ? "—" : "Off"}
              </span>
            }
          />
          <Figure label="Leads in pool" value={fmtN(poolRemaining)} />
          <Figure label="Lasts about" value={daysLeft === null ? "—" : `${fmtN(daysLeft)} ${daysLeft === 1 ? "day" : "days"}`} />
        </div>
        <p className={`mt-3 ${MUTED}`}>
          {lastRun
            ? `Last run ${fmtDate(lastRun.runDate)} (${lastRun.trigger === "manual" ? "manual" : "scheduled"}): ${fmtN(lastRun.distributed)} of ${fmtN(lastRun.requested)} handed out.`
            : "No runs yet."}
        </p>
      </section>

      {/* Schedule */}
      <section className={CARD} aria-label="Schedule">
        <h3 className={HEADING}>Schedule</h3>
        <div className="mt-3 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={LABEL}>Leads per day</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_DAILY_COUNT}
                step={1}
                value={dailyCount}
                onChange={(e) => {
                  touch();
                  setDailyCount(e.target.value);
                }}
                className={`mt-[5px] ${FIELD}`}
              />
            </label>
            <label className="block">
              <span className={LABEL}>Time (Malaysia)</span>
              <select
                value={runHour}
                onChange={(e) => {
                  touch();
                  setRunHour(Number(e.target.value));
                }}
                className={`mt-[5px] ${FIELD}`}
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset>
            <legend className={LABEL}>Days</legend>
            <div className="mt-[5px] flex flex-wrap gap-1.5">
              {WEEKDAYS.map((w) => {
                const on = days.includes(w.iso);
                return (
                  <button
                    key={w.iso}
                    type="button"
                    aria-pressed={on}
                    aria-label={w.long}
                    onClick={() => toggleDay(w.iso)}
                    className={`h-9 min-w-[48px] rounded-[9px] border px-2.5 text-[12px] font-semibold transition-colors ${
                      on
                        ? "border-brand bg-brand text-white dark:border-gold dark:bg-gold dark:text-navy"
                        : "border-sand-2 bg-white text-muted hover:text-navy dark:border-white/10 dark:bg-transparent dark:text-[#7f93aa]"
                    }`}
                  >
                    {w.short}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <span className={LABEL}>How to split</span>
            <div
              role="tablist"
              aria-label="How to split the leads"
              className="mt-[5px] flex gap-1 rounded-[11px] bg-cream p-1 dark:bg-[#0b1a2b]"
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
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <span className={LABEL}>Who receives leads</span>
              <span className="flex gap-3 text-[11.5px] font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    touch();
                    const all = team.map((m) => m.id);
                    setRecipients(all);
                    if (mode !== "even") setValues(seedFor(mode, all));
                  }}
                  className="text-info-blue-text hover:underline dark:text-[#8fb4dd]"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => {
                    touch();
                    setRecipients([]);
                  }}
                  className="text-info-blue-text hover:underline dark:text-[#8fb4dd]"
                >
                  Clear
                </button>
              </span>
            </div>
            <div className="mt-2 flex max-h-[360px] flex-col gap-1.5 overflow-y-auto">
              {team.map((m) => {
                const checked = recipients.includes(m.id);
                const count = preview?.get(m.id);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2.5 rounded-[10px] border border-sand px-2.5 py-2 dark:border-white/10"
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRecipient(m.id)}
                        className="h-4 w-4 flex-none accent-[var(--brand-primary)]"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">
                          {m.name}
                          {m.isSelf ? " (You)" : ""}
                        </span>
                        <span className="block text-[11px] font-medium text-taupe dark:text-[#7f93aa]">
                          {roleLabel(m.role)} · {fmtN(m.load)} open leads now
                        </span>
                      </span>
                    </label>
                    {checked && (
                      <div className="flex flex-none items-center gap-2">
                        {mode !== "even" && (
                          <label className="flex items-center gap-1">
                            <input
                              type="number"
                              inputMode={mode === "count" ? "numeric" : "decimal"}
                              min={0}
                              max={mode === "percent" ? 100 : undefined}
                              step={mode === "count" ? 1 : "any"}
                              value={values[m.id] ?? ""}
                              onChange={(e) => {
                                touch();
                                setValues((v) => ({ ...v, [m.id]: e.target.value }));
                              }}
                              aria-label={`${m.name} ${mode === "count" ? "leads per day" : "percent share"}`}
                              className="w-[60px] rounded-[9px] border border-sand-2 bg-white px-2 py-1.5 text-right text-[13px] font-semibold text-navy outline-none focus:border-gold dark:border-white/10 dark:bg-[#0b1a2b] dark:text-[#eef3f8]"
                            />
                            <span className="w-3 text-[11px] font-semibold text-taupe dark:text-[#7f93aa]">
                              {mode === "percent" ? "%" : ""}
                            </span>
                          </label>
                        )}
                        <span className="w-[54px] text-right text-[11px] font-semibold text-taupe dark:text-[#7f93aa]">
                          {count === undefined ? "—" : `${count}/day`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              {team.length === 0 && <p className={MUTED}>No team members available.</p>}
            </div>

            {mode !== "even" && recipients.length > 0 && (
              <div className="mt-2.5 flex items-center justify-between gap-3 text-[11.5px] font-semibold">
                <span className={validation.ok ? "text-green" : "text-alert-red"}>
                  {mode === "percent"
                    ? `Total ${Math.round(entered * 10) / 10}%`
                    : `Placed ${fmtN(entered)} of ${Number.isFinite(dailyNumber) ? fmtN(dailyNumber) : 0}`}
                  {validation.ok ? " ✓" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    touch();
                    setValues(seedFor(mode, recipients));
                  }}
                  className="text-info-blue-text hover:underline dark:text-[#8fb4dd]"
                >
                  Reset to even
                </button>
              </div>
            )}
          </div>

          {touched && problem && <p className={ERROR_TEXT}>{problem}</p>}
          {saveError && <p className={ERROR_TEXT}>{saveError}</p>}
          {saved && !dirty && !saveError && <p className="text-[12px] font-semibold text-green">Saved.</p>}

          <div>
            <button type="button" onClick={save} disabled={savePending || !dirty || !validation.ok} className={BTN_PRIMARY}>
              {savePending ? "Saving…" : "Save schedule"}
            </button>
          </div>
        </div>
      </section>

      {/* Pool */}
      <section className={CARD} aria-label="Pool">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={HEADING}>Lead pool</h3>
          {/* Plain anchor on purpose: a soft navigation to /leads/* is
              intercepted by a modal route. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/leads/upload" className="text-[12.5px] font-semibold text-info-blue-text hover:underline dark:text-[#8fb4dd]">
            Add leads to the pool
          </a>
        </div>
        {pools.length === 0 ? (
          <p className={`mt-2 ${MUTED}`}>
            The pool is empty. Upload a list and choose &ldquo;Add to daily pool&rdquo;.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {pools.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-sand px-3 py-2 dark:border-white/10"
              >
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">
                    {p.filename ?? "Untitled list"}
                  </div>
                  <div className="text-[11px] font-medium text-taupe dark:text-[#7f93aa]">
                    Added {fmtTimestampDate(p.createdAt)} · {fmtN(p.remaining)} of {fmtN(p.total)} left ·{" "}
                    {fmtN(p.handedOut)} handed out
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRemoveError(null);
                    setRemoveTarget(p);
                  }}
                  className="flex-none text-[12px] font-semibold text-alert-red hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Distribute now */}
      <section className={CARD} aria-label="Distribute now">
        <h3 className={HEADING}>Distribute now</h3>
        <p className={`mt-0.5 ${MUTED}`}>Hand out today&rsquo;s leads straight away instead of waiting for the schedule.</p>
        <div className="mt-3">
          <button
            type="button"
            disabled={!canRunNow || runPending || dirty}
            onClick={() => setConfirmRun(true)}
            className={BTN_SECONDARY}
          >
            {runPending ? "Distributing…" : "Distribute now"}
          </button>
          {dirty && schedule && <p className={`mt-1.5 ${MUTED}`}>Save your changes first.</p>}
          {!canRunNow && <p className={`mt-1.5 ${MUTED}`}>Needs a saved schedule with agents and leads in the pool.</p>}
        </div>
        {runResult && (
          <div className="mt-3 rounded-[10px] bg-cream px-3 py-2.5 dark:bg-[#0b1a2b]">
            {runResult.error ? (
              <p className={ERROR_TEXT}>{runResult.error}</p>
            ) : runResult.run ? (
              <>
                <p className="text-[12.5px] font-bold text-navy dark:text-[#eef3f8]">
                  {runResult.run.status === "done"
                    ? `Handed out ${fmtN(runResult.run.distributed)} lead${runResult.run.distributed === 1 ? "" : "s"}.`
                    : `Run ${runResult.run.status}.`}
                </p>
                {runResult.run.note && <p className={`mt-0.5 ${MUTED}`}>{runResult.run.note}</p>}
                {runResult.run.perAgent.length > 0 && (
                  <ul className="mt-1.5 text-[12px] font-medium text-navy dark:text-[#eef3f8]">
                    {runResult.run.perAgent.map((a) => (
                      <li key={a.agent_id}>
                        {a.name}: {fmtN(a.count)}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-[12.5px] font-bold text-navy dark:text-[#eef3f8]">Done.</p>
            )}
          </div>
        )}
      </section>

      {/* Run history */}
      <section className={CARD} aria-label="Run history">
        <h3 className={HEADING}>Run history</h3>
        {runs.length === 0 ? (
          <p className={`mt-2 ${MUTED}`}>Nothing has been handed out yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[12px]">
              <thead>
                <tr className={LABEL}>
                  <th className="py-1.5 pr-3 font-bold">Date</th>
                  <th className="py-1.5 pr-3 font-bold">Type</th>
                  <th className="py-1.5 pr-3 font-bold">Status</th>
                  <th className="py-1.5 pr-3 font-bold">Handed out</th>
                  <th className="py-1.5 font-bold">Who got them</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <RunRow key={r.id} run={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {weekly?.canReceive && <WeeklyCard weekly={weekly} email={myEmail} />}

      {removeTarget && (
        <Dialog title="Remove this list from the pool?" onClose={() => !removePending && setRemoveTarget(null)}>
          <p className={MUTED}>Leads already handed out stay with their agents.</p>
          {removeError && <p className={`mt-2 ${ERROR_TEXT}`}>{removeError}</p>}
          <DialogButtons
            onCancel={() => setRemoveTarget(null)}
            onConfirm={confirmRemove}
            confirmLabel={removePending ? "Removing…" : "Remove list"}
            busy={removePending}
            danger
          />
        </Dialog>
      )}

      {confirmRun && (
        <Dialog title={`Hand out up to ${fmtN(runCount)} leads now?`} onClose={() => !runPending && setConfirmRun(false)}>
          <p className={MUTED}>
            This counts as today&rsquo;s distribution &mdash; the scheduled run will skip today.
          </p>
          <DialogButtons
            onCancel={() => setConfirmRun(false)}
            onConfirm={confirmRunNow}
            confirmLabel={runPending ? "Distributing…" : "Distribute now"}
            busy={runPending}
          />
        </Dialog>
      )}
    </div>
  );
}

function RunRow({ run }: { run: DistributionRun }) {
  const top = [...run.perAgent].sort((a, b) => b.count - a.count).slice(0, 4);
  const chip =
    run.status === "done"
      ? "bg-green/15 text-green"
      : run.status === "failed"
        ? "bg-alert-red/15 text-alert-red"
        : "bg-sand text-taupe dark:bg-white/10 dark:text-[#7f93aa]";
  return (
    <tr className="border-t border-sand align-top dark:border-white/10">
      <td className="whitespace-nowrap py-2 pr-3 font-semibold text-navy dark:text-[#eef3f8]">{fmtDate(run.runDate)}</td>
      <td className="py-2 pr-3 text-muted dark:text-[#7f93aa]">{run.trigger === "manual" ? "Manual" : "Scheduled"}</td>
      <td className="py-2 pr-3">
        <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold capitalize ${chip}`}>{run.status}</span>
      </td>
      <td className="whitespace-nowrap py-2 pr-3 font-semibold text-navy dark:text-[#eef3f8]">
        {fmtN(run.distributed)} / {fmtN(run.requested)}
      </td>
      <td className="py-2 text-muted dark:text-[#7f93aa]">
        {top.length > 0 ? top.map((a) => `${a.name} ${a.count}`).join(" · ") : "—"}
        {run.note && <div className="mt-0.5 text-[11px]">{run.note}</div>}
      </td>
    </tr>
  );
}

function WeeklyCard({ weekly, email }: { weekly: WeeklyReportSettings; email: string }) {
  const [master, setMaster] = useState(weekly.masterEnabled);
  const [optIn, setOptIn] = useState(weekly.optIn);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function flip(kind: "master" | "optIn", next: boolean) {
    setError(null);
    setMessage(null);
    const set = kind === "master" ? setMaster : setOptIn;
    const previous = kind === "master" ? master : optIn;
    set(next);
    start(async () => {
      try {
        const res = kind === "master" ? await setWeeklyReportEnabled(next) : await setWeeklyReportOptIn(next);
        if (res.error) {
          set(previous);
          setError(res.error);
        }
      } catch {
        set(previous);
        setError(NETWORK_ERROR);
      }
    });
  }

  function sendPreview() {
    setError(null);
    setMessage(null);
    start(async () => {
      try {
        const res = await sendMyWeeklyReportPreview();
        if (res.error) setError(res.error);
        else setMessage(`Preview sent to ${email}`);
      } catch {
        setError(NETWORK_ERROR);
      }
    });
  }

  return (
    <section className={CARD} aria-label="Weekly report">
      <h3 className={HEADING}>Weekly report</h3>
      <div className="mt-3 flex flex-col gap-3">
        {weekly.isSuperAdmin && (
          <div className="flex items-center gap-3">
            <Switch checked={master} disabled={pending} onChange={(v) => flip("master", v)} label="Send weekly reports (Monday 9:00 AM)" />
            <span className="text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">
              Send weekly reports (Monday 9:00 AM)
            </span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Switch checked={optIn} disabled={pending} onChange={(v) => flip("optIn", v)} label="Email me the weekly report" />
          <span className="text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">Email me the weekly report</span>
        </div>
        <div>
          <button type="button" onClick={sendPreview} disabled={pending} className={BTN_SECONDARY}>
            {pending ? "Working…" : "Send me a preview"}
          </button>
        </div>
        {error && <p className={ERROR_TEXT}>{error}</p>}
        {message && !error && <p className="text-[12px] font-semibold text-green">{message}</p>}
      </div>
    </section>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
  label,
  large = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex flex-none items-center rounded-full px-[3px] transition-colors disabled:opacity-60 ${
        large ? "h-[28px] w-[52px]" : "h-[21px] w-[38px]"
      } ${checked ? "justify-end bg-green" : "justify-start bg-sand-2"}`}
    >
      <span className={`rounded-full bg-white ${large ? "h-[22px] w-[22px]" : "h-[15px] w-[15px]"}`} />
    </button>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[10px] bg-cream px-3 py-2 dark:bg-[#0b1a2b]">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2 dark:text-[#7f93aa]">{label}</div>
      <div className="mt-0.5 text-[15px] font-extrabold text-navy dark:text-[#eef3f8]">{value}</div>
    </div>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/55 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-elevated dark:bg-[#12283f]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-[16px] font-bold text-navy dark:text-[#eef3f8]">{title}</div>
          <button type="button" onClick={onClose} className="text-[12.5px] font-semibold text-muted dark:text-[#7f93aa]">
            Close
          </button>
        </div>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

function DialogButtons({
  onCancel,
  onConfirm,
  confirmLabel,
  busy = false,
  danger = false,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2.5 border-t border-sand pt-4 dark:border-white/10">
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="press rounded-[10px] border border-sand-2 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-[#eef3f8]"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className={
          danger
            ? "press rounded-[10px] bg-alert-red px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
            : "press rounded-[10px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 dark:bg-gold dark:text-navy"
        }
      >
        {confirmLabel}
      </button>
    </div>
  );
}
