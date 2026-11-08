"use client";

import { useState, type ReactNode } from "react";
import { SceneFrame } from "./scene-frame";
import { BTN_GHOST } from "./hibah/fields";

export type Situation = { title: string; sub: string };

type Props = {
  situations: Situation[];
  /** Renders the 2D/3D scene for the chosen situation. */
  render: (index: number) => ReactNode;
  label?: string;
};

/** The "Show the situation" list on the left and the scene on the right (Step 2). */
export function SituationPicker({ situations, render, label = "Show the situation · 2D" }: Props) {
  const [scene, setScene] = useState(0);
  const count = situations.length;
  return (
    <section aria-label="Situations" className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-2">{label}</span>
        {situations.map((s, i) => (
          <button
            key={s.title}
            type="button"
            aria-pressed={scene === i}
            onClick={() => setScene(i)}
            className={`flex min-h-14 items-center gap-3 rounded-[14px] border px-3.5 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              scene === i ? "border-navy bg-navy text-cream" : "border-sand bg-white text-navy"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[13px] font-bold ${
                scene === i ? "bg-gold text-navy" : "border border-sand bg-cream text-navy"
              }`}
            >
              {i + 1}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-bold">{s.title}</span>
              <span className={`text-xs ${scene === i ? "text-white/75" : "text-muted-2"}`}>{s.sub}</span>
            </span>
          </button>
        ))}
        <div className="flex gap-2">
          <button type="button" className={BTN_GHOST} onClick={() => setScene((scene + count - 1) % count)} aria-label="Previous situation">
            ‹ Prev
          </button>
          <button type="button" className={BTN_GHOST} onClick={() => setScene((scene + 1) % count)} aria-label="Next situation">
            Next ›
          </button>
        </div>
      </div>
      <SceneFrame caption={<span className="font-semibold text-navy">{situations[scene]?.title}</span>}>{render(scene)}</SceneFrame>
    </section>
  );
}
