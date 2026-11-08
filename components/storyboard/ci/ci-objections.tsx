"use client";

import { ObjectionsScreen } from "../objections-screen";
import type { CiScreenProps } from "./types";

export function CiObjections(props: CiScreenProps) {
  return (
    <ObjectionsScreen
      {...props}
      module="ci"
      specificTitle="Critical illness objections"
      outcomeLabels={{ needs_spouse: "Review existing certificate" }}
    />
  );
}
