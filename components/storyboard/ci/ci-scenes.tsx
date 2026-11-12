"use client";

import type { CiOut, CiScene } from "@/lib/storyboard/engine/ci";
import { useT } from "../lang-context";
import { ciCycle } from "./ci-text";

const NAVY = "#0f2540";
const GREEN = "#0f7a4c";
const RED = "#b23a3a";
const BLUE = "#1d4f91";
const MUTED = "#5b6576";

/** Step 1 scene: how many months the cash lasts at early and late stage. Static SVG. */
export function CiRunwayScene({ scene, months }: { scene: CiScene; months: number }) {
  const { t } = useT();
  return (
    <svg role="img" aria-label={scene.label} viewBox="0 38 560 172" width="100%" className="block">
      <text x="20" y="66" fontSize="12" fontWeight="600" fill={MUTED}>{t("ci.stage.early")}</text>
      <rect x="110" y="52" width="420" height="22" rx="11" fill="#f1d4d4" />
      <rect x="110" y="52" width={scene.wEarly} height="22" rx="11" fill={GREEN} />
      <text x="20" y="114" fontSize="12" fontWeight="600" fill={MUTED}>{t("ci.stage.late")}</text>
      <rect x="110" y="100" width="420" height="22" rx="11" fill="#f1d4d4" />
      <rect x="110" y="100" width={scene.wLate} height="22" rx="11" fill="#2f9e6a" />
      <line x1={scene.xEarly} y1="44" x2={scene.xEarly} y2="82" stroke={RED} strokeWidth="3" className="sb-pulse" />
      <text x="110" y="146" fontSize="11" fill={MUTED}>{t("ci.scene.month0")}</text>
      <text x="530" y="146" textAnchor="end" fontSize="11" fill={MUTED}>{t("ci.scene.monthN", { n: months })}</text>
      <rect x="0" y="194" width="560" height="16" fill="#efe6d2" />
      <g transform="translate(110,150)" fill={NAVY} aria-hidden="true">
        <circle cx="10" cy="6" r="7" />
        <rect x="5" y="14" width="10" height="18" rx="4" />
        <rect x="6" y="31" width="4" height="12" rx="2" />
        <rect x="10" y="31" width="4" height="12" rx="2" />
      </g>
    </svg>
  );
}

function Caption({ children }: { children: string }) {
  return (
    <text x="360" y="344" textAnchor="middle" fontSize="15" fontWeight="700" fill={NAVY}>
      {children}
    </text>
  );
}

/** One of four simple 2D situations. Decorative; the title and caption carry the meaning. */
export function CiSituation({ index, out }: { index: number; out: Pick<CiOut, "text" | "months"> }) {
  const { t } = useT();
  const cycle = ciCycle(t);
  const label = index >= 0 && index < 4 ? t(`ci.sit${index + 1}.title` as "ci.sit1.title") : "";
  return (
    <svg role="img" aria-label={label} viewBox="0 0 720 360" width="100%" className="block">
      <rect x="0" y="312" width="720" height="48" fill="#efe6d2" />
      {index === 0 && (
        <g>
          {[
            { x: 40, c: BLUE, t: t("ci.sit1.medT"), d: t("ci.sit1.medD") },
            { x: 260, c: "#e3a823", t: "Hibah", d: t("ci.sit1.hibahD") },
            { x: 480, c: GREEN, t: t("ci.sit1.ciT"), d: t("ci.sit1.ciD") },
          ].map((b) => (
            <g key={b.t}>
              <rect x={b.x} y="80" width="200" height="190" rx="16" fill="#fff" stroke={b.c} strokeWidth="4" />
              <rect x={b.x} y="80" width="200" height="44" rx="14" fill={b.c} />
              <text x={b.x + 100} y="109" textAnchor="middle" fontSize="16" fontWeight="800" fill={b.c === "#e3a823" ? NAVY : "#fff"}>{b.t}</text>
              <text x={b.x + 100} y="180" textAnchor="middle" fontSize="13" fontWeight="600" fill={NAVY}>
                {b.d.length > 22 ? b.d.slice(0, b.d.lastIndexOf(" ", 22)) : b.d}
              </text>
              <text x={b.x + 100} y="200" textAnchor="middle" fontSize="13" fontWeight="600" fill={NAVY}>
                {b.d.length > 22 ? b.d.slice(b.d.lastIndexOf(" ", 22) + 1) : ""}
              </text>
            </g>
          ))}
          <Caption>{t("ci.sit1.caption")}</Caption>
        </g>
      )}
      {index === 1 && (
        <g>
          <path d="M80,200 H640" stroke="#d6cdb9" strokeWidth="4" strokeDasharray="8 8" />
          {cycle.map((c, i) => {
            const x = 90 + i * 135;
            return (
              <g key={c.t}>
                <circle cx={x} cy="200" r="26" fill={i === 4 ? GREEN : NAVY} />
                <text x={x} y="207" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff">{i + 1}</text>
                <text x={x} y="254" textAnchor="middle" fontSize="13" fontWeight="700" fill={NAVY}>{c.t}</text>
                <text x={x} y="272" textAnchor="middle" fontSize="10" fill={MUTED}>{c.d.length > 24 ? c.d.slice(0, 24) + "…" : c.d}</text>
              </g>
            );
          })}
          <Caption>{t("ci.sit2.caption")}</Caption>
        </g>
      )}
      {index === 2 && (
        <g>
          <text x="180" y="70" textAnchor="middle" fontSize="15" fontWeight="700" fill={RED}>{t("ci.sit3.pauses")}</text>
          <rect x="80" y="100" width="200" height="16" rx="8" fill="#f1d4d4" />
          <text x="180" y="150" textAnchor="middle" fontSize="13" fill={MUTED}>{t("ci.sit3.months", { months: out.months })}</text>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect x={400 + (i % 2) * 90} y={250 - i * 44} width="80" height="34" rx="4" fill="#fff" stroke={NAVY} strokeWidth="2" />
              <path d={`M${412 + (i % 2) * 90},${262 - i * 44} h56 M${412 + (i % 2) * 90},${272 - i * 44} h36`} stroke="#c9d2e0" strokeWidth="4" strokeLinecap="round" />
            </g>
          ))}
          <text x="490" y="46" textAnchor="middle" fontSize="15" fontWeight="800" fill={NAVY}>{t("ci.sit3.perMonth", { amount: out.text.monthly })}</text>
          <Caption>{t("ci.sit3.caption")}</Caption>
        </g>
      )}
      {index === 3 && (
        <g>
          <text x="110" y="70" fontSize="14" fontWeight="700" fill={NAVY}>{t("ci.stage.early")}</text>
          <rect x="110" y="84" width="500" height="26" rx="13" fill="#f1d4d4" />
          <rect x="110" y="84" width="170" height="26" rx="13" fill="#2f9e6a" />
          <text x="110" y="136" fontSize="12" fill={MUTED}>{t("ci.sit4.earlyNote")}</text>
          <text x="110" y="190" fontSize="14" fontWeight="700" fill={NAVY}>{t("ci.stage.late")}</text>
          <rect x="110" y="204" width="500" height="26" rx="13" fill="#f1d4d4" />
          <rect x="110" y="204" width="500" height="26" rx="13" fill={GREEN} />
          <text x="110" y="256" fontSize="12" fill={MUTED}>{t("ci.sit4.lateNote")}</text>
          <Caption>{t("ci.sit4.caption")}</Caption>
        </g>
      )}
    </svg>
  );
}
