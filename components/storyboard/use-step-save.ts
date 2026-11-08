"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStoryboard } from "@/app/(app)/leads/[id]/storyboard/actions";
import { STORYBOARD_MISSING_MESSAGE } from "@/lib/storyboard/schema-error";
import type { BuiltModule } from "@/lib/storyboard/modules";
import type { StoryboardStep } from "@/lib/storyboard/types";

type SaveProps = { leadId: string; savedAt: string | null; hasRow: boolean; dbReady: boolean };

/** Save state for a step screen. Steps 2-4 patch what Step 1 stored. */
export function useModuleStepSave(module: BuiltModule, props: SaveProps, step: StoryboardStep) {
  const router = useRouter();
  const [savedAt, setSavedAt] = useState<string | null>(props.savedAt);
  const [error, setError] = useState<string | null>(
    !props.dbReady ? STORYBOARD_MISSING_MESSAGE : !props.hasRow && step !== "fill" ? "Save Step 1 first, then this step can be saved." : null,
  );
  const [pending, startTransition] = useTransition();
  const blocked = !props.dbReady || (!props.hasRow && step !== "fill");

  /** `notes` is only used by the Fill step. */
  function save(inputs: Record<string, unknown>, notes?: string) {
    if (blocked) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveStoryboard({ leadId: props.leadId, module, step, inputs, notes });
        if (res.error) {
          setError(res.error);
          return;
        }
        setSavedAt(res.savedAt);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return { savedAt, error, pending, blocked, save };
}
