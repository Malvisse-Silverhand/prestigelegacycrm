"use client";

import { RiskScreen } from "../risk-screen";
import { useT } from "../lang-context";
import type { HibahScreenProps } from "./types";

export { riskLevel, type RiskLevel } from "../risk-screen";

export function HibahRisk(props: HibahScreenProps) {
  const { t } = useT();
  return (
    <RiskScreen
      {...props}
      module="hibah"
      subject={props.stored.nick.trim() || t("common.prospect")}
      specificTitle={t("hibah.risk.specificTitle")}
      specificPoints={[t("hibah.risk.point1"), t("hibah.risk.point2")]}
    />
  );
}
