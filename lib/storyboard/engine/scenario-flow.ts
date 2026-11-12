import type { FlowSlide } from "../types";
import { num } from "./money";

type FlowInput = Omit<FlowSlide, "meter"> & { meter: number };

/**
 * Normalise a slide list. The design's buildFlow() clamps the meter to 0-100
 * and rounds it; that is the only arithmetic it does on the data. Doing it here
 * means the stored slides are already safe to render and to put in a client
 * summary.
 */
export function buildFlowSlides(data: FlowInput[]): FlowSlide[] {
  return data.map((d) => ({
    tag: d.tag,
    title: d.title,
    value: d.value,
    desc: d.desc,
    meterLabel: d.meterLabel,
    meterText: d.meterText,
    meter: Math.max(0, Math.min(100, Math.round(num(d.meter)))),
    tone: d.tone,
  }));
}

/** Next slide index for the play/pause timer (wraps). */
export function nextFlowIndex(current: number, length: number): number {
  if (length <= 0) return 0;
  return (Math.max(0, Math.floor(num(current))) + 1) % length;
}

/** Clamp a requested slide index into range. */
export function clampFlowIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, Math.floor(num(index))));
}
