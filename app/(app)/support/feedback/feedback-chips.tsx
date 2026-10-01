import Link from "next/link";

export const CHIP = "inline-flex flex-none items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-bold";
export const FIELD =
  "w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold";
export const LABEL = "mb-1.5 block text-[12px] font-bold text-navy";
export const SMALL_BTN =
  "rounded-[8px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-navy disabled:opacity-40";
export const PRIMARY_BTN =
  "rounded-[10px] border border-brand bg-brand px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60";

export function StatusChip({ open }: { open: boolean }) {
  return (
    <span className={`${CHIP} ${open ? "bg-success-bg text-green" : "bg-cream text-taupe"}`}>
      {open ? "Open" : "Closed"}
    </span>
  );
}

// Shown in place of a page when the feedback tables aren't there yet.
export function NotSetUp() {
  return (
    <div className="px-5 py-10 lg:px-[30px]">
      <div className="mx-auto max-w-md rounded-2xl border border-sand bg-white p-6 text-center">
        <div className="text-[15px] font-bold text-navy">Feedback isn&apos;t set up yet</div>
        <p className="mt-1.5 text-[12.5px] font-medium text-muted">
          The database migration needs to be run before this page can work. Ask your SuperAdmin to apply the latest
          migration, then reload.
        </p>
      </div>
    </div>
  );
}

export function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-5 py-10 lg:px-[30px]">
      <div className="mx-auto max-w-md rounded-2xl border border-sand bg-white p-6 text-center">
        <div className="text-[15px] font-bold text-navy">{title}</div>
        <p className="mt-1.5 text-[12.5px] font-medium text-muted">{body}</p>
        <Link
          href="/support/feedback"
          className="mt-4 inline-block rounded-[10px] border border-sand-2 px-4 py-2 text-[13px] font-semibold text-navy"
        >
          Back to feedback
        </Link>
      </div>
    </div>
  );
}
