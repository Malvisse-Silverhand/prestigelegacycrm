"use client";

import { ObjectionsScreen } from "../objections-screen";
import type { HibahScreenProps } from "./types";

export function HibahObjections(props: HibahScreenProps) {
  return <ObjectionsScreen {...props} module="hibah" specificTitle="Hibah-specific objections" />;
}
