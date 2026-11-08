import type { LegendItem } from "@/lib/storyboard/engine/types";
import { TONE_SWATCH } from "./hibah/hibah-shield";

/** Legend rows under a scene: a coloured square, the label and the figure. */
export function SceneLegend({ items, swatches }: { items: LegendItem[]; swatches?: string[] }) {
  return (
    <>
      {items.map((l, i) => (
        <span key={l.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: swatches?.[i] ?? TONE_SWATCH[l.tone] }} />
          {l.label} <b className="tabular-nums text-navy">{l.value}</b>
        </span>
      ))}
    </>
  );
}
