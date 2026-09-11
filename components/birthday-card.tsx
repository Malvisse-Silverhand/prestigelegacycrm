import Link from "next/link";
import type { Birthday } from "@/lib/birthdays";
import { birthdayWhen, birthdayWish } from "@/lib/birthdays";
import { waLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/icons";

function CakeIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 20h16v-6a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3z" />
      <path d="M4 15c1.6 1.4 3.1 1.4 4.6 0s3-1.4 4.6 0 3.1 1.4 4.6 0" />
      <path d="M12 8V5M8.5 8V6M15.5 8V6" />
    </svg>
  );
}

// Deliberately quiet: this sits alongside the numbers people actually come to
// the dashboard for, so it earns its place by being small and only appearing
// when there is something to act on.
export function BirthdayCard({
  birthdays,
  className = "",
  limit = 4,
  /** The dashboard's row of lead-list cards all cap at 6 visible rows and
   *  scroll for the rest, rather than truncating with a "+N more" line --
   *  opt-in here so the Appointments page sidebar, which passes a fixed
   *  `limit`, keeps its existing shape. */
  scrollable = false,
}: {
  birthdays: Birthday[];
  className?: string;
  limit?: number;
  scrollable?: boolean;
}) {
  if (birthdays.length === 0) return null;

  const shown = scrollable ? birthdays : birthdays.slice(0, limit);
  const todayCount = birthdays.filter((b) => b.daysAway === 0).length;

  return (
    <div className={`rounded-2xl border border-sand bg-white p-4 shadow-card ${className}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] bg-warn-gold-bg text-warn-gold-text">
          <CakeIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-navy">Birthdays</div>
          <div className="text-[11px] font-medium text-taupe">
            {todayCount > 0
              ? `${todayCount} today · ${birthdays.length} this month`
              : `${birthdays.length} coming up`}
          </div>
        </div>
      </div>

      <div className={scrollable ? "mt-3 flex max-h-[358px] flex-col gap-1.5 overflow-y-auto pr-1" : "mt-3 flex flex-col gap-1.5"}>
        {shown.map((b) => (
          <div
            key={b.id}
            className={`flex items-center gap-2.5 rounded-[11px] px-2.5 py-2 ${
              b.daysAway === 0 ? "bg-warn-gold-bg" : "bg-cream"
            }`}
          >
            <div className="min-w-0 flex-1">
              <Link href={`/leads/${b.id}`} className="block truncate text-[12.5px] font-bold text-navy hover:underline">
                {b.fullName}
              </Link>
              <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-taupe">
                <span className={b.daysAway === 0 ? "font-bold text-warn-gold-text" : ""}>
                  {birthdayWhen(b.daysAway)}
                </span>
                {b.turningAge !== null && <span>· turns {b.turningAge}</span>}
                <span
                  className={`rounded-[4px] px-1 py-[1px] text-[8.5px] font-bold tracking-[0.05em] ${
                    b.isClient ? "bg-success-bg text-green" : "bg-info-blue-bg text-info-blue-text"
                  }`}
                >
                  {b.isClient ? "CLIENT" : "LEAD"}
                </span>
              </div>
            </div>
            <a
              href={waLink(b.phone, birthdayWish(b))}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Wish ${b.fullName} on WhatsApp`}
              title="Send birthday wish"
              className="press flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-green text-white"
            >
              <WhatsAppIcon width={14} height={14} fill="#fff" />
            </a>
          </div>
        ))}
      </div>

      {!scrollable && birthdays.length > shown.length && (
        <div className="mt-2 text-[11px] font-medium text-taupe">
          +{birthdays.length - shown.length} more this month
        </div>
      )}
    </div>
  );
}
