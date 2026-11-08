import type { ReactNode } from "react";
import type { BuiltModule, ScreenId } from "@/lib/storyboard/modules";
import type { StoryboardStep } from "@/lib/storyboard/types";
import {
  defaultStored,
  readStored,
  type BusinessStored,
  type CiStored,
  type HibahStored,
  type MedicalStored,
} from "@/lib/storyboard/validate";
import type { ScreenProps } from "./screen-types";
import { HibahFill } from "./hibah/hibah-fill";
import { HibahExplain } from "./hibah/hibah-explain";
import { HibahRisk } from "./hibah/hibah-risk";
import { HibahObjections } from "./hibah/hibah-objections";
import type { HibahScreenProps } from "./hibah/types";
import { MedicalFill } from "./medical/medical-fill";
import { MedicalExplain } from "./medical/medical-explain";
import { MedicalRisk } from "./medical/medical-risk";
import { MedicalObjections } from "./medical/medical-objections";
import type { MedicalScreenProps } from "./medical/types";
import { CiFill } from "./ci/ci-fill";
import { CiExplain } from "./ci/ci-explain";
import { CiRisk } from "./ci/ci-risk";
import { CiObjections } from "./ci/ci-objections";
import type { CiScreenProps } from "./ci/types";
import { BusinessFill } from "./business/business-fill";
import { BusinessExplain } from "./business/business-explain";
import { BusinessRisk } from "./business/business-risk";
import { BusinessObjections } from "./business/business-objections";
import type { BusinessScreenProps } from "./business/types";

type Screen<P> = (props: P) => ReactNode;
type ByStep<P> = Record<StoryboardStep, Screen<P>>;

const HIBAH: ByStep<HibahScreenProps> = { fill: HibahFill, explain: HibahExplain, risk: HibahRisk, objections: HibahObjections };
const MEDICAL: ByStep<MedicalScreenProps> = { fill: MedicalFill, explain: MedicalExplain, risk: MedicalRisk, objections: MedicalObjections };
const CI: ByStep<CiScreenProps> = { fill: CiFill, explain: CiExplain, risk: CiRisk, objections: CiObjections };
const BUSINESS: ByStep<BusinessScreenProps> = {
  fill: BusinessFill,
  explain: BusinessExplain,
  risk: BusinessRisk,
  objections: BusinessObjections,
};

/**
 * Every built module's four screens. Typed against ScreenId, so a module added
 * to BUILT_MODULES without its screens does not compile.
 */
export const SCREENS: { [K in ScreenId]: Screen<never> } = {
  "hibah:fill": HIBAH.fill, "hibah:explain": HIBAH.explain, "hibah:risk": HIBAH.risk, "hibah:objections": HIBAH.objections,
  "medical:fill": MEDICAL.fill, "medical:explain": MEDICAL.explain, "medical:risk": MEDICAL.risk, "medical:objections": MEDICAL.objections,
  "ci:fill": CI.fill, "ci:explain": CI.explain, "ci:risk": CI.risk, "ci:objections": CI.objections,
  "business:fill": BUSINESS.fill, "business:explain": BUSINESS.explain, "business:risk": BUSINESS.risk, "business:objections": BUSINESS.objections,
};

export type ScreenCommon = Omit<ScreenProps<unknown>, "stored">;

/** What the lead record can prefill on a brand-new storyboard. */
export type Prefill = { firstName: string; age: number | null };

/** The starting state for a module with nothing saved yet, prefilled from the lead. */
const START = {
  hibah: (p: Prefill): HibahStored => {
    const s = defaultStored("hibah");
    return { ...s, nick: p.firstName.slice(0, 40), age: p.age ?? s.age };
  },
  medical: (p: Prefill): MedicalStored => ({ ...defaultStored("medical"), nick: p.firstName.slice(0, 40) }),
  ci: (p: Prefill): CiStored => ({ ...defaultStored("ci"), nick: p.firstName.slice(0, 40) }),
  business: (p: Prefill): BusinessStored => {
    const s = defaultStored("business");
    const first = p.firstName.slice(0, 40);
    if (!first) return s;
    return {
      ...s,
      guarantor: first,
      kps: s.kps.map((k, i) => (i === 0 ? { ...k, name: first } : k)),
      partners: s.partners.map((x, i) => (i === 0 ? { ...x, name: first, age: p.age ?? x.age } : x)),
    };
  },
};

/**
 * Render the screen for a module and step. `savedInputs` is what is stored in
 * the database (or null when nothing is saved yet). `key` gives a fresh form
 * state whenever the saved row changes underneath.
 */
export function renderScreen(
  module: BuiltModule,
  step: StoryboardStep,
  common: ScreenCommon,
  savedInputs: unknown | null,
  prefill: Prefill,
  key: string,
): ReactNode {
  const has = savedInputs !== null && savedInputs !== undefined;
  switch (module) {
    case "hibah": {
      const C = HIBAH[step];
      const stored = has ? readStored("hibah", savedInputs) : START.hibah(prefill);
      return <C key={key} {...common} stored={stored} />;
    }
    case "medical": {
      const C = MEDICAL[step];
      const stored = has ? readStored("medical", savedInputs) : START.medical(prefill);
      return <C key={key} {...common} stored={stored} />;
    }
    case "ci": {
      const C = CI[step];
      const stored = has ? readStored("ci", savedInputs) : START.ci(prefill);
      return <C key={key} {...common} stored={stored} />;
    }
    case "business": {
      const C = BUSINESS[step];
      const stored = has ? readStored("business", savedInputs) : START.business(prefill);
      return <C key={key} {...common} stored={stored} />;
    }
  }
}
