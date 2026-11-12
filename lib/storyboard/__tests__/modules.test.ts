import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUILT_MODULES, isBuiltModule, SCREEN_IDS, screenId, MODULE_TITLE } from "../modules";
import { STORYBOARD_MODULES, STORYBOARD_STEPS } from "../types";
import { MODULE_CONTENT } from "../settings";
import { BUSINESS_NEEDS } from "../defaults/business";

describe("module -> screen registry", () => {
  it("covers every built module and every step exactly once", () => {
    expect(SCREEN_IDS).toHaveLength(BUILT_MODULES.length * STORYBOARD_STEPS.length);
    expect(new Set(SCREEN_IDS).size).toBe(SCREEN_IDS.length);
    for (const m of BUILT_MODULES) {
      for (const s of STORYBOARD_STEPS) expect(SCREEN_IDS).toContain(screenId(m, s));
    }
  });

  it("built modules are a subset of the database modules, and only Mortgage is left out", () => {
    for (const m of BUILT_MODULES) expect(STORYBOARD_MODULES as readonly string[]).toContain(m);
    expect(STORYBOARD_MODULES.filter((m) => !isBuiltModule(m))).toEqual(["mortgage"]);
  });

  it("the React registry file names every screen id", () => {
    const file = path.resolve(__dirname, "../../../components/storyboard/registry.tsx");
    const src = readFileSync(file, "utf8");
    for (const id of SCREEN_IDS) expect(src, id).toContain(`"${id}"`);
  });

  it("every screen component file exists", () => {
    const dir = path.resolve(__dirname, "../../../components/storyboard");
    const src = readFileSync(path.join(dir, "registry.tsx"), "utf8");
    const imports = [...src.matchAll(/from "\.\/([a-z-]+\/[a-z-]+)"/g)].map((m) => m[1]);
    const names = new Set(imports);
    for (const m of BUILT_MODULES) {
      for (const s of ["fill", "explain", "risk", "objections"]) {
        expect(names.has(`${m}/${m}-${s}`), `${m}/${m}-${s}`).toBe(true);
      }
    }
  });

  it("every built module has a title and built-in content for all four steps", () => {
    for (const m of BUILT_MODULES) {
      expect(MODULE_TITLE[m].length).toBeGreaterThan(3);
      const c = MODULE_CONTENT[m].content;
      expect(c.script.length, m + " script").toBeGreaterThan(0);
      expect(c.riskItems.length, m + " risk items").toBeGreaterThan(0);
      expect(c.riskReasons.length, m + " risk reasons").toBeGreaterThan(0);
      expect(c.objections.length, m + " objections").toBeGreaterThan(0);
      expect(c.faq.length, m + " faq").toBeGreaterThan(0);
      expect(MODULE_CONTENT[m].planName).toMatch(/^\[GE .*\]$/);
    }
  });

  it("business script steps belong to a known need, and every need has steps", () => {
    const keys = BUSINESS_NEEDS.map((n) => n.key);
    const groups = MODULE_CONTENT.business.content.script.map((s) => s.group);
    for (const g of groups) expect(keys as readonly (string | undefined)[]).toContain(g);
    for (const k of keys) expect(groups).toContain(k);
  });
});
