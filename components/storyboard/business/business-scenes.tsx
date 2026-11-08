import type { BusinessOut } from "@/lib/storyboard/engine/business";
import { useT } from "../lang-context";

const NAVY = "#0f2540";
const MUTED = "#5b6576";
const RED = "#b23a3a";

/** The three Step 2 situations, in the current language. */
export function useBusinessSituations() {
  const { t } = useT();
  return [
    { title: t("business.sit.0.title"), sub: t("business.sit.0.sub") },
    { title: t("business.sit.1.title"), sub: t("business.sit.1.sub") },
    { title: t("business.sit.2.title"), sub: t("business.sit.2.sub") },
  ];
}

type SceneOut = Pick<BusinessOut, "text" | "showEstate">;

function Caption({ children }: { children: string }) {
  return (
    <text x="360" y="344" textAnchor="middle" fontSize="15" fontWeight="700" fill={NAVY}>
      {children}
    </text>
  );
}

function Owner({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={NAVY} aria-hidden="true">
      <circle cx="0" cy="-34" r="14" />
      <path d="M-20,0 C-20,-24 -10,-32 0,-32 C10,-32 20,-24 20,0 Z" />
    </g>
  );
}

/** One of three simple scenes for Step 2. Decorative; the title, caption and numbers carry the meaning. */
export function BusinessSituation({ index, out }: { index: number; out: SceneOut }) {
  const { t } = useT();
  const label = index >= 0 && index <= 2 ? t(`business.sit.${index as 0 | 1 | 2}.title` as const) : "";
  const cards = [
    { x: 40, y: 40, c: "#fac748", tag: t("business.sit.tagKeyman"), who: t("business.sit.whoKeyman"), amt: out.text.kmTotal },
    { x: 400, y: 40, c: "#6f9be0", tag: t("business.sit.tagBuysell"), who: t("business.sit.whoBuysell"), amt: out.text.bsTotal },
    { x: 40, y: 190, c: "#ff8d7e", tag: t("business.sit.tagLoan"), who: t("business.sit.whoLoan"), amt: out.text.loanGap },
    { x: 400, y: 190, c: "#4fbf86", tag: out.showEstate ? t("business.sit.tagFamily") : t("business.sit.tagFamilyHibah"), who: t("business.sit.whoFamily"), amt: out.showEstate ? out.text.eGap : "—" },
  ];
  return (
    <svg role="img" aria-label={label} viewBox="0 0 720 360" width="100%" className="block">
      <rect x="0" y="312" width="720" height="48" fill="#efe6d2" />
      {index === 0 && (
        <g>
          {cards.map((c) => (
            <g key={c.tag}>
              <rect x={c.x} y={c.y} width="280" height="120" rx="16" fill="#fff" stroke={c.c} strokeWidth="4" />
              <rect x={c.x} y={c.y} width="280" height="30" rx="14" fill={c.c} />
              <text x={c.x + 140} y={c.y + 21} textAnchor="middle" fontSize="13" fontWeight="800" fill={NAVY}>{c.tag}</text>
              <text x={c.x + 140} y={c.y + 62} textAnchor="middle" fontSize="12" fill={MUTED}>{c.who}</text>
              <text x={c.x + 140} y={c.y + 96} textAnchor="middle" fontSize="20" fontWeight="800" fill={NAVY}>{c.amt}</text>
            </g>
          ))}
          <circle cx="360" cy="190" r="38" fill="#fff" stroke={NAVY} strokeWidth="3" />
          <Owner x={360} y={212} />
          <text x="360" y="252" textAnchor="middle" fontSize="11" fontWeight="700" fill={RED}>{t("business.sit.ownerPasses")}</text>
          <Caption>{t("business.sit.cap0")}</Caption>
        </g>
      )}
      {index === 1 && (
        <g>
          <rect x="90" y="90" width="230" height="170" rx="14" fill="#e6eef9" stroke="#1d4f91" strokeWidth="3" />
          <text x="205" y="130" textAnchor="middle" fontSize="14" fontWeight="700" fill={NAVY}>{t("business.sit.bankAccount")}</text>
          <text x="205" y="160" textAnchor="middle" fontSize="12" fill={MUTED}>{t("business.sit.stockAssets")}</text>
          <g transform="translate(205 205)">
            <rect x="-22" y="-10" width="44" height="34" rx="6" fill={RED} />
            <path d="M-13,-10 v-10 a13,13 0 0 1 26,0 v10" fill="none" stroke={RED} strokeWidth="5" />
          </g>
          <text x="520" y="140" textAnchor="middle" fontSize="14" fontWeight="700" fill={RED}>{t("business.sit.frozen")}</text>
          <text x="520" y="180" textAnchor="middle" fontSize="26" fontWeight="800" fill={NAVY}>{out.text.frozen}</text>
          <text x="520" y="214" textAnchor="middle" fontSize="12" fill={MUTED}>{t("business.sit.running")}</text>
          <Caption>{t("business.sit.cap1")}</Caption>
        </g>
      )}
      {index === 2 && (
        <g>
          <text x="140" y="70" textAnchor="middle" fontSize="14" fontWeight="700" fill={NAVY}>{t("business.sit.heirs")}</text>
          <text x="580" y="70" textAnchor="middle" fontSize="14" fontWeight="700" fill={NAVY}>{t("business.sit.remaining")}</text>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={60 + i * 34} y={110} width="28" height="40" rx="4" fill="#6f9be0" stroke={NAVY} strokeWidth="2" />
          ))}
          <path d="M200,130 H500" stroke="#3f6db3" strokeWidth="4" strokeDasharray="8 6" />
          <path d="M492,120 L506,130 L492,140" fill="none" stroke="#3f6db3" strokeWidth="4" />
          <text x="350" y="116" textAnchor="middle" fontSize="12" fill={MUTED}>{t("business.sit.sharesGo")}</text>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={520 + i * 34} y={110} width="28" height="40" rx="4" fill="#6f9be0" stroke={NAVY} strokeWidth="2" />
          ))}
          <path d="M500,230 H200" stroke="#0f7a4c" strokeWidth="4" strokeDasharray="8 6" />
          <path d="M208,220 L194,230 L208,240" fill="none" stroke="#0f7a4c" strokeWidth="4" />
          <text x="350" y="216" textAnchor="middle" fontSize="12" fill={MUTED}>{t("business.sit.cashGoes")}</text>
          <rect x="90" y="214" width="100" height="36" rx="8" fill="#4fbf86" stroke="#0f4c35" strokeWidth="2" />
          <text x="140" y="238" textAnchor="middle" fontSize="13" fontWeight="800" fill={NAVY}>{out.text.bsTotal}</text>
          <Caption>{t("business.sit.cap2")}</Caption>
        </g>
      )}
    </svg>
  );
}
