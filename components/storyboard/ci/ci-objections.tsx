"use client";

import { ObjectionsScreen } from "../objections-screen";
import { useT } from "../lang-context";
import type { CiScreenProps } from "./types";

export function CiObjections(props: CiScreenProps) {
  const { t } = useT();
  return (
    <ObjectionsScreen
      {...props}
      module="ci"
      specificTitle={t("ci.obj.specificTitle")}
      outcomeLabels={{ needs_spouse: t("ci.obj.reviewCert") }}
    />
  );
}
