import type { TKey } from "@/lib/storyboard/i18n";

type Tr = (key: TKey, vars?: Record<string, string | number>) => string;

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const k = (key: string) => key as TKey;

/** Commitment checklist labels. The stored tick is the English label; only the display is translated. */
export const ciCommitLabels = (t: Tr) => range(10).map((i) => t(k(`ci.commit.${i}`)));

export const ciDependencyItems = (t: Tr) =>
  range(10).map((i) => ({ label: t(k(`ci.depItem.${i}.label`)), hint: t(k(`ci.depItem.${i}.hint`)) }));

export const ciCycle = (t: Tr) => range(5).map((i) => ({ t: t(k(`ci.cycle.${i}.t`)), d: t(k(`ci.cycle.${i}.d`)) }));

export const ciApproaches = (t: Tr) =>
  range(3).map((i) => ({
    tag: t(k(`ci.appr.${i}.tag`)),
    defaultName: t(k(`ci.appr.${i}.name`)),
    points: range(4).map((j) => t(k(`ci.appr.${i}.p${j}`))),
    line: t(k(`ci.appr.${i}.line`)),
  }));

export const ciCertChecks = (t: Tr) => range(7).map((i) => t(k(`ci.cert.${i}`)));
export const ciIllnesses = (t: Tr) => range(35).map((i) => t(k(`ci.ill.${i}`)));
export const ciRiskSpecific = (t: Tr) => range(9).map((i) => t(k(`ci.riskSpec.${i}`)));
export const ciStatPlaceholders = (t: Tr) => range(3).map((i) => t(k(`ci.stat.${i}`)));

/** Translated label for the dependency level id the engine returns. */
export function ciDepLabel(t: Tr, level: "Low dependency so far" | "Moderate dependency" | "High dependency"): string {
  return t(level === "Low dependency so far" ? "ci.dep.low" : level === "Moderate dependency" ? "ci.dep.mod" : "ci.dep.high");
}

/** The four situation titles and subtitles. */
export const ciSituations = (t: Tr) => [
  { title: t("ci.sit1.title"), sub: t("ci.sit1.sub") },
  { title: t("ci.sit2.title"), sub: t("ci.sit2.sub") },
  { title: t("ci.sit3.title"), sub: t("ci.sit3.sub") },
  { title: t("ci.sit4.title"), sub: t("ci.sit4.sub") },
];
