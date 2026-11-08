"use client";

import { MEDICAL_RISK_SPECIFIC } from "@/lib/storyboard/defaults/medical";
import { RiskScreen } from "../risk-screen";
import type { MedicalScreenProps } from "./types";

export function MedicalRisk(props: MedicalScreenProps) {
  return (
    <RiskScreen
      {...props}
      module="medical"
      subject={props.stored.nick.trim() || "the prospect"}
      specificTitle="Medical card specific"
      specificPoints={MEDICAL_RISK_SPECIFIC}
    />
  );
}
