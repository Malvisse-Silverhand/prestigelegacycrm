import { describe, expect, it } from "vitest";
import { MEDICAL_DEFAULT_INPUTS } from "../defaults/medical";
import { CI_DEFAULT_INPUTS } from "../defaults/ci";
import { BUSINESS_DEFAULT_INPUTS } from "../defaults/business";
import { medicalFormToInputs, sourceMissing, toMedicalForm } from "../medical-form";
import { ciFormToInputs, toCiForm } from "../ci-form";
import { businessFormToInputs, toBusinessForm } from "../business-form";
import { defaultStored, sanitizePatch } from "../validate";

describe("form round trips", () => {
  it("medical: defaults survive form -> inputs, and validate", () => {
    const back = medicalFormToInputs(toMedicalForm(MEDICAL_DEFAULT_INPUTS));
    expect(back).toEqual(MEDICAL_DEFAULT_INPUTS);
    expect(sanitizePatch("medical", back).ok).toBe(true);
  });
  it("medical: half-typed numbers become 0, never NaN", () => {
    const f = toMedicalForm(MEDICAL_DEFAULT_INPUTS);
    f.company = "";
    f.savings = ".";
    f.bills[0].amount = "";
    const i = medicalFormToInputs(f);
    expect(i.company).toBe(0);
    expect(i.savings).toBe(0);
    expect(i.bills[0].amount).toBe(0);
  });
  it("ci: the engine inputs leave out the agent-only story", () => {
    const stored = { ...defaultStored("ci"), story: "SECRET" };
    const inputs = ciFormToInputs(toCiForm(stored));
    expect(JSON.stringify(inputs)).not.toContain("SECRET");
    expect("story" in inputs).toBe(false);
    expect(inputs.income).toBe(CI_DEFAULT_INPUTS.income);
  });
  it("ci: the saved payload validates", () => {
    const f = toCiForm(defaultStored("ci"));
    const r = sanitizePatch("ci", { ...ciFormToInputs(f), story: f.story, commitChecked: f.commitChecked });
    expect(r.ok).toBe(true);
  });
  it("business: defaults survive form -> inputs (string months become numbers) and validate", () => {
    const back = businessFormToInputs(toBusinessForm(BUSINESS_DEFAULT_INPUTS));
    expect(back.kps[0].stable).toBe(12);
    expect(back.partners).toHaveLength(5);
    expect(back.eMonths).toBe(6);
    expect(sanitizePatch("business", back).ok).toBe(true);
  });
});

describe("sourceMissing", () => {
  it("flags blank and bracketed placeholders only", () => {
    expect(sourceMissing("")).toBe(true);
    expect(sourceMissing("  ")).toBe(true);
    expect(sourceMissing("[source + date]")).toBe(true);
    expect(sourceMissing("Hospital estimate, Jan 2026")).toBe(false);
  });
});
