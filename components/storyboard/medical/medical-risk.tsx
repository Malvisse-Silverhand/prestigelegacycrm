"use client";

import { RiskScreen } from "../risk-screen";
import { useT } from "../lang-context";
import type { MedicalScreenProps } from "./types";

export function MedicalRisk(props: MedicalScreenProps) {
  const { t } = useT();
  return (
    <RiskScreen
      {...props}
      module="medical"
      subject={props.stored.nick.trim() || t("common.prospect")}
      specificTitle={t("medical.risk.specificTitle")}
      specificPoints={[t("medical.risk.point1"), t("medical.risk.point2"), t("medical.risk.point3")]}
    />
  );
}
