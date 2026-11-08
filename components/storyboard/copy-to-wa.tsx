"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "./lang-context";

type Props = {
  text: string;
  label?: string;
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyToWa({ text, label }: Props) {
  const { t } = useT();
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  async function onClick() {
    const ok = await copyText(text);
    setState(ok ? "ok" : "fail");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2400);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex min-h-11 items-center justify-center rounded-[12px] border border-brand bg-white px-5 text-sm font-semibold text-navy hover:bg-sand-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {label ?? t("common.copy")}
      </button>
      <span role="status" aria-live="polite" className="text-xs font-semibold">
        {state === "ok" ? <span className="sb-pop inline-block text-green">{t("common.copied")} ✓</span> : null}
        {state === "fail" ? <span className="text-alert-red">{t("common.copyFailed")}</span> : null}
      </span>
    </div>
  );
}
