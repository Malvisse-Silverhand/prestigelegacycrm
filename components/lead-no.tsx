// The short id a lead is referred to by out loud. Deliberately quiet: it is a
// reference, not a fact about the person, so it never competes with the name.
export function LeadNo({ no, className = "" }: { no: number | null | undefined; className?: string }) {
  if (no == null) return null;
  return (
    <span
      className={`flex-none rounded-[5px] bg-cream px-[5px] py-[1px] font-mono text-[10px] font-bold text-taupe-2 ${className}`}
      title={`Lead #${no}`}
    >
      #{no}
    </span>
  );
}
