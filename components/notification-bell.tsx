"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "@/components/icons";
import {
  getNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/app/(app)/notifications/actions";

// How often the bell asks the server what has become due. Reminder rows are
// written when an appointment is booked and simply wait for their fire_at, so
// polling is all that stands between a due row and the agent seeing it.
const POLL_MS = 60_000;
const PUSH_PREF_KEY = "plc.push-notifications";

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// Read once, during the first render, rather than in an effect -- the panel is
// closed on mount so nothing about this reaches the server-rendered HTML.
function readPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function readPushPref() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  try {
    return localStorage.getItem(PUSH_PREF_KEY) === "on" && Notification.permission === "granted";
  } catch {
    // Private windows and blocked site data throw on access -- the bell still
    // works, it just won't remember the preference.
    return false;
  }
}

export function NotificationBell({
  initial,
  compact,
}: {
  // Server-rendered so the badge is right on first paint; polling only has to
  // carry what falls due afterwards.
  initial: NotificationRow[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>(initial);
  const [open, setOpen] = useState(false);
  const [pushOn, setPushOn] = useState(readPushPref);
  const [pushState, setPushState] = useState<NotificationPermission | "unsupported">(readPermission);
  // Ids already pushed to the desktop, so a poll that returns the same row
  // again doesn't raise a second banner for it. Seeded with whatever the
  // server already sent, so opening the CRM never replays old reminders.
  const pushed = useRef<Set<string>>(new Set(initial.map((n) => n.id)));
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.readAt);

  const refresh = useCallback(async () => {
    try {
      const rows = await getNotifications();
      setItems(rows);
      return rows;
    } catch {
      // A failed poll is not worth surfacing -- the next one is a minute away.
      return null;
    }
  }, []);

  // Poll while the tab is open, and again on focus so coming back to the CRM
  // shows what fell due while it was in the background.
  useEffect(() => {
    const id = setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  // Raise a desktop banner for anything newly due. Only unread rows, and only
  // once each -- reopening the CRM should not replay yesterday's reminders.
  useEffect(() => {
    if (!pushOn || pushState !== "granted") return;
    for (const n of items) {
      if (n.readAt || pushed.current.has(n.id)) continue;
      pushed.current.add(n.id);
      try {
        const notification = new Notification(n.title, {
          body: n.body ?? undefined,
          tag: n.id,
          icon: "/logo.jpeg",
        });
        notification.onclick = () => {
          window.focus();
          if (n.href) router.push(n.href);
          notification.close();
        };
      } catch {
        // Some browsers throw when constructing a Notification outside a
        // service worker (notably Android Chrome). Nothing to do but skip it.
      }
    }
  }, [items, pushOn, pushState, router]);

  // While banners are switched off, everything that arrives still counts as
  // seen -- turning them on later should announce what happens next, not
  // replay the backlog.
  useEffect(() => {
    if (pushOn) return;
    for (const n of items) pushed.current.add(n.id);
  }, [items, pushOn]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function togglePush() {
    if (pushState === "unsupported") return;
    if (pushOn) {
      setPushOn(false);
      try {
        localStorage.setItem(PUSH_PREF_KEY, "off");
      } catch {}
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    setPushState(permission);
    if (permission !== "granted") return;
    // Everything already on screen counts as seen, so switching this on does
    // not immediately fire banners for reminders the agent has already read.
    for (const n of items) pushed.current.add(n.id);
    setPushOn(true);
    try {
      localStorage.setItem(PUSH_PREF_KEY, "on");
    } catch {}
  }

  async function openPanel() {
    const next = !open;
    setOpen(next);
    if (next) await refresh();
  }

  async function handleItemClick(n: NotificationRow) {
    setOpen(false);
    if (!n.readAt) {
      setItems((prev) => prev.map((r) => (r.id === n.id ? { ...r, readAt: new Date().toISOString() } : r)));
      await markNotificationsRead([n.id]);
    }
    if (n.href) router.push(n.href);
  }

  async function handleMarkAll() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((r) => (r.readAt ? r : { ...r, readAt: now })));
    await markAllNotificationsRead();
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={openPanel}
        aria-label={unread.length > 0 ? `Notifications, ${unread.length} unread` : "Notifications"}
        className={
          compact
            ? "relative flex h-9 w-9 items-center justify-center rounded-[11px] bg-white/10 text-white"
            : "relative flex h-[42px] w-[42px] items-center justify-center rounded-[10px] border border-sand-2 bg-cream text-navy dark:border-white/10 dark:bg-[#12283f] dark:text-[#eef3f8]"
        }
      >
        <BellIcon width={compact ? 18 : 19} height={compact ? 18 : 19} />
        {unread.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-alert-red px-1 text-[10px] font-bold text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-40 mt-2 w-[320px] overflow-hidden rounded-[16px] border border-sand bg-white shadow-elevated dark:border-white/10 dark:bg-[#12283f] ${
            compact ? "right-0" : "right-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-sand px-4 py-3 dark:border-white/10">
            <div className="text-[13.5px] font-bold text-navy dark:text-[#eef3f8]">Notifications</div>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-[11.5px] font-semibold text-taupe hover:text-navy dark:text-[#7f93aa] dark:hover:text-[#eef3f8]"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-[13px] font-semibold text-navy dark:text-[#eef3f8]">You&apos;re all caught up</div>
                <div className="mt-1 text-[11.5px] font-medium text-taupe dark:text-[#7f93aa]">
                  Appointment reminders land here 24 hours, 1 hour and 15 minutes before a meeting.
                </div>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={`flex w-full gap-2.5 border-b border-sand-3 px-4 py-3 text-left last:border-b-0 hover:bg-cream dark:border-white/[.07] dark:hover:bg-white/5 ${
                    n.readAt ? "" : "bg-warn-gold-bg/40 dark:bg-gold/[.07]"
                  }`}
                >
                  <span
                    className={`mt-[5px] h-[7px] w-[7px] flex-none rounded-full ${
                      n.readAt ? "bg-sand-2 dark:bg-white/15" : "bg-gold"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-navy dark:text-[#eef3f8]">{n.title}</span>
                    {n.body && (
                      <span className="mt-0.5 block text-[11.5px] font-medium text-muted dark:text-[#7f93aa]">
                        {n.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[10.5px] font-medium text-taupe dark:text-[#7f93aa]">
                      {timeAgo(n.fireAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-sand bg-cream px-4 py-3 dark:border-white/10 dark:bg-[#0b1a2b]">
            {pushState === "unsupported" ? (
              <div className="text-[11px] font-medium text-taupe dark:text-[#7f93aa]">
                This browser doesn&apos;t support desktop notifications.
              </div>
            ) : pushState === "denied" ? (
              <div className="text-[11px] font-medium text-taupe dark:text-[#7f93aa]">
                Desktop notifications are blocked for this site. Allow them in your browser settings to switch this on.
              </div>
            ) : (
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={pushOn}
                  onChange={togglePush}
                  className="mt-[2px] h-[15px] w-[15px] flex-none accent-[#fac748]"
                />
                <span>
                  <span className="block text-[11.5px] font-bold text-navy dark:text-[#eef3f8]">
                    Browser notifications
                  </span>
                  <span className="mt-0.5 block text-[10.5px] font-medium text-taupe dark:text-[#7f93aa]">
                    Pop reminders up on your desktop while the CRM is open in a tab.
                  </span>
                </span>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
