"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPracticeStoryboard } from "@/app/(app)/storyboards/practice-actions";
import { BUILT_MODULES, moduleName, type BuiltModule } from "@/lib/storyboard/modules";
import { useT } from "../lang-context";
import { BTN_GHOST } from "../hibah/fields";

/** One button per built module; creates an empty practice session and opens it. */
export function NewPracticeButtons({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();
  const { t, lang } = useT();
  const [pendingModule, setPendingModule] = useState<BuiltModule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start(module: BuiltModule) {
    setError(null);
    setPendingModule(module);
    startTransition(async () => {
      try {
        const res = await createPracticeStoryboard({ module, lang });
        if (res.error || !res.id) {
          setError(res.error ?? t("practice.err.createFailed"));
          setPendingModule(null);
          return;
        }
        router.push(`/storyboards/practice/${res.id}/fill`);
      } catch {
        setError(t("common.connectError"));
        setPendingModule(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-xs font-bold uppercase tracking-wide text-muted-2">{t("practice.newHeading")}</p>
      <div className="flex flex-wrap gap-2">
        {BUILT_MODULES.map((m) => (
          <button
            key={m}
            type="button"
            disabled={disabled || pending}
            aria-label={t("practice.newAria", { module: moduleName(m, lang) })}
            onClick={() => start(m)}
            className={BTN_GHOST}
          >
            {pendingModule === m ? t("practice.creating") : `+ ${moduleName(m, lang)}`}
          </button>
        ))}
      </div>
      <span role="status" aria-live="polite" className="text-xs font-semibold text-alert-red">
        {error}
      </span>
    </div>
  );
}
