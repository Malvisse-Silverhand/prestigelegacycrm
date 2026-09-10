"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

// Which blocks the dashboard can show. Order here is the order they appear in
// the Manage widgets panel, which is also the order they appear on the page.
export const WIDGETS = [
  { key: "goal", label: "Sales target progress", hint: "ANC goal, pace and daily approaches" },
  { key: "calendar", label: "Activity calendar", hint: "Leads, appointments and closings by day" },
  { key: "leads", label: "Lead counters", hint: "Leads today, this week, this month" },
  { key: "alerts", label: "Needs attention", hint: "Overdue, follow up today, no quotation" },
  { key: "appointments", label: "Upcoming appointments", hint: "" },
  { key: "recent", label: "Recently added leads", hint: "" },
  { key: "birthdays", label: "Birthdays", hint: "" },
  { key: "analytics", label: "Charts", hint: "Status mix, sources, 14-day trend, assignment" },
] as const;

export type WidgetKey = (typeof WIDGETS)[number]["key"];

const STORAGE_KEY = "plc.dashboard.hiddenWidgets";

// localStorage as an external store, read through useSyncExternalStore. The
// server snapshot is deliberately empty -- everything visible -- so the
// server's HTML and the browser's first render always agree, and the stored
// preference is applied on the pass straight after.
const prefListeners = new Set<() => void>();

function subscribePrefs(onChange: () => void) {
  prefListeners.add(onChange);
  // Another tab changing the preference should move this one too.
  window.addEventListener("storage", onChange);
  return () => {
    prefListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readPrefs() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    // A blocked store just means everything stays visible.
    return "";
  }
}

function writePrefs(raw: string) {
  try {
    if (raw) window.localStorage.setItem(STORAGE_KEY, raw);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The preference won't survive a reload; the toggle still works now.
  }
  for (const l of prefListeners) l();
}

/**
 * Which widgets this person has switched off.
 *
 * Kept in localStorage rather than the database: it is a per-screen display
 * preference, not shared data, and nobody else ever needs to read it.
 */
export function useWidgetPrefs() {
  const raw = useSyncExternalStore(subscribePrefs, readPrefs, () => "");

  const hidden = useMemo(() => {
    if (!raw) return new Set<string>();
    try {
      return new Set(JSON.parse(raw) as string[]);
    } catch {
      return new Set<string>();
    }
  }, [raw]);

  function toggle(key: WidgetKey) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    writePrefs(next.size > 0 ? JSON.stringify([...next]) : "");
  }

  return {
    on: (key: WidgetKey) => !hidden.has(key),
    hiddenCount: hidden.size,
    toggle,
    showAll: () => writePrefs(""),
  };
}

export function ManageWidgets({
  on,
  toggle,
  showAll,
  hiddenCount,
  compact = false,
}: {
  on: (key: WidgetKey) => boolean;
  toggle: (key: WidgetKey) => void;
  showAll: () => void;
  hiddenCount: number;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`press flex items-center gap-1.5 rounded-[10px] border border-sand-2 bg-cream font-semibold text-navy hover:border-navy dark:border-white/10 dark:bg-[#12283f] dark:text-[#eef3f8] ${
          compact ? "h-9 px-2.5 text-[12px]" : "px-[13px] py-[10px] text-[12.5px]"
        }`}
      >
        <SlidersIcon />
        {compact ? "Widgets" : "Manage Widgets"}
        {hiddenCount > 0 && (
          <span className="rounded-[5px] bg-navy px-1.5 py-[1px] text-[9.5px] font-bold text-white dark:bg-gold dark:text-navy">
            {hiddenCount} off
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 z-30 mt-1.5 w-[286px] rounded-[14px] border border-sand-2 bg-white p-2 shadow-elevated dark:border-white/10 dark:bg-[#12283f]">
            <div className="flex items-center justify-between px-1.5 pt-1 pb-2">
              <span className="text-[9.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">
                Show on dashboard
              </span>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={showAll}
                  className="text-[10.5px] font-bold text-green hover:underline"
                >
                  Show all
                </button>
              )}
            </div>

            <div className="flex flex-col">
              {WIDGETS.map((w) => {
                const isOn = on(w.key);
                return (
                  <button
                    key={w.key}
                    type="button"
                    role="switch"
                    aria-checked={isOn}
                    onClick={() => toggle(w.key)}
                    className="flex items-center gap-2.5 rounded-[9px] px-2 py-2 text-left hover:bg-cream dark:hover:bg-white/5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">
                        {w.label}
                      </span>
                      {w.hint && (
                        <span className="block truncate text-[10.5px] font-medium text-taupe dark:text-[#7f93aa]">
                          {w.hint}
                        </span>
                      )}
                    </span>
                    <span
                      className={`flex h-[20px] w-[36px] flex-none items-center rounded-full px-[3px] transition-colors ${
                        isOn ? "justify-end bg-green" : "justify-start bg-sand-2 dark:bg-white/15"
                      }`}
                    >
                      <span className="h-[14px] w-[14px] rounded-full bg-white" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The date and time, live.
 *
 * Rendered empty on the server and filled in after mount: a clock read during
 * render disagrees with the server's by definition, and the app's users are
 * all in Malaysia while the server runs in UTC, so the date itself would be
 * wrong for eight hours of every day.
 */
export function DashboardClock({ compact = false }: { compact?: boolean }) {
  // 0 on the server and on the hydrating render, a real timestamp from the
  // tick right after -- so the two passes can never disagree about the time.
  const ms = useSyncExternalStore(subscribeClock, readClock, () => 0);
  const now = ms === 0 ? null : new Date(ms);

  const date = now
    ? now.toLocaleDateString("en-MY", {
        timeZone: MY_TZ,
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  const time = now
    ? now.toLocaleTimeString("en-MY", {
        timeZone: MY_TZ,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  if (compact) {
    return (
      <div className="text-[11px] font-semibold text-white/55 dark:text-[#7f93aa]" suppressHydrationWarning>
        {now ? `${date} · ${time}` : " "}
      </div>
    );
  }

  return (
    <div
      className="flex min-w-[172px] flex-col rounded-[10px] border border-sand-2 bg-cream px-[13px] py-[7px] dark:border-white/10 dark:bg-[#12283f]"
      suppressHydrationWarning
    >
      <span className="text-[12.5px] font-bold text-navy dark:text-[#eef3f8]">{now ? time : " "}</span>
      <span className="text-[10.5px] font-semibold text-taupe dark:text-[#7f93aa]">
        {now ? date : " "}
      </span>
    </div>
  );
}

// Everyone using this CRM is in Malaysia; the server is not. Pinning the zone
// keeps the header agreeing with every other date on the page.
const MY_TZ = "Asia/Kuala_Lumpur";

// One timer for however many clocks are mounted, started by the first
// subscriber and stopped by the last.
let clockMs = 0;
let clockTimer: number | null = null;
const clockListeners = new Set<() => void>();

function subscribeClock(onChange: () => void) {
  clockListeners.add(onChange);
  if (clockTimer === null) {
    clockMs = Date.now();
    clockTimer = window.setInterval(() => {
      clockMs = Date.now();
      for (const l of clockListeners) l();
    }, 30_000);
  }
  return () => {
    clockListeners.delete(onChange);
    if (clockListeners.size === 0 && clockTimer !== null) {
      window.clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

function readClock() {
  return clockMs;
}

function SlidersIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="16" cy="18" r="2" />
    </svg>
  );
}
