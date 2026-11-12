"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStoryboard } from "@/app/(app)/leads/[id]/storyboard/actions";
import type { BuiltModule } from "@/lib/storyboard/modules";
import type { StoryboardTarget } from "@/lib/storyboard/target";
import type { StoryboardStep } from "@/lib/storyboard/types";
import { useT } from "./lang-context";

type SaveProps = {
  target: StoryboardTarget;
  readOnly?: boolean;
  savedAt: string | null;
  hasRow: boolean;
  dbReady: boolean;
};

/** Save state for a step screen. Steps 2-4 patch what Step 1 stored. */
export function useModuleStepSave(module: BuiltModule, props: SaveProps, step: StoryboardStep) {
  const router = useRouter();
  const { t, lang } = useT();
  const [savedAt, setSavedAt] = useState<string | null>(props.savedAt);
  const [error, setError] = useState<string | null>(
    !props.dbReady
      ? t("err.dbMissing")
      : props.readOnly
        ? t("practice.err.readOnly")
        : !props.hasRow && step !== "fill"
          ? t("err.saveStep1Then")
          : null,
  );
  const [pending, startTransition] = useTransition();
  const blocked = !props.dbReady || props.readOnly === true || (!props.hasRow && step !== "fill");

  /** `notes` is only used by the Fill step. */
  function save(inputs: Record<string, unknown>, notes?: string) {
    if (blocked) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveStoryboard({ target: props.target, module, step, inputs, notes, lang });
        if (res.error) {
          setError(res.error);
          return;
        }
        setSavedAt(res.savedAt);
        router.refresh();
      } catch {
        setError(t("common.connectError"));
      }
    });
  }

  return { savedAt, error, pending, blocked, save };
}
