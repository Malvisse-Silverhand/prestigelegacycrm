"use client";

import { useEffect } from "react";
import type { PipelineStage } from "@/lib/pipeline-stages";

/**
 * Bottom sheet for moving a mobile card without dragging: the explicit
 * fallback to long-press-drag, and the only way to jump straight to a
 * non-adjacent stage on a phone.
 */
export function MoveSheet({
  name,
  fromStage,
  stages,
  counts,
  onMove,
  onClose,
}: {
  name: string;
  fromStage: PipelineStage;
  stages: { value: PipelineStage; label: string; dot: string }[];
  counts: Record<string, number>;
  onMove: (stage: PipelineStage) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fromIdx = stages.findIndex((s) => s.value === fromStage);
  const next = stages[Math.min(fromIdx + 1, stages.length - 1)];

  function pick(stage: PipelineStage) {
    onMove(stage);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 bg-navy/55" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Move ${name}`}
        className="absolute inset-x-0 bottom-0 rounded-t-[20px] bg-white p-4 pb-[max(16px,env(safe-area-inset-bottom))] animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[15px] font-bold text-navy">Move {name}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-[9px] text-taupe hover:bg-cream"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {next.value !== fromStage && (
          <button
            type="button"
            onClick={() => pick(next.value)}
            className="mb-3 flex w-full items-center justify-center rounded-[12px] bg-brand px-4 py-3 text-[13px] font-bold text-white"
          >
            Next: {next.label}
          </button>
        )}

        <div className="flex flex-col gap-1">
          {stages.map((s) => {
            const isCurrent = s.value === fromStage;
            return (
              <button
                key={s.value}
                type="button"
                disabled={isCurrent}
                onClick={() => pick(s.value)}
                className={
                  "flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold " +
                  (isCurrent ? "text-taupe-2" : "text-navy hover:bg-cream")
                }
              >
                <span className="h-[8px] w-[8px] flex-none rounded-full" style={{ background: s.dot }} />
                <span className="flex-1">{s.label}</span>
                <span className="text-[11px] font-bold text-taupe">{counts[s.value] ?? 0}</span>
                {isCurrent && <span className="text-[10.5px] font-bold text-taupe-2">Current</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
