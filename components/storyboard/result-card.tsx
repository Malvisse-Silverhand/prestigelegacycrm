import type { ReactNode } from "react";

type Row = { label: string; value: string; tone?: "bad" };

/** The dark result panel: one big figure, a line of context and a few rows. */
export function ResultCard({
  heading,
  big,
  context,
  rows,
  ariaLabel = "Result",
  children,
}: {
  heading: string;
  big: string;
  context?: ReactNode;
  rows?: Row[];
  ariaLabel?: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-[20px] bg-navy p-5 text-cream shadow-card" aria-label={ariaLabel}>
      <div className="text-[15px] text-white/80">{heading}</div>
      <div className="mt-1 text-[40px] font-bold leading-[1.1] tracking-tight text-gold tabular-nums">{big}</div>
      {context ? <div className="mt-1 text-[13px] text-white/70">{context}</div> : null}
      {rows && rows.length > 0 ? (
        <dl className="m-0 mt-4 flex flex-col gap-1.5">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-3 rounded-[8px] bg-white/10 px-3 py-2">
              <dt className="text-[13px] text-white/75">{r.label}</dt>
              <dd className={`m-0 text-right text-sm font-bold tabular-nums ${r.tone === "bad" ? "text-[#ffb4a8]" : ""}`}>{r.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
    </section>
  );
}
