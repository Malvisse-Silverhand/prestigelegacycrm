import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "./constants";

const CHIP = "inline-flex flex-none items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-bold";

const PRIORITY_STYLE: Record<TicketPriority, string> = {
  urgent: "bg-alert-red-bg text-alert-red",
  high: "bg-warn-gold-bg text-warn-gold-text",
  normal: "bg-info-blue-bg text-info-blue-text",
  low: "bg-cream text-taupe",
};

const STATUS_STYLE: Record<TicketStatus, string> = {
  open: "bg-info-blue-bg text-info-blue-text",
  in_progress: "bg-warn-gold-bg text-warn-gold-text",
  waiting_on_agent: "bg-alert-red-bg text-alert-red",
  resolved: "bg-success-bg text-green",
  closed: "bg-cream text-taupe",
};

export function StatusChip({ status }: { status: TicketStatus }) {
  return <span className={`${CHIP} ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function PriorityChip({ priority }: { priority: TicketPriority }) {
  return <span className={`${CHIP} ${PRIORITY_STYLE[priority]}`}>{PRIORITY_LABEL[priority]}</span>;
}

export function CategoryChip({ category }: { category: TicketCategory }) {
  return <span className={`${CHIP} border border-sand-2 bg-white text-muted`}>{CATEGORY_LABEL[category]}</span>;
}

// Shown in place of a page when the support tables aren't there yet.
export function NotSetUp() {
  return (
    <div className="px-5 py-10 lg:px-[30px]">
      <div className="mx-auto max-w-md rounded-2xl border border-sand bg-white p-6 text-center">
        <div className="text-[15px] font-bold text-navy">Support isn&apos;t set up yet</div>
        <p className="mt-1.5 text-[12.5px] font-medium text-muted">
          The database migration for tickets needs to be run before this page can work. Ask your SuperAdmin to apply the
          latest migration, then reload.
        </p>
      </div>
    </div>
  );
}
