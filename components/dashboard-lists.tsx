import Link from "next/link";
import { LeadNo } from "@/components/lead-no";
import { formatTime, relativeToNow } from "@/lib/appointments";

export type UpcomingAppointment = {
  id: string;
  leadId: string;
  leadName: string;
  scheduledAt: string;
  location: string | null;
};

export type RecentLead = {
  id: string;
  leadNo: number;
  fullName: string;
  status: string;
  stage: string;
  agentName: string | null;
  createdAt: string;
};

const STATUS_TONE: Record<string, string> = {
  hot: "bg-alert-red-bg text-alert-red",
  warm: "bg-warn-gold-bg text-warn-gold-text",
  cold: "bg-info-blue-bg text-info-blue-text",
  closed: "bg-success-bg text-green",
  unassigned: "bg-sand-2 text-taupe-2",
};

function Shell({
  title,
  count,
  icon,
  children,
  empty,
  href,
}: {
  title: string;
  count: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  empty: boolean;
  href: string;
}) {
  return (
    <div className="rounded-2xl border border-sand bg-white p-4 shadow-card dark:border-white/10 dark:bg-[#12283f]">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] bg-cream text-navy dark:bg-white/10 dark:text-[#eef3f8]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-navy dark:text-[#eef3f8]">{title}</div>
          <div className="text-[11px] font-medium text-taupe dark:text-[#7f93aa]">{count}</div>
        </div>
        <Link href={href} className="flex-none text-[11px] font-semibold text-green hover:underline">
          View all
        </Link>
      </div>
      {empty ? (
        <p className="mt-3 text-[11.5px] font-medium text-muted dark:text-[#7f93aa]">Nothing here yet.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-1.5">{children}</div>
      )}
    </div>
  );
}

export function UpcomingAppointmentsCard({ appointments }: { appointments: UpcomingAppointment[] }) {
  return (
    <Shell
      title="Upcoming appointments"
      count={`${appointments.length} scheduled`}
      href="/appointments"
      empty={appointments.length === 0}
      icon={
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
        </svg>
      }
    >
      {appointments.map((a) => (
        <Link
          key={a.id}
          href={`/leads/${a.leadId}`}
          className="flex items-center gap-2.5 rounded-[11px] bg-cream px-2.5 py-2 dark:bg-white/5"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-bold text-navy dark:text-[#eef3f8]">{a.leadName}</div>
            <div className="truncate text-[10.5px] font-medium text-taupe dark:text-[#7f93aa]">
              {new Date(a.scheduledAt).toLocaleDateString("en-MY", { day: "numeric", month: "short" })} ·{" "}
              {formatTime(a.scheduledAt)}
              {a.location ? ` · ${a.location}` : ""}
            </div>
          </div>
          <span className="flex-none text-[10.5px] font-bold text-warn-orange">{relativeToNow(a.scheduledAt)}</span>
        </Link>
      ))}
    </Shell>
  );
}

export function RecentLeadsCard({ leads }: { leads: RecentLead[] }) {
  return (
    <Shell
      title="Recently added leads"
      count={`${leads.length} newest`}
      href="/leads"
      empty={leads.length === 0}
      icon={
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
          <circle cx="10" cy="8" r="3.4" />
          <path d="M3.5 20v-1.6A4.4 4.4 0 0 1 8 14h4a4.4 4.4 0 0 1 4.4 4.4V20" />
          <path d="M18.5 6.5v5M16 9h5" />
        </svg>
      }
    >
      {leads.map((l) => (
        <Link
          key={l.id}
          href={`/leads/${l.id}`}
          className="flex items-center gap-2.5 rounded-[11px] bg-cream px-2.5 py-2 dark:bg-white/5"
        >
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <LeadNo no={l.leadNo} />
              <span className="truncate text-[12.5px] font-bold text-navy dark:text-[#eef3f8]">{l.fullName}</span>
            </div>
            <div className="truncate text-[10.5px] font-medium text-taupe dark:text-[#7f93aa]">
              {l.agentName ?? "Unassigned"} ·{" "}
              {new Date(l.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
            </div>
          </div>
          <span
            className={`flex-none rounded-[5px] px-[6px] py-[1px] text-[9.5px] font-bold capitalize ${
              STATUS_TONE[l.status] ?? STATUS_TONE.unassigned
            }`}
          >
            {l.status}
          </span>
        </Link>
      ))}
    </Shell>
  );
}
