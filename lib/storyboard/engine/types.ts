import type { FlowSlide } from "../types";

export type { FlowSlide };

export type LegendItem = { label: string; value: string; tone: "good" | "bad" | "neutral" | "warn" };

/** The shape every computeX returns, matching the design's renderVals(). */
export type EngineResult<Out, Scene> = {
  out: Out;
  scene: Scene;
  legend: LegendItem[];
  caption: string;
  flow: FlowSlide[];
  warnings: string[];
};

export type Placeholder = { label: string; amount: number; source: string };
