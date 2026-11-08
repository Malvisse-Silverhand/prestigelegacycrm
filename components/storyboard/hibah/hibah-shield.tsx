import { useId } from "react";
import type { HibahOut, HibahScene } from "@/lib/storyboard/engine/hibah";

const SHIELD = "M280,22 L352,48 L352,110 C352,156 322,182 280,200 C238,182 208,156 208,110 L208,48 Z";
const WAVE = "M0,8 " + "q20,-8 40,0 t40,0 ".repeat(8) + "L640,240 L0,240 Z";

/** The family shield: green fills up as more of the need is in place. */
export function HibahShield({ scene, out }: { scene: HibahScene; out: Pick<HibahOut, "pct" | "text"> }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clip = `shield-clip-${uid}`;
  const fill = `shield-fill-${uid}`;
  return (
    <svg role="img" aria-label={scene.label} viewBox="0 0 560 214" width="100%" className="block">
      <defs>
        <clipPath id={clip}>
          <path d={SHIELD} />
        </clipPath>
        <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f9e6a" />
          <stop offset="1" stopColor="#0f7a4c" />
        </linearGradient>
      </defs>
      <rect x="0" y="206" width="560" height="24" fill="#efe6d2" />

      <g aria-hidden="true">
        <text x="70" y="40" textAnchor="middle" fontSize="12" fontWeight="600" fill="#0f4c35">ALREADY IN PLACE</text>
        <text x="70" y="60" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0f2540">{out.text.have}</text>
        <rect x="38" y="150" width="64" height="12" rx="6" fill="#e3a823" />
        <rect x="38" y="138" width="64" height="12" rx="6" fill="#fac748" />
        <rect x="38" y="126" width="64" height="12" rx="6" fill="#e3a823" />
        <rect x="38" y="114" width="64" height="12" rx="6" fill="#fac748" />
      </g>

      <path d={SHIELD} fill="#e8edf4" />
      <g clipPath={`url(#${clip})`} aria-hidden="true">
        <g transform={`translate(140, ${scene.level.toFixed(1)})`}>
          <path d={WAVE} fill="#8fd0ad" opacity="0.7" />
          <path d={WAVE} fill={`url(#${fill})`} />
        </g>
      </g>
      <path d={SHIELD} fill="none" stroke="#0f2540" strokeWidth="4" strokeLinejoin="round" />

      <g aria-hidden="true" fill="#0f2540">
        <circle cx="256" cy="118" r="10" />
        <path d="M241,158 C241,140 248,132 256,132 C264,132 271,140 271,158 Z" />
        <circle cx="304" cy="120" r="9" />
        <path d="M290,158 C290,141 297,134 304,134 C311,134 318,141 318,158 Z" />
        <circle cx="280" cy="140" r="7" />
        <path d="M270,166 C270,154 275,149 280,149 C285,149 290,154 290,166 Z" />
      </g>
      <text x="280" y="88" textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f2540">{out.pct}%</text>

      <g aria-hidden="true">
        <text x="490" y="40" textAnchor="middle" fontSize="12" fontWeight="600" fill="#b23a3a">STILL UNPROTECTED</text>
        <text x="490" y="60" textAnchor="middle" fontSize="15" fontWeight="700" fill="#b23a3a">{out.text.gap}</text>
        <rect x="456" y={scene.gapY} width="68" height={scene.gapH} rx="8" fill="none" stroke="#b23a3a" strokeWidth="2.5" strokeDasharray="6 5" />
        <rect x="400" y="150" width="34" height="22" rx="3" fill="#ffffff" stroke="#0f2540" strokeWidth="2" />
        <path d="M406,158 h22 M406,164 h14" stroke="#0f2540" strokeWidth="2" />
        <rect x="372" y="160" width="34" height="22" rx="3" fill="#ffffff" stroke="#0f2540" strokeWidth="2" />
        <path d="M378,168 h22 M378,174 h14" stroke="#0f2540" strokeWidth="2" />
      </g>
    </svg>
  );
}

export const TONE_SWATCH: Record<"good" | "bad" | "neutral" | "warn", string> = {
  good: "#0f7a4c",
  bad: "#b23a3a",
  neutral: "#0f2540",
  warn: "#a45d00",
};
