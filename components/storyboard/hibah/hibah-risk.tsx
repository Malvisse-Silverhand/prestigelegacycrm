"use client";

import { RiskScreen } from "../risk-screen";
import type { HibahScreenProps } from "./types";

export { riskLevel, type RiskLevel } from "../risk-screen";

export function HibahRisk(props: HibahScreenProps) {
  return (
    <RiskScreen
      {...props}
      module="hibah"
      subject={props.stored.nick.trim() || "the prospect"}
      specificTitle="Hibah specific"
      specificPoints={[
        "Hibah: a large amount may need a medical examination and financial underwriting.",
        "The hibah nomination must be valid and complete; inform the beneficiaries.",
      ]}
    />
  );
}
