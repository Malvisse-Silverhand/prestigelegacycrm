"use client";

import { useId, useState, type ReactNode } from "react";
import { useT } from "./lang-context";

type Props = {
  children: ReactNode;
  defaultOpen?: boolean;
  label?: string;
};

export function CustomizeToggle({ children, defaultOpen = false, label }: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center justify-center rounded-[12px] border border-sand bg-white px-4 text-[13px] font-semibold text-navy hover:bg-sand-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {open ? t("common.hideCustomize") : (label ?? t("common.customize"))}
      </button>
      <div id={id} hidden={!open} className="mt-3">
        {children}
      </div>
    </div>
  );
}
