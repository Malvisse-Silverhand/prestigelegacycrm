"use client";

import { CI_RISK_SPECIFIC } from "@/lib/storyboard/defaults/ci";
import { RiskScreen } from "../risk-screen";
import type { CiScreenProps } from "./types";

export function CiRisk(props: CiScreenProps) {
  return (
    <RiskScreen
      {...props}
      module="ci"
      subject={props.stored.nick.trim() || "the prospect"}
      specificTitle="Critical illness specific"
      specificPoints={CI_RISK_SPECIFIC}
    />
  );
}
