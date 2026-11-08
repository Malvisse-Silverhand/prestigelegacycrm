"use client";

import { ObjectionsScreen } from "../objections-screen";
import type { BusinessScreenProps } from "./types";

export function BusinessObjections(props: BusinessScreenProps) {
  return (
    <ObjectionsScreen
      {...props}
      module="business"
      specificTitle="Business protection objections"
      outcomeLabels={{ needs_spouse: "Meet all partners", follow_up_later: "Needs accountant / lawyer" }}
      footnote="Responses are conversation guides for registered agents. Tax, legal and valuation questions must be confirmed with a tax agent, lawyer or accountant."
    />
  );
}
