"use client";

import { ObjectionsScreen } from "../objections-screen";
import { useT } from "../lang-context";
import type { MedicalScreenProps } from "./types";

export function MedicalObjections(props: MedicalScreenProps) {
  const { t } = useT();
  return <ObjectionsScreen {...props} module="medical" specificTitle={t("medical.obj.specificTitle")} />;
}
