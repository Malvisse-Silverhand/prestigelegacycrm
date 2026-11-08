"use client";

import { useState, type CSSProperties } from "react";
import type { BusinessScene } from "@/lib/storyboard/engine/business";

// Face colours per column: top, side shade, lighter side.
const COLORS = [
  ["#fac748", "#c99a2e", "#e3b23c"],
  ["#6f9be0", "#3f6db3", "#5583c9"],
  ["#ff8d7e", "#c75a4c", "#e57263"],
  ["#4fbf86", "#2f8a5d", "#3fa673"],
];
export const BUSINESS_SWATCH = COLORS.map((c) => c[0]);

const W = 56;
const POS: [number, number][] = [[-95, -60], [95, -60], [-95, 80], [95, 80]];
const DELAY = ["0s", ".15s", ".3s", ".45s"];

const face: CSSProperties = { position: "absolute", boxSizing: "border-box" };

/**
 * Four columns (keyman, buy-sell, loan, enterprise) around the owner, built from
 * CSS 3D transforms only. The stage turns slowly; the Pause button (and the
 * reduced-motion setting) stops it. The same figures are in the table below the
 * chart, so nothing depends on the animation.
 */
export function BusinessChart3D({ scene }: { scene: BusinessScene }) {
  const [still, setStill] = useState(false);
  const max = Math.max(1, ...scene.columns.map((c) => c.amount));

  return (
    <div className={still ? "sb-3d-still" : ""}>
      <div
        role="img"
        aria-label={scene.label}
        className="relative h-[280px] overflow-hidden"
        style={{ background: "radial-gradient(120% 90% at 50% 10%, #ffffff 0%, #fdf9f3 55%, #efe6d2 100%)" }}
      >
        <div className="sb-3d-scene absolute inset-0 flex items-center justify-center">
          <div className="sb-3d-stage relative h-0 w-0" style={{ top: 70 }}>
            <div
              style={{
                position: "absolute", left: -170, top: -170, width: 340, height: 340, transform: "rotateX(90deg)", borderRadius: "50%",
                background: "radial-gradient(circle, rgba(250,199,72,0.25) 0%, rgba(250,199,72,0.05) 55%, rgba(0,0,0,0) 70%)",
              }}
            />
            <div
              style={{
                position: "absolute", left: -150, top: -150, width: 300, height: 300, transform: "rotateX(90deg)",
                backgroundImage: "linear-gradient(rgba(15,37,64,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(15,37,64,0.10) 1px, transparent 1px)",
                backgroundSize: "30px 30px",
              }}
            />
            {scene.columns.map((c, i) => {
              const H = Math.max(6, Math.round((170 * c.amount) / max));
              const [top, dark, mid] = COLORS[i] ?? COLORS[0];
              const [px, pz] = POS[i] ?? POS[0];
              return (
                <div
                  key={c.label}
                  className="sb-3d-col"
                  style={{ position: "absolute", left: -W / 2, top: -H, width: W, height: H, transform: `translate3d(${px}px, 0, ${pz}px)` }}
                >
                  <div className="sb-3d-col sb-3d-grow" style={{ position: "absolute", inset: 0, animationDelay: DELAY[i] }}>
                    <div
                      style={{
                        ...face, inset: 0, transform: `translateZ(${W / 2}px)`, background: `linear-gradient(180deg, ${top}, ${dark})`, color: "#0f2540",
                        display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 6, gap: 2, borderRadius: 3,
                        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)",
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em" }}>{c.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{c.text}</span>
                    </div>
                    <div style={{ ...face, inset: 0, transform: `rotateY(180deg) translateZ(${W / 2}px)`, background: dark }} />
                    <div style={{ ...face, top: 0, left: 0, width: W, height: H, transform: `rotateY(90deg) translateZ(${W / 2}px)`, background: `linear-gradient(180deg, ${mid}, ${dark})` }} />
                    <div style={{ ...face, top: 0, left: 0, width: W, height: H, transform: `rotateY(-90deg) translateZ(${W / 2}px)`, background: dark }} />
                    <div style={{ ...face, left: 0, top: -W / 2, width: W, height: W, transform: "rotateX(90deg)", background: top, boxShadow: `0 0 24px ${top}` }} />
                  </div>
                </div>
              );
            })}
            <div className="sb-pulse" style={{ position: "absolute", left: -22, top: -44, width: 44, height: 44, borderRadius: "50%", background: "#fac748", boxShadow: "0 0 30px #fac748" }} />
          </div>
        </div>
      </div>
      <div className="flex justify-end border-t border-sand bg-white px-3 py-1.5">
        <button
          type="button"
          aria-pressed={still}
          onClick={() => setStill((s) => !s)}
          className="min-h-11 rounded-[10px] px-3 text-xs font-semibold text-navy hover:bg-sand-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {still ? "Resume rotation" : "Pause rotation"}
        </button>
      </div>
    </div>
  );
}
