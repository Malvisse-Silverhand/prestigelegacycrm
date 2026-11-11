"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/icons";

const LABEL = "text-[11px] font-bold tracking-[0.06em] text-taupe-2 uppercase";
const CONTROL =
  "mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13.5px] font-semibold text-navy outline-none focus:border-brand";

// Ringgit amounts are typed as plain digits and shown grouped ("280,000"), so
// a long figure is still readable at a glance while the prospect watches.
export function MoneyField({
  label,
  value,
  onChange,
  hint,
  prefix = "RM",
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  prefix?: string;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute top-1/2 left-3 mt-[3px] -translate-y-1/2 text-[12px] font-bold text-taupe">
            {prefix}
          </span>
        )}
        <input
          inputMode="numeric"
          value={value ? value.toLocaleString("en-MY") : ""}
          placeholder="0"
          onChange={(e) => onChange(Number(e.target.value.replace(/[^\d.]/g, "")) || 0)}
          className={`${CONTROL} tabular-nums ${prefix ? "pl-10" : ""}`}
        />
      </div>
      {hint && <span className="mt-1 block text-[11px] font-medium text-taupe">{hint}</span>}
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
          className={`${CONTROL} tabular-nums`}
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-3 mt-[3px] -translate-y-1/2 text-[12px] font-bold text-taupe">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={CONTROL} />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={CONTROL}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div>
      {label && <span className={LABEL}>{label}</span>}
      <div className="mt-1.5 flex flex-wrap gap-1 rounded-[12px] border border-sand-2 bg-cream p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              value === o.value
                ? "flex-1 rounded-[9px] bg-brand px-3 py-2 text-[12.5px] font-bold text-white shadow-sm"
                : "flex-1 rounded-[9px] px-3 py-2 text-[12.5px] font-semibold text-muted hover:text-navy"
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CheckChip({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={
        checked
          ? "flex items-start gap-2.5 rounded-[12px] border border-brand bg-brand/[.06] px-3 py-2.5 text-left text-[12.5px] font-semibold text-navy"
          : "flex items-start gap-2.5 rounded-[12px] border border-sand-2 bg-white px-3 py-2.5 text-left text-[12.5px] font-medium text-ink hover:border-taupe"
      }
    >
      <span
        className={`mt-px flex h-4 w-4 flex-none items-center justify-center rounded-[5px] border ${
          checked ? "border-brand bg-brand text-gold" : "border-sand-2 bg-white"
        }`}
      >
        {checked && (
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

export function Group({
  title,
  step,
  children,
  defaultOpen = false,
}: {
  title: string;
  step?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-[16px] border border-sand bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        {step !== undefined && (
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand text-[11px] font-bold text-gold">
            {step}
          </span>
        )}
        <span className="flex-1 text-[14px] font-bold text-navy">{title}</span>
        <ChevronDownIcon width={15} height={15} className={`text-taupe transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="grid grid-cols-1 gap-3.5 border-t border-sand-3 px-4 pt-3.5 pb-4 sm:grid-cols-2">{children}</div>}
    </section>
  );
}
