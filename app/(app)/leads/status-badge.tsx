const STATUS_STYLE: Record<string, string> = {
  hot: "bg-alert-red-bg text-alert-red",
  warm: "bg-warn-gold-bg text-warn-gold-text",
  cold: "bg-info-blue-bg text-info-blue-text",
  unassigned: "bg-sand-3 text-taupe-2",
  closed: "bg-success-bg text-green",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-[7px] px-[9px] py-1 text-[10.5px] font-bold capitalize ${STATUS_STYLE[status] ?? "bg-sand-3 text-taupe-2"}`}
    >
      {status}
    </span>
  );
}
