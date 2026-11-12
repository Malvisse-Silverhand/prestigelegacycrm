"use client";

import { useId, type ReactNode } from "react";

export * from "./hibah/fields";

const INPUT_CLS =
  "min-h-11 w-full rounded-[10px] border border-sand-2 bg-white px-3 text-[15px] text-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand";

/** A row of mutually exclusive chips (radio group), e.g. 50% / 70% / 100%. */
export function ChipGroup<T extends string | number>({
  legend,
  hint,
  value,
  onChange,
  options,
}: {
  legend: ReactNode;
  hint?: ReactNode;
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={typeof legend === "string" ? legend : undefined} className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-navy">{legend}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={`min-h-11 rounded-full border px-4 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                on ? "border-navy bg-navy text-cream" : "border-sand-2 bg-white text-navy hover:bg-sand-3"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {hint ? <span className="text-xs text-muted-2">{hint}</span> : null}
    </div>
  );
}

/** A tick box row with a label and an optional hint. */
export function CheckRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[10px] border border-sand px-3 py-2 hover:bg-sand-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 flex-none accent-[var(--brand-primary)]"
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-semibold text-navy">{label}</span>
        {hint ? <span className="text-xs text-muted-2">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Multi-line agent notes. */
export function TextAreaField({
  label,
  hint,
  value,
  onChange,
  rows = 3,
  maxLength = 2000,
  placeholder,
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-navy">{label}</label>
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-sm text-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
      />
      {hint ? <span className="text-xs text-muted-2">{hint}</span> : null}
    </div>
  );
}

/** Amber warning box used for compliance reminders and engine warnings. */
export function Warn({ children, role }: { children: ReactNode; role?: "alert" | "status" }) {
  return (
    <p role={role} className="m-0 rounded-[10px] border border-warn-orange bg-warn-gold-bg px-3 py-2.5 text-[13px] font-semibold leading-relaxed text-warn-gold-text">
      {children}
    </p>
  );
}

export { INPUT_CLS };
