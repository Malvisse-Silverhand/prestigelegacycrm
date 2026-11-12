"use client";

import { useId, useState, type ReactNode } from "react";

type Props = {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function Accordion({ title, children, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `${id}-panel`;
  const headId = `${id}-head`;
  return (
    <div className="rounded-[20px] border border-sand bg-white shadow-card">
      <h3 className="m-0">
        <button
          type="button"
          id={headId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[20px] px-4 py-3 text-left text-sm font-bold text-navy focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
        >
          <span>{title}</span>
          <span
            aria-hidden="true"
            className={`sb-reduce-transition text-muted-2 transition-transform ${open ? "rotate-180" : ""}`}
          >
            &#9662;
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headId}
        hidden={!open}
        className="px-4 pb-4 text-[13px] leading-relaxed text-ink"
      >
        {children}
      </div>
    </div>
  );
}
