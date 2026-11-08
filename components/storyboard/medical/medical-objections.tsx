"use client";

import { ObjectionsScreen } from "../objections-screen";
import type { MedicalScreenProps } from "./types";

export function MedicalObjections(props: MedicalScreenProps) {
  return <ObjectionsScreen {...props} module="medical" specificTitle="Medical card objections" />;
}
