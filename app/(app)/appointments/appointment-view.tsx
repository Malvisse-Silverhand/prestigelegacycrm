"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AppointmentRow, LeadOption } from "./data";
import type { BirthdayRow, Birthday } from "@/lib/birthdays";
import { occurrencesInRange, upcomingBirthdays } from "@/lib/birthdays";
import { BirthdayCard } from "@/components/birthday-card";
import { AppointmentDialog, type AppointmentDraft } from "./appointment-dialog";
import { setAppointmentStatus, deleteAppointment } from "./actions";
import { dayKeyOf, formatTime, isoToLocalParts, relativeToNow } from "@/lib/appointments";
import { useRouter } from "next/navigation";

type View = "month" | "week" | "day";

const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
const WEEKDAY = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// The working day the grid draws. Anything booked outside it still shows in
// the month view and the Upcoming list, so nothing can hide.
const FIRST_HOUR = 8;
const LAST_HOUR = 20;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);

function keyOf(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function startOfWeek(d: Date) {
  const out = new Date(d);
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7)); // Monday-first
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

// Outside the component: reading the clock during render is impure, and this
// only has to be right at the moment the list is built.
function stillToCome(list: AppointmentRow[]) {
  const now = Date.now();
  return list
    .filter((a) => a.status === "scheduled" && new Date(a.scheduledAt).getTime() >= now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

const STATUS_TONE: Record<string, string> = {
  scheduled: "bg-navy text-white",
  completed: "bg-success-bg text-green",
  cancelled: "bg-sand-2 text-taupe-2 line-through",
};

export function AppointmentView({
  appointments,
  leads,
  leadBase,
  birthdayPeople,
  todayKey,
}: {
  appointments: AppointmentRow[];
  leads: LeadOption[];
  leadBase: number;
  birthdayPeople: BirthdayRow[];
  /** Today in Malaysia, resolved on the server -- see the page component. */
  todayKey: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [draft, setDraft] = useState<AppointmentDraft | null>(null);
  const [detail, setDetail] = useState<AppointmentRow | null>(null);

  const live = useMemo(() => appointments.filter((a) => a.status !== "cancelled"), [appointments]);

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const a of live) {
      const key = dayKeyOf(a.scheduledAt);
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    }
    return map;
  }, [live]);

  const upcoming = useMemo(() => stillToCome(live), [live]);

  // Next month's worth, for the side card.
  const birthdaysSoon = useMemo(
    () => upcomingBirthdays(birthdayPeople, todayKey, 30),
    [birthdayPeople, todayKey],
  );

  // Which days the grid draws, and how the range reads in the toolbar.
  const { days, rangeLabel, isNow } = useMemo(() => {
    if (view === "day") {
      return {
        days: [new Date(anchor)],
        rangeLabel: `${anchor.getDate()} ${MONTH_SHORT[anchor.getMonth()]} ${anchor.getFullYear()}`,
        isNow: keyOf(anchor) === todayKey,
      };
    }
    if (view === "week") {
      const start = startOfWeek(anchor);
      const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      const end = week[6];
      const sameMonth = start.getMonth() === end.getMonth();
      return {
        days: week,
        rangeLabel: sameMonth
          ? `${start.getDate()} - ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`
          : `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} - ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`,
        isNow: keyOf(startOfWeek(new Date())) === keyOf(start),
      };
    }
    const total = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    return {
      days: Array.from({ length: total }, (_, i) => new Date(anchor.getFullYear(), anchor.getMonth(), i + 1)),
      rangeLabel: `${MONTH_LONG[anchor.getMonth()]} ${anchor.getFullYear()}`,
      isNow: anchor.getMonth() === new Date().getMonth() && anchor.getFullYear() === new Date().getFullYear(),
    };
  }, [view, anchor, todayKey]);

  // Keyed to the days actually on screen rather than a fixed window: a
  // birthday recurs every year, so paging to next March still has to mark it.
  const birthdayByDay = useMemo(() => {
    if (days.length === 0) return new Map<string, Birthday[]>();
    return occurrencesInRange(birthdayPeople, keyOf(days[0]), keyOf(days[days.length - 1]), todayKey);
  }, [birthdayPeople, days, todayKey]);

  function shift(direction: 1 | -1) {
    setAnchor((a) => {
      if (view === "day") return addDays(a, direction);
      if (view === "week") return addDays(a, direction * 7);
      return new Date(a.getFullYear(), a.getMonth() + direction, 1);
    });
  }

  function openSlot(day: Date, hour: number) {
    const p = (n: number) => String(n).padStart(2, "0");
    setDraft({
      id: null,
      leadId: "",
      date: keyOf(day),
      time: `${p(hour)}:00`,
      location: "",
      remarks: "",
    });
  }

  function openEdit(a: AppointmentRow) {
    const parts = isoToLocalParts(a.scheduledAt);
    setDetail(null);
    setDraft({
      id: a.id,
      leadId: a.leadId,
      date: parts.date,
      time: parts.time,
      location: a.location ?? "",
      remarks: a.remarks ?? "",
    });
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4 lg:px-[30px] lg:py-5">
      {draft && (
        <AppointmentDialog
          draft={draft}
          leads={leads}
          lockedLeadName={undefined}
          onClose={() => setDraft(null)}
        />
      )}
      {detail && (
        <DetailDialog
          appointment={detail}
          onEdit={() => openEdit(detail)}
          onClose={() => setDetail(null)}
          onChanged={() => {
            setDetail(null);
            router.refresh();
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-[16px] border border-sand bg-white px-5 py-4 dark:border-white/10 dark:bg-[#12283f]">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-taupe-2 dark:text-[#7f93aa]">
            Sales
          </div>
          <div className="mt-0.5 text-[22px] font-extrabold tracking-[-0.02em] text-navy dark:text-[#eef3f8]">
            Appointment
          </div>
          <div className="mt-[3px] text-[12.5px] font-medium text-muted dark:text-[#7f93aa]">
            Live scheduling workspace for appointments created from your lead workflow.
          </div>
        </div>
        <Link
          href="/pipeline"
          className="flex-none rounded-[10px] border border-sand-2 bg-white px-3.5 py-2.5 text-[12.5px] font-bold text-navy hover:border-navy dark:border-white/10 dark:bg-[#0b1a2b] dark:text-[#eef3f8]"
        >
          Open Tracker
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Lead base" value={leadBase} />
        <StatCard label="Appointments" value={live.length} />
        <StatCard label="Upcoming" value={upcoming.length} />
      </div>

      {/* Schedule */}
      <div className="rounded-[16px] border border-sand bg-white px-4 py-4 dark:border-white/10 dark:bg-[#12283f] lg:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sand pb-3.5 dark:border-white/10">
          <div>
            <div className="text-[13.5px] font-bold text-navy dark:text-[#eef3f8]">Schedule</div>
            <div className="mt-[2px] text-[11.5px] font-medium text-muted dark:text-[#7f93aa]">
              Choose a slot to set appointment quickly, or open existing entries.
            </div>
          </div>
          <div className="flex flex-none rounded-[9px] border border-sand-2 bg-cream p-[3px] dark:border-white/10 dark:bg-[#0b1a2b]">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-[6px] px-3 py-1.5 text-[11.5px] font-bold capitalize ${
                  view === v
                    ? "bg-navy text-white dark:bg-gold dark:text-navy"
                    : "text-taupe dark:text-[#7f93aa]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 py-3">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="text-[12.5px] font-bold text-info-blue-text hover:underline dark:text-[#8fb4dd]"
          >
            Prev
          </button>
          <span className="text-[13px] font-bold text-navy dark:text-[#eef3f8]">{rangeLabel}</span>
          {isNow ? (
            <span className="rounded-full bg-success-bg px-2 py-[2px] text-[9.5px] font-bold text-green">NOW</span>
          ) : (
            <button
              type="button"
              onClick={() => setAnchor(new Date())}
              className="rounded-full border border-sand-2 px-2 py-[2px] text-[9.5px] font-bold text-taupe hover:border-navy hover:text-navy dark:border-white/10 dark:text-[#7f93aa]"
            >
              TODAY
            </button>
          )}
          <button
            type="button"
            onClick={() => shift(1)}
            className="text-[12.5px] font-bold text-info-blue-text hover:underline dark:text-[#8fb4dd]"
          >
            Next
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {view === "month" ? (
            <MonthGrid days={days} byDay={byDay} birthdayByDay={birthdayByDay} todayKey={todayKey} onOpen={setDetail} onSlot={(d) => openSlot(d, 9)} />
          ) : (
            <TimeGrid days={days} byDay={byDay} birthdayByDay={birthdayByDay} todayKey={todayKey} onOpen={setDetail} onSlot={openSlot} />
          )}

          <div className="flex flex-col gap-4">
          <BirthdayCard birthdays={birthdaysSoon} limit={4} />
          <div className="rounded-[14px] border border-sand-2 p-3.5 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div className="text-[12.5px] font-bold text-navy dark:text-[#eef3f8]">Upcoming Appointments</div>
              <span className="text-[11px] font-bold text-taupe dark:text-[#7f93aa]">{upcoming.length}</span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {upcoming.length === 0 ? (
                <div className="rounded-[12px] border border-sand-2 px-4 py-6 text-center dark:border-white/10">
                  <div className="text-[13px] font-bold text-navy dark:text-[#eef3f8]">No upcoming appointments</div>
                  <div className="mt-1 text-[11.5px] font-medium text-muted dark:text-[#7f93aa]">
                    Click any empty calendar slot to schedule your next lead follow-up.
                  </div>
                </div>
              ) : (
                upcoming.slice(0, 12).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setDetail(a)}
                    className="rounded-[11px] border border-sand-2 bg-cream px-3 py-2.5 text-left hover:border-navy dark:border-white/10 dark:bg-[#0b1a2b]"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[12.5px] font-bold text-navy dark:text-[#eef3f8]">
                        {a.leadName}
                      </span>
                      <span className="flex-none text-[10.5px] font-bold text-warn-orange">
                        {relativeToNow(a.scheduledAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] font-medium text-muted dark:text-[#7f93aa]">
                      {new Date(a.scheduledAt).toLocaleDateString("en-MY", { day: "numeric", month: "short" })} ·{" "}
                      {formatTime(a.scheduledAt)}
                      {a.location ? ` · ${a.location}` : ""}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] border border-sand bg-cream px-4 py-3.5 dark:border-white/10 dark:bg-[#12283f]">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2 dark:text-[#7f93aa]">
        {label}
      </div>
      <div className="mt-1 text-[24px] font-extrabold tracking-[-0.02em] text-navy dark:text-[#eef3f8]">{value}</div>
    </div>
  );
}

function TimeGrid({
  days, byDay, birthdayByDay, todayKey, onOpen, onSlot,
}: {
  days: Date[];
  byDay: Map<string, AppointmentRow[]>;
  birthdayByDay: Map<string, Birthday[]>;
  todayKey: string;
  onOpen: (a: AppointmentRow) => void;
  onSlot: (day: Date, hour: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[14px] border border-sand-2 dark:border-white/10">
      <div className="min-w-[560px]">
        <div
          className="grid border-b border-sand-2 dark:border-white/10"
          style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div />
          {days.map((d) => {
            const isToday = keyOf(d) === todayKey;
            const birthdays = birthdayByDay.get(keyOf(d)) ?? [];
            return (
              <div key={keyOf(d)} className="border-l border-sand-2 py-2 text-center dark:border-white/10">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-taupe-2 dark:text-[#7f93aa]">
                  {WEEKDAY[(d.getDay() + 6) % 7]}
                </div>
                <div
                  className={`text-[13px] font-extrabold ${
                    isToday ? "text-gold" : "text-navy dark:text-[#eef3f8]"
                  }`}
                >
                  {d.getDate()}
                </div>
                {birthdays.length > 0 && (
                  <div
                    title={birthdays.map((b) => b.fullName).join(", ")}
                    className="text-[9px] leading-none"
                    aria-label={`${birthdays.length} birthday${birthdays.length === 1 ? "" : "s"}`}
                  >
                    🎂{birthdays.length > 1 ? birthdays.length : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="max-h-[480px] overflow-y-auto">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-sand-3 last:border-b-0 dark:border-white/[.07]"
              style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}
            >
              <div className="py-2 pr-2 text-right text-[10px] font-semibold text-taupe-2 dark:text-[#7f93aa]">
                {String(hour).padStart(2, "0")}:00
              </div>
              {days.map((d) => {
                const slotItems = (byDay.get(keyOf(d)) ?? []).filter(
                  (a) => new Date(a.scheduledAt).getHours() === hour,
                );
                return (
                  <button
                    key={`${keyOf(d)}-${hour}`}
                    type="button"
                    onClick={() => onSlot(d, hour)}
                    className="min-h-[46px] border-l border-sand-2 p-[3px] text-left hover:bg-cream dark:border-white/10 dark:hover:bg-white/5"
                  >
                    {slotItems.map((a) => (
                      <span
                        key={a.id}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          // The slot behind this opens a *new* appointment;
                          // clicking the chip must open the existing one.
                          e.stopPropagation();
                          onOpen(a);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            e.preventDefault();
                            onOpen(a);
                          }
                        }}
                        className={`mb-[2px] block truncate rounded-[6px] px-1.5 py-1 text-[9.5px] font-bold ${
                          STATUS_TONE[a.status] ?? STATUS_TONE.scheduled
                        }`}
                      >
                        {formatTime(a.scheduledAt)} {a.leadName}
                      </span>
                    ))}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({
  days, byDay, birthdayByDay, todayKey, onOpen, onSlot,
}: {
  days: Date[];
  byDay: Map<string, AppointmentRow[]>;
  birthdayByDay: Map<string, Birthday[]>;
  todayKey: string;
  onOpen: (a: AppointmentRow) => void;
  onSlot: (day: Date) => void;
}) {
  const lead = (days[0].getDay() + 6) % 7; // Monday-first padding

  return (
    <div className="rounded-[14px] border border-sand-2 p-2.5 dark:border-white/10">
      <div className="grid grid-cols-7 gap-1 pb-1.5 text-center text-[9px] font-bold uppercase tracking-[0.06em] text-taupe-2 dark:text-[#7f93aa]">
        {WEEKDAY.map((w) => (
          <div key={w}>{w.slice(0, 2)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((d) => {
          const key = keyOf(d);
          const items = byDay.get(key) ?? [];
          const birthdays = birthdayByDay.get(key) ?? [];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSlot(d)}
              className={`min-h-[74px] rounded-[8px] border p-1 text-left hover:bg-cream dark:hover:bg-white/5 ${
                key === todayKey
                  ? "border-gold ring-1 ring-gold"
                  : "border-sand-2 dark:border-white/10"
              }`}
            >
              <span className="flex items-center justify-between gap-1">
                <span className="text-[10.5px] font-bold text-navy dark:text-[#eef3f8]">{d.getDate()}</span>
                {birthdays.length > 0 && (
                  // A quiet marker, not a third kind of appointment: a
                  // birthday is context for the day, not something booked in
                  // it, so it never competes with a real slot.
                  <span
                    title={birthdays.map((b) => `${b.fullName}${b.turningAge ? ` (${b.turningAge})` : ""}`).join(", ")}
                    className="flex-none text-[9px] leading-none"
                    aria-label={`${birthdays.length} birthday${birthdays.length === 1 ? "" : "s"}`}
                  >
                    🎂{birthdays.length > 1 ? birthdays.length : ""}
                  </span>
                )}
              </span>
              {items.slice(0, 2).map((a) => (
                <span
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(a);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      e.preventDefault();
                      onOpen(a);
                    }
                  }}
                  className={`mt-[2px] block truncate rounded-[4px] px-1 py-[2px] text-[8.5px] font-bold ${
                    STATUS_TONE[a.status] ?? STATUS_TONE.scheduled
                  }`}
                >
                  {formatTime(a.scheduledAt)} {a.leadName}
                </span>
              ))}
              {items.length > 2 && (
                <span className="mt-[2px] block text-[8.5px] font-bold text-taupe dark:text-[#7f93aa]">
                  +{items.length - 2} more
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailDialog({
  appointment, onEdit, onClose, onChanged,
}: {
  appointment: AppointmentRow;
  onEdit: () => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<{ error: string | null }>) {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (result.error) setError(result.error);
      else onChanged();
    } catch {
      setError("Couldn't connect. Check your internet connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/55 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-elevated dark:bg-[#12283f]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[16px] font-bold text-navy dark:text-[#eef3f8]">{appointment.leadName}</div>
            <div className="mt-0.5 text-[12px] font-medium text-muted dark:text-[#7f93aa]">
              {new Date(appointment.scheduledAt).toLocaleDateString("en-MY", {
                weekday: "short", day: "numeric", month: "short", year: "numeric",
              })}{" "}
              · {formatTime(appointment.scheduledAt)}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[12.5px] font-semibold text-muted">
            Close
          </button>
        </div>

        <div className="mt-3.5 flex flex-col gap-2 border-t border-sand pt-3.5 text-[12.5px] dark:border-white/10">
          <Row label="Status" value={appointment.status} />
          {appointment.location && <Row label="Location" value={appointment.location} />}
          {appointment.agentName && <Row label="Agent" value={appointment.agentName} />}
          {appointment.remarks && <Row label="Remarks" value={appointment.remarks} />}
        </div>

        {error && <div className="mt-3 text-[12px] font-semibold text-alert-red">{error}</div>}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-sand pt-4 dark:border-white/10">
          <Link
            href={`/leads/${appointment.leadId}`}
            className="rounded-[9px] border border-sand-2 px-3 py-2 text-[12px] font-semibold text-navy dark:border-white/10 dark:text-[#eef3f8]"
          >
            Open lead
          </Link>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-[9px] border border-sand-2 px-3 py-2 text-[12px] font-semibold text-navy dark:border-white/10 dark:text-[#eef3f8]"
          >
            Reschedule
          </button>
          {appointment.status === "scheduled" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => setAppointmentStatus(appointment.id, "completed"))}
              className="rounded-[9px] bg-navy px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60 dark:bg-gold dark:text-navy"
            >
              Mark done
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => deleteAppointment(appointment.id))}
            className="ml-auto rounded-[9px] border border-[#f6d5cf] px-3 py-2 text-[12px] font-semibold text-alert-red disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-[70px] flex-none font-semibold text-taupe-2 dark:text-[#7f93aa]">{label}</span>
      <span className="flex-1 font-medium capitalize text-navy dark:text-[#eef3f8]">{value}</span>
    </div>
  );
}
