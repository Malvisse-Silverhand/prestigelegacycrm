"use client";

import { useId, type ReactNode } from "react";

const INPUT =
  "min-h-11 w-full rounded-[10px] border border-sand-2 bg-white px-3 text-[15px] text-navy tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand";

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-navy">
        {label}
      </label>
      {children}
      {hint ? <span className="text-xs text-muted-2">{hint}</span> : null}
    </div>
  );
}

export function NumberField({
  label,
  hint,
  value,
  onChange,
  decimal = false,
  negative = false,
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (next: string) => void;
  decimal?: boolean;
  negative?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(negative ? /[^0-9.\-]/g : /[^0-9.]/g, ""))}
        className={INPUT}
      />
    </Field>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  maxLength = 40,
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT}
      />
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={INPUT.replace("tabular-nums", "")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 rounded-[8px] border-l-4 border-info-blue-mid bg-info-blue-bg-2 px-3 py-2.5 text-[13px] leading-relaxed text-navy">
      {children}
    </p>
  );
}

export const CARD = "rounded-[20px] border border-sand bg-white p-4 shadow-card sm:p-5";
export const BTN_PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-[12px] bg-brand px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60";
export const BTN_GHOST =
  "inline-flex min-h-11 items-center justify-center rounded-[12px] border border-sand-2 bg-white px-4 text-[13px] font-semibold text-navy hover:bg-sand-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60";
