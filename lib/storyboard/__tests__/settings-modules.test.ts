import { describe, expect, it } from "vitest";
import { BUILT_MODULES } from "../modules";
import {
  MODULE_CONTENT,
  readOrgSettings,
  resolveSettings,
  sanitizeAgentSettings,
  sanitizeOrgSettings,
} from "../settings";

describe("org settings per module", () => {
  it("plan name and statistics are accepted for every built module", () => {
    for (const m of BUILT_MODULES) {
      const r = sanitizeOrgSettings({ planName: "[GE plan]", statistics: ["[statistic + source]"] }, m);
      expect(r.ok, m).toBe(true);
    }
  });
  it("base amount and multiples are Hibah only", () => {
    expect(sanitizeOrgSettings({ base: 1 }, "hibah").ok).toBe(true);
    for (const m of ["medical", "ci", "business"] as const) {
      expect(sanitizeOrgSettings({ base: 1 }, m).ok, m).toBe(false);
      expect(sanitizeOrgSettings({ mults: [1, 2, 3, 4, 5] }, m).ok, m).toBe(false);
    }
  });
  it("other operators are refused in every module", () => {
    for (const m of BUILT_MODULES) {
      expect(sanitizeOrgSettings({ planName: "Etiqa plan" }, m).ok, m).toBe(false);
      expect(sanitizeOrgSettings({ statistics: ["AIA says so"] }, m).ok, m).toBe(false);
    }
  });
  it("stored junk reads back as empty", () => {
    expect(readOrgSettings({ planName: "Etiqa", base: 1 }, "medical")).toEqual({});
    expect(readOrgSettings({ planName: "[GE plan]" }, "ci")).toEqual({ planName: "[GE plan]" });
  });
});

describe("agent settings per module", () => {
  it("the script may be as long as the module's built-in script and no longer", () => {
    for (const m of BUILT_MODULES) {
      const n = MODULE_CONTENT[m].content.script.length;
      expect(sanitizeAgentSettings({ script: new Array(n).fill("") }, m).ok, m).toBe(true);
      expect(sanitizeAgentSettings({ script: new Array(n + 1).fill("") }, m).ok, m).toBe(false);
    }
  });
  it("business has a longer script than medical (one block per need)", () => {
    expect(MODULE_CONTENT.business.content.script.length).toBeGreaterThan(MODULE_CONTENT.medical.content.script.length);
  });
});

describe("resolveSettings", () => {
  it("uses each module's own plan placeholder and content", () => {
    for (const m of BUILT_MODULES) {
      const r = resolveSettings(m);
      expect(r.planName).toBe(MODULE_CONTENT[m].planName);
      expect(r.script.map((s) => s.text)).toEqual(MODULE_CONTENT[m].content.script.map((s) => s.text));
      expect(r.riskItems).toEqual(MODULE_CONTENT[m].content.riskItems);
      expect(r.objectionGroups).toHaveLength(5);
      expect(r.objectionsSpecific.length).toBeGreaterThan(0);
    }
  });
  it("only Hibah has a base amount and multiples", () => {
    expect(resolveSettings("hibah").mults.length).toBeGreaterThan(0);
    for (const m of ["medical", "ci", "business"] as const) {
      expect(resolveSettings(m).mults).toEqual([]);
      expect(resolveSettings(m).base).toBe(0);
    }
  });
  it("org plan name and statistics reach the module; agent overrides sit on top", () => {
    const r = resolveSettings(
      "medical",
      { planName: "[Org medical]", statistics: ["[stat + source]"] },
      { script: ["", "My own step"], objections: [{ q: "My company already has a panel.", a: "Mine" }] },
    );
    expect(r.planName).toBe("[Org medical]");
    expect(r.statistics).toEqual(["[stat + source]"]);
    expect(r.script[1].text).toBe("My own step");
    expect(r.objectionsSpecific.find((o) => o.q === "My company already has a panel.")?.a).toBe("Mine");
  });
  it("keeps the business script group on each step", () => {
    const r = resolveSettings("business");
    expect(r.script.every((s) => s.group)).toBe(true);
  });
  it("module default content names no other operator and invents no statistic", () => {
    for (const m of BUILT_MODULES) {
      const text = JSON.stringify(MODULE_CONTENT[m].content);
      expect(text, m).not.toMatch(/prudential|etiqa|allianz|\baia\b|manulife|takaful malaysia/i);
      expect(text, m).not.toMatch(/guaranteed (claim|payout|approval|acceptance)/i);
      expect(text, m).not.toMatch(/\b\d{1,3}(\.\d+)?\s?% of (malaysians|people|claims)/i);
    }
  });
});
