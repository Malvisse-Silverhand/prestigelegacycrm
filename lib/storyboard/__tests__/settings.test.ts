import { describe, expect, it } from "vitest";
import { HIBAH_DEFAULT_CONTENT, HIBAH_DEFAULT_PLAN } from "../defaults/hibah";
import {
  fillScript,
  readAgentSettings,
  readOrgSettings,
  resolveHibahSettings,
  sanitizeAgentSettings,
  sanitizeOrgSettings,
} from "../settings";

describe("sanitizeOrgSettings", () => {
  it("accepts a valid set", () => {
    const r = sanitizeOrgSettings({ planName: "[GE hibah plan]", base: 500000, mults: [1, 2, 0, 0, 0], statistics: ["[stat + source]"] });
    expect(r.ok).toBe(true);
  });
  it("rejects unknown keys, bad multiples and other operators", () => {
    expect(sanitizeOrgSettings({ planName: "x", extra: 1 }).ok).toBe(false);
    expect(sanitizeOrgSettings({ mults: [1, 2] }).ok).toBe(false);
    expect(sanitizeOrgSettings({ mults: [1, 2, "a", 0, 0] }).ok).toBe(false);
    expect(sanitizeOrgSettings({ planName: "Etiqa Hibah" }).ok).toBe(false);
    expect(sanitizeOrgSettings({ planName: "   " }).ok).toBe(false);
    expect(sanitizeOrgSettings({ statistics: ["AIA says 90%"] }).ok).toBe(false);
  });
  it("clamps and strips markup", () => {
    const r = sanitizeOrgSettings({ planName: "<b>Plan</b>", base: 9e15, mults: [500, -1, 0, 0, 0] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.planName).toBe("bPlan/b");
      expect(r.value.base).toBe(100_000_000);
      expect(r.value.mults).toEqual([100, 0, 0, 0, 0]);
    }
  });
});

describe("sanitizeAgentSettings", () => {
  it("accepts script, objections and checklist", () => {
    const r = sanitizeAgentSettings({
      script: ["hi", "", "", "", ""],
      objections: [{ q: "It’s expensive.", a: "My own answer" }],
      riskItems: [{ label: "Pregnant", detail: "Check with underwriter" }],
    });
    expect(r.ok).toBe(true);
  });
  it("rejects unknown keys at every level and other operators", () => {
    expect(sanitizeAgentSettings({ planName: "x" }).ok).toBe(false);
    expect(sanitizeAgentSettings({ objections: [{ q: "a", a: "b", x: 1 }] }).ok).toBe(false);
    expect(sanitizeAgentSettings({ riskItems: [{ label: "a", detail: "b", x: 1 }] }).ok).toBe(false);
    expect(sanitizeAgentSettings({ script: ["Prudential is better", "", "", "", ""] }).ok).toBe(false);
    expect(sanitizeAgentSettings({ script: new Array(9).fill("x") }).ok).toBe(false);
  });
});

describe("resolveHibahSettings", () => {
  it("uses built-in defaults when nothing is set", () => {
    const r = resolveHibahSettings();
    expect(r.planName).toBe(HIBAH_DEFAULT_PLAN.name);
    expect(r.base).toBe(HIBAH_DEFAULT_PLAN.base);
    expect(r.mults).toEqual(HIBAH_DEFAULT_PLAN.mults);
    expect(r.script.map((s) => s.text)).toEqual(HIBAH_DEFAULT_CONTENT.script.map((s) => s.text));
    expect(r.riskItems).toEqual(HIBAH_DEFAULT_CONTENT.riskItems);
    expect(r.overridden).toEqual([]);
  });
  it("org defaults override built-ins; agent overrides sit on top", () => {
    const r = resolveHibahSettings(
      { planName: "[Org plan]", base: 100000, mults: [1, 2, 3, 0, 0], statistics: ["s"] },
      { script: ["", "Custom step two", "", "", ""], objections: [{ q: "It’s expensive.", a: "Mine" }] },
    );
    expect(r.planName).toBe("[Org plan]");
    expect(r.mults).toEqual([1, 2, 3, 0, 0]);
    expect(r.statistics).toEqual(["s"]);
    expect(r.script[0].text).toBe(HIBAH_DEFAULT_CONTENT.script[0].text);
    expect(r.script[1].text).toBe("Custom step two");
    expect(r.objectionsSpecific.find((o) => o.q === "It’s expensive.")?.a).toBe("Mine");
    expect(r.overridden).toContain("It’s expensive.");
  });
  it("a custom checklist replaces the default list; an empty one does not", () => {
    expect(resolveHibahSettings({}, { riskItems: [{ label: "Mine", detail: "d" }] }).riskItems).toEqual([{ label: "Mine", detail: "d" }]);
    expect(resolveHibahSettings({}, { riskItems: [] }).riskItems).toEqual(HIBAH_DEFAULT_CONTENT.riskItems);
  });
  it("separates hibah-specific from general objections", () => {
    const r = resolveHibahSettings();
    expect(r.objectionsSpecific.length).toBe(5);
    expect(r.objectionGroups.length).toBe(5);
  });
  it("reads stored junk safely", () => {
    expect(readOrgSettings({ planName: "Etiqa", base: 1 })).toEqual({});
    expect(readOrgSettings(null)).toEqual({});
    expect(readAgentSettings("nope")).toEqual({});
  });
});

describe("fillScript", () => {
  it("fills known tokens and leaves unknown ones", () => {
    expect(fillScript("{name} needs {gap} {other}", { name: "Aiman", gap: "RM1" })).toBe("Aiman needs RM1 {other}");
  });
});
