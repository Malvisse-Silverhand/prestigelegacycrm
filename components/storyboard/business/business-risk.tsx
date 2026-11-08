"use client";

import { BUSINESS_RISK_SPECIFIC } from "@/lib/storyboard/defaults/business";
import { RiskScreen } from "../risk-screen";
import type { BusinessScreenProps } from "./types";

export function BusinessRisk(props: BusinessScreenProps) {
  return (
    <RiskScreen
      {...props}
      module="business"
      subject={props.stored.company.trim() || "the business"}
      specificTitle="Business protection specific"
      specificPoints={BUSINESS_RISK_SPECIFIC}
    />
  );
}
