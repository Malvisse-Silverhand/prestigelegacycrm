"use client";

import { RiskScreen } from "../risk-screen";
import { useT } from "../lang-context";
import { ciRiskSpecific } from "./ci-text";
import type { CiScreenProps } from "./types";

export function CiRisk(props: CiScreenProps) {
  const { t } = useT();
  return (
    <RiskScreen
      {...props}
      module="ci"
      subject={props.stored.nick.trim() || t("common.prospect")}
      specificTitle={t("ci.risk.specificTitle")}
      specificPoints={ciRiskSpecific(t)}
    />
  );
}
