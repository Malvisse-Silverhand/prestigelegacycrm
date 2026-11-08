import type { HibahOut } from "@/lib/storyboard/engine/hibah";
import { rmWhole } from "@/lib/storyboard/engine/money";

export const SITUATIONS: { title: string; sub: (o: HibahOut, home: number) => string }[] = [
  { title: "Income stops, bills don’t", sub: (o) => `${o.text.monthly}/month for ${o.years} years` },
  { title: "Payout to named beneficiaries", sub: () => "Conditional hibah" },
  { title: "The home stays in the family", sub: (_o, home) => `Home loan ${rmWhole(home)}` },
  { title: "Total & permanent disability", sub: () => "Income stops, costs rise" },
];

const NAVY = "#0f2540";
const GOLD = "#fac748";
const GREEN = "#0f7a4c";
const RED = "#b23a3a";

function Person({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={NAVY}>
      <circle cx="0" cy="-34" r="10" />
      <path d="M-15,0 C-15,-18 -8,-24 0,-24 C8,-24 15,-18 15,0 Z" />
    </g>
  );
}

function Bill({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="34" height="22" rx="3" fill="#fff" stroke={NAVY} strokeWidth="2" />
      <path d={`M${x + 6},${y + 8} h22 M${x + 6},${y + 14} h14`} stroke={NAVY} strokeWidth="2" />
    </g>
  );
}

/** One of four simple 2D situations. Decorative; the title and caption carry the meaning. */
export function SituationScene({ index, out, home }: { index: number; out: HibahOut; home: number }) {
  const label = SITUATIONS[index]?.title ?? "";
  return (
    <svg role="img" aria-label={label} viewBox="0 0 560 214" width="100%" className="block">
      <rect x="0" y="190" width="560" height="24" fill="#efe6d2" />
      {index === 0 && (
        <g>
          <Person x={110} y={190} s={1.3} />
          <text x="110" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill={RED}>INCOME STOPS</text>
          <rect x="180" y="150" width="64" height="12" rx="6" fill={GOLD} opacity="0.35" />
          <rect x="180" y="138" width="64" height="12" rx="6" fill={GOLD} opacity="0.35" />
          <Bill x={290} y={150} />
          <Bill x={330} y={160} />
          <Bill x={370} y={150} />
          <Bill x={410} y={162} />
          <text x="400" y="120" textAnchor="middle" fontSize="15" fontWeight="700" fill={NAVY}>{out.text.monthly}/month</text>
          <text x="400" y="100" textAnchor="middle" fontSize="12" fill={RED}>keeps coming</text>
        </g>
      )}
      {index === 1 && (
        <g>
          <rect x="60" y="80" width="110" height="70" rx="10" fill="#fff" stroke={NAVY} strokeWidth="3" />
          <text x="115" y="108" textAnchor="middle" fontSize="12" fontWeight="700" fill={NAVY}>HIBAH</text>
          <text x="115" y="130" textAnchor="middle" fontSize="12" fill={GREEN}>nomination</text>
          <path d="M175,115 H330" stroke={GREEN} strokeWidth="4" strokeDasharray="8 6" />
          <path d="M322,105 L336,115 L322,125" fill="none" stroke={GREEN} strokeWidth="4" />
          <Person x={380} y={190} />
          <Person x={430} y={190} s={0.85} />
          <Person x={470} y={190} s={0.7} />
          <text x="425" y="70" textAnchor="middle" fontSize="13" fontWeight="700" fill={GREEN}>Named beneficiary receives</text>
          <text x="425" y="88" textAnchor="middle" fontSize="12" fill={NAVY}>Executor (wasi) only administers</text>
        </g>
      )}
      {index === 2 && (
        <g>
          <path d="M190,110 L280,40 L370,110 Z" fill={NAVY} />
          <rect x="205" y="110" width="150" height="80" fill="#fff" stroke={NAVY} strokeWidth="3" />
          <rect x="265" y="145" width="30" height="45" fill={GOLD} />
          <text x="280" y="30" textAnchor="middle" fontSize="13" fontWeight="700" fill={NAVY}>Home loan {rmWhole(home)}</text>
          <Person x={140} y={190} s={0.9} />
          <Person x={420} y={190} s={0.9} />
        </g>
      )}
      {index === 3 && (
        <g>
          <Person x={130} y={190} s={1.3} />
          <circle cx="170" cy="168" r="18" fill="none" stroke={NAVY} strokeWidth="3" />
          <text x="130" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill={RED}>INCOME STOPS · COSTS RISE</text>
          <Bill x={260} y={140} />
          <Bill x={300} y={120} />
          <Bill x={340} y={140} />
          <Bill x={380} y={100} />
          <Bill x={420} y={130} />
          <text x="340" y="86" textAnchor="middle" fontSize="12" fill={NAVY}>Care and adjustment costs</text>
        </g>
      )}
    </svg>
  );
}
