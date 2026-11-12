"use client";

import { ObjectionsScreen } from "../objections-screen";
import { useT } from "../lang-context";
import type { HibahScreenProps } from "./types";

export function HibahObjections(props: HibahScreenProps) {
  const { t } = useT();
  return <ObjectionsScreen {...props} module="hibah" specificTitle={t("hibah.obj.specificTitle")} />;
}
