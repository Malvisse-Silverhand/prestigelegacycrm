"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStoryboard } from "@/app/(app)/leads/[id]/storyboard/actions";
import { STORYBOARD_MISSING_MESSAGE } from "@/lib/storyboard/schema-error";
import type { StoryboardStep } from "@/lib/storyboard/types";
import type { HibahScreenProps } from "./types";

/** Save state for a step screen. Steps 2-4 patch what Step 1 stored. */
export function useStepSave(props: Pick<HibahScreenProps, "leadId" | "savedAt" | "hasRow" | "dbReady">, step: StoryboardStep) {
  const router = useRouter();
  const [savedAt, setSavedAt] = useState<string | null>(props.savedAt);
  const [error, setError] = useState<string | null>(
    !props.dbReady ? STORYBOARD_MISSING_MESSAGE : !props.hasRow && step !== "fill" ? "Save Step 1 first, then this step can be saved." : null,
  );
  const [pending, startTransition] = useTransition();
  const blocked = !props.dbReady || (!props.hasRow && step !== "fill");

  function save(inputs: Record<string, unknown>) {
    if (blocked) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveStoryboard({ leadId: props.leadId, module: "hibah", step, inputs });
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
