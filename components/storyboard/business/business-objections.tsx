"use client";

import { ObjectionsScreen } from "../objections-screen";
import { useT } from "../lang-context";
import type { BusinessScreenProps } from "./types";

export function BusinessObjections(props: BusinessScreenProps) {
  const { t } = useT();
  return (
    <ObjectionsScreen
      {...props}
      module="business"
      specificTitle={t("business.obj.specificTitle")}
      outcomeLabels={{ needs_spouse: t("business.obj.meetPartners"), follow_up_later: t("business.obj.needsAdvisers") }}
      footnote={t("business.obj.footnote")}
    />
  );
}
