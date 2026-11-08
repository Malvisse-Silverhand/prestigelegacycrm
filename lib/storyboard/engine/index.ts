import type { StoryboardModule } from "../types";
import { computeBusiness, type BusinessInputs, type BusinessResult } from "./business";
import { computeCi, type CiInputs, type CiResult } from "./ci";
import { computeHibah, type HibahInputs, type HibahResult } from "./hibah";
import { computeMedical, type MedicalInputs, type MedicalResult } from "./medical";
import { computeMortgage, type MortgageInputs, type MortgageResult } from "./mortgage";

export * from "./money";
export * from "./scenario-flow";
export * from "./types";
export * from "./hibah";
export * from "./medical";
export * from "./ci";
export * from "./business";
export * from "./mortgage";

export type ModuleInputs = {
  hibah: HibahInputs;
  medical: MedicalInputs;
  ci: CiInputs;
  business: BusinessInputs;
  mortgage: MortgageInputs;
};

export type ModuleResults = {
  hibah: HibahResult;
  medical: MedicalResult;
  ci: CiResult;
  business: BusinessResult;
  mortgage: MortgageResult;
};

/** Run the engine for a module. Inputs are untrusted JSON, so every field is optional. */
export function computeModule<M extends StoryboardModule>(
  module: M,
  inputs: Partial<ModuleInputs[M]>,
): ModuleResults[M];
export function computeModule(module: StoryboardModule, inputs: Record<string, unknown>): ModuleResults[StoryboardModule] {
  switch (module) {
    case "hibah":
      return computeHibah(inputs as Partial<HibahInputs>);
    case "medical":
      return computeMedical(inputs as Partial<MedicalInputs>);
    case "ci":
      return computeCi(inputs as Partial<CiInputs>);
    case "business":
      return computeBusiness(inputs as Partial<BusinessInputs>);
    case "mortgage":
      return computeMortgage(inputs as Partial<MortgageInputs>);
  }
}
