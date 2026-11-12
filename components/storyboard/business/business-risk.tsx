"use client";

import { RiskScreen } from "../risk-screen";
import { useT } from "../lang-context";
import type { BusinessScreenProps } from "./types";

export function BusinessRisk(props: BusinessScreenProps) {
  const { t } = useT();
  return (
    <RiskScreen
      {...props}
      module="business"
      subject={props.stored.company.trim() || t("business.the.business")}
      specificTitle={t("business.risk.specificTitle")}
      specificPoints={[
        t("business.risk.point1"),
        t("business.risk.point2"),
        t("business.risk.point3"),
        t("business.risk.point4"),
        t("business.risk.point5"),
        t("business.risk.point6"),
        t("business.risk.point7"),
      ]}
    />
  );
}
