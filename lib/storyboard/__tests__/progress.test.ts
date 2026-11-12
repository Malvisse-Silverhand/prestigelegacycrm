import { describe, expect, it } from "vitest";
import { markStepSaved, progressLabel, readStepStatus, savedSteps } from "../progress";
import { isMissingSchemaError, STORYBOARD_MISSING_MESSAGE } from "../schema-error";

describe("step status", () => {
  it("reads only known steps marked saved", () => {
    expect(readStepStatus({ fill: "saved", explain: "none", bogus: "saved", risk: 1 })).toEqual({ fill: "saved" });
    expect(readStepStatus(null)).toEqual({});
    expect(readStepStatus([])).toEqual({});
  });
  it("marks steps and labels progress", () => {
    let s = readStepStatus({});
    expect(progressLabel(s)).toBe("Not started");
    s = markStepSaved(s, "fill");
    expect(progressLabel(s)).toBe("Fill & Calculate done");
    s = markStepSaved(markStepSaved(markStepSaved(s, "explain"), "risk"), "objections");
    expect(progressLabel(s)).toBe("Completed");
    expect(savedSteps(s)).toEqual(["fill", "explain", "risk", "objections"]);
  });
});

describe("isMissingSchemaError", () => {
  it("recognises missing-table codes only", () => {
    expect(isMissingSchemaError({ code: "PGRST205" })).toBe(true);
    expect(isMissingSchemaError({ code: "42P01" })).toBe(true);
    expect(isMissingSchemaError({ code: "42501" })).toBe(false);
    expect(isMissingSchemaError(null)).toBe(false);
    expect(isMissingSchemaError({})).toBe(false);
  });
  it("has the friendly message", () => {
    expect(STORYBOARD_MISSING_MESSAGE).toBe("Storyboard database update has not been applied yet.");
  });
});
