import type { MedicalOut, MedicalScene } from "@/lib/storyboard/engine/medical";

const NAVY = "#0f2540";
const BLUE = "#1d4f91";
const GREEN = "#0f7a4c";
const RED = "#b23a3a";
const MUTED = "#5b6576";

/** The Step 1 scene: a hospital bed, a bill and a "who pays?" bar. Static SVG; the numbers come from the engine. */
export function MedicalGapScene({ scene, out }: { scene: MedicalScene; out: Pick<MedicalOut, "text"> }) {
  return (
    <svg role="img" aria-label={scene.label} viewBox="0 0 560 226" width="100%" className="block">
      <rect x="0" y="210" width="560" height="30" fill="#efe6d2" />
      <g aria-hidden="true">
        <rect x="40" y="150" width="170" height="16" rx="6" fill={NAVY} />
        <rect x="40" y="128" width="130" height="26" rx="10" fill="#c9d2e0" />
        <rect x="44" y="166" width="10" height="44" fill={NAVY} />
        <rect x="196" y="166" width="10" height="44" fill={NAVY} />
        <circle cx="70" cy="122" r="16" fill={NAVY} />
        <rect x="232" y="40" width="6" height="170" fill="#9aa3b2" />
        <rect x="222" y="40" width="28" height="40" rx="6" fill="#e6eef9" stroke={BLUE} strokeWidth="2.5" />
        <circle cx="236" cy="88" r="3.5" fill={BLUE} className="sb-pulse" />
        <path d="M236,80 C236,110 200,120 180,136" fill="none" stroke="#9aa3b2" strokeWidth="2" />
      </g>
      <g aria-hidden="true">
        <rect x="290" y="34" width="110" height="170" rx="6" fill="#ffffff" stroke={NAVY} strokeWidth="2.5" />
        <text x="345" y="60" textAnchor="middle" fontSize="11" fontWeight="700" fill={MUTED}>HOSPITAL BILL</text>
        <path d="M304,76 h82 M304,90 h60 M304,104 h74 M304,118 h52 M304,132 h70" stroke="#c9d2e0" strokeWidth="5" strokeLinecap="round" />
        <text x="345" y="176" textAnchor="middle" fontSize="15" fontWeight="800" fill={NAVY}>{out.text.bill}</text>
      </g>
      <g aria-hidden="true">
        <rect x="440" y={scene.cY} width="80" height={scene.cH} fill={BLUE} />
        <rect x="440" y={scene.sY} width="80" height={scene.sH} fill={GREEN} />
        <rect x="440" y={scene.gY} width="80" height={scene.gH} fill={RED} />
        <text x="480" y="24" textAnchor="middle" fontSize="11" fontWeight="700" fill={NAVY}>WHO PAYS?</text>
      </g>
    </svg>
  );
}

export const MEDICAL_SITUATIONS = [
  { title: "Deposit vs cashless", sub: "GL instead of cash at the counter" },
  { title: "The bill keeps growing", sub: "Every day adds up" },
  { title: "Panel ends with the job", sub: "Own card goes with you" },
  { title: "Medical inflation", sub: "Same bill, 5 years later (placeholder rate)" },
];

function Caption({ children }: { children: string }) {
  return (
    <text x="360" y="344" textAnchor="middle" fontSize="15" fontWeight="700" fill={NAVY}>
      {children}
    </text>
  );
}

/** One of four simple 2D situations. Decorative; the title and caption carry the meaning. */
export function MedicalSituation({ index, out, inflation }: { index: number; out: Pick<MedicalOut, "text" | "bill" | "futureBill">; inflation: number }) {
  const label = MEDICAL_SITUATIONS[index]?.title ?? "";
  // Bars for the inflation scene: now, then each of 5 years at the placeholder rate.
  const rate = 1 + inflation / 100;
  const values = Array.from({ length: 6 }, (_, k) => out.bill * Math.pow(rate, k));
  const max = Math.max(1, ...values);
  return (
    <svg role="img" aria-label={label} viewBox="0 0 720 360" width="100%" className="block">
      <rect x="0" y="312" width="720" height="48" fill="#efe6d2" />
      {index === 0 && (
        <g>
          <line x1="360" y1="30" x2="360" y2="300" stroke="#d6cdb9" strokeWidth="2" strokeDasharray="6 6" />
          <text x="180" y="50" textAnchor="middle" fontSize="15" fontWeight="700" fill={RED}>Without a card</text>
          <rect x="70" y="110" width="220" height="90" rx="10" fill="#fff" stroke={NAVY} strokeWidth="3" />
          <text x="180" y="140" textAnchor="middle" fontSize="13" fontWeight="600" fill={NAVY}>Admission counter</text>
          <text x="180" y="172" textAnchor="middle" fontSize="17" fontWeight="800" fill={RED}>Deposit first</text>
          {[120, 168, 216].map((x) => (
            <rect key={x} x={x} y="220" width="44" height="24" rx="4" fill="#4fbf86" stroke="#0f4c35" strokeWidth="2" />
          ))}
          <text x="540" y="50" textAnchor="middle" fontSize="15" fontWeight="700" fill={GREEN}>With a medical card</text>
          <rect x="400" y="120" width="70" height="44" rx="6" fill={BLUE} />
          <rect x="408" y="130" width="22" height="16" rx="3" fill="#fac748" />
          <text x="435" y="190" textAnchor="middle" fontSize="12" fontWeight="600" fill={NAVY}>Card + IC</text>
          <rect x="620" y="110" width="70" height="80" rx="8" fill={NAVY} />
          <text x="655" y="210" textAnchor="middle" fontSize="12" fontWeight="600" fill={NAVY}>Operator</text>
          <rect x="470" y="226" width="54" height="36" rx="4" fill="#fff" stroke={NAVY} strokeWidth="2.5" />
          <path d="M470,226 L497,248 L524,226" fill="none" stroke={NAVY} strokeWidth="2.5" />
          <text x="540" y="290" textAnchor="middle" fontSize="12" fill={MUTED}>Guarantee letter (GL)</text>
          <circle cx="540" cy="140" r="22" fill={GREEN} />
          <path d="M529,140 l8,8 l15,-16" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <Caption>With a card, the hospital bills the operator, not your wallet</Caption>
        </g>
      )}
      {index === 1 && (
        <g>
          <rect x="90" y="190" width="220" height="18" rx="6" fill={NAVY} />
          <rect x="90" y="166" width="160" height="28" rx="10" fill="#c9d2e0" />
          <circle cx="122" cy="158" r="18" fill={NAVY} />
          <rect x="96" y="208" width="10" height="104" fill={NAVY} />
          <rect x="294" y="208" width="10" height="104" fill={NAVY} />
          <text x="200" y="100" textAnchor="middle" fontSize="22" fontWeight="800" fill={NAVY}>Day after day in hospital</text>
          <rect x="440" y="290" width="160" height="22" rx="4" fill={NAVY} />
          <rect x="460" y="40" width="120" height="250" fill="#fff" stroke={NAVY} strokeWidth="2.5" />
          <path d="M476,70 h88 M476,94 h60 M476,118 h80 M476,142 h52 M476,166 h86 M476,190 h64 M476,214 h80 M476,238 h56" stroke="#c9d2e0" strokeWidth="6" strokeLinecap="round" />
          <text x="520" y="272" textAnchor="middle" fontSize="15" fontWeight="800" fill={RED}>{out.text.bill}</text>
          <Caption>Every day in hospital adds to the bill</Caption>
        </g>
      )}
      {index === 2 && (
        <g>
          <rect x="70" y="80" width="200" height="232" fill={NAVY} />
          <g fill="#fac748">
            {[96, 153, 210].flatMap((x) => [106, 160].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="34" height="30" />))}
          </g>
          <rect x="146" y="250" width="48" height="62" fill="#c9d2e0" />
          <text x="170" y="66" textAnchor="middle" fontSize="13" fontWeight="700" fill={NAVY}>Employer</text>
          <g fill={NAVY}>
            <circle cx="320" cy="232" r="13" />
            <path d="M304,300 C304,266 312,250 320,250 C328,250 336,266 336,300 Z" />
          </g>
          <rect x="342" y="236" width="56" height="34" rx="5" fill={BLUE} opacity="0.45" />
          <text x="370" y="258" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">PANEL</text>
          <text x="560" y="140" textAnchor="middle" fontSize="14" fontWeight="600" fill={MUTED}>Resign · retrenched · retire</text>
          <text x="560" y="168" textAnchor="middle" fontSize="20" fontWeight="800" fill={RED}>Panel cover ends</text>
          <Caption>Company panel belongs to the job. Your own card goes with you.</Caption>
        </g>
      )}
      {index === 3 && (
        <g>
          <line x1="80" y1="290" x2="660" y2="290" stroke={NAVY} strokeWidth="2" />
          {values.map((v, k) => {
            const h = Math.max(6, Math.round((v / max) * 200));
            const x = 110 + k * 90;
            return (
              <g key={k}>
                <rect x={x} y={290 - h} width="60" height={h} rx="6" fill={k === 5 ? RED : BLUE} />
                <text x={x + 30} y="308" textAnchor="middle" fontSize="12" fill={MUTED}>{k === 0 ? "Now" : `Y${k}`}</text>
              </g>
            );
          })}
          <text x="140" y="60" textAnchor="middle" fontSize="13" fontWeight="700" fill={NAVY}>{out.text.bill}</text>
          <text x="590" y="60" textAnchor="middle" fontSize="15" fontWeight="800" fill={RED}>{out.text.future}</text>
          <Caption>The same treatment costs more every year you wait (placeholder rate)</Caption>
        </g>
      )}
    </svg>
  );
}
