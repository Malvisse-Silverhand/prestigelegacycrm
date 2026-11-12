import { describe, expect, it } from "vitest";
import { bm, en, t, type TKey } from "../i18n";
import { DEFAULT_LANG, htmlLang, langFromCookie, parseLang } from "../i18n/lang";
import { DEFAULT_PLAN_NAMES } from "../defaults/common";
import { CONTRIBUTION_FROM_ILLUSTRATION } from "../engine/mortgage";

// Keys whose Bahasa Malaysia is legitimately identical to the English
// (product terms and brand words). Everything else must differ.
const EXEMPT = new Set<string>([
  "lang.optionEn",
  "lang.optionBm",
  "module.hibah",
  "list.colLead",
  "hibah.summary.moduleLabel",
  "hibah.svg.hibah",
  "medical.svg.panel",
]);

const keys = Object.keys(en) as TKey[];
const tokens = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionaries", () => {
  it("every English key exists in BM and vice versa", () => {
    expect(Object.keys(bm).sort()).toEqual(Object.keys(en).sort());
  });

  it("no empty strings", () => {
    for (const k of keys) {
      expect(en[k].trim(), "en " + k).not.toBe("");
      expect(bm[k].trim(), "bm " + k).not.toBe("");
    }
  });

  it("{placeholders} are identical in English and BM", () => {
    for (const k of keys) expect(tokens(bm[k]), k).toEqual(tokens(en[k]));
  });

  it("BM differs from English for every non-exempt key", () => {
    const same = keys.filter((k) => bm[k] === en[k] && !EXEMPT.has(k));
    expect(same).toEqual([]);
  });

  it("the exempt list has no stale entries", () => {
    for (const k of EXEMPT) expect(keys as string[], k).toContain(k);
  });

  it("t() fills variables and falls back safely", () => {
    expect(t("flow.slideOf", "bm", { n: 2, total: 5 })).toBe("Slaid 2 daripada 5");
    expect(t("flow.slideOf", "en", { n: 2, total: 5 })).toBe("Slide 2 of 5");
    expect(t("common.save")).toBe("Save");
  });

  it("keeps the English values other code compares against", () => {
    expect(t("plan.default.hibah")).toBe(DEFAULT_PLAN_NAMES.hibah);
    expect(t("plan.default.business")).toBe(DEFAULT_PLAN_NAMES.business);
    expect(t("plan.default.mrtt")).toBe(DEFAULT_PLAN_NAMES.mrtt);
    expect(t("scene.official")).toBe(CONTRIBUTION_FROM_ILLUSTRATION);
  });

  it("uses the required module names and compliance phrases in BM", () => {
    expect(t("module.medical", "bm")).toBe("Kad Perubatan");
    expect(t("module.ci", "bm")).toBe("Penyakit Kritikal");
    expect(t("module.business", "bm")).toBe("Perlindungan Perniagaan");
    expect(t("module.mortgage", "bm")).toBe("Perlindungan Gadai Janji");
    expect(t("scene.official", "bm")).toBe("Daripada ilustrasi rasmi");
    expect(t("hibah.wa.could", "bm", { amount: "RM1" })).toContain(
      "boleh membantu menampung jurang ini, tertakluk kepada terma Helaian Pendedahan Produk (PDS) dan sijil",
    );
  });
});

describe("language helpers (setStoryboardLang validation)", () => {
  it("accepts only 'en' and 'bm'", () => {
    expect(parseLang("en")).toBe("en");
    expect(parseLang("bm")).toBe("bm");
    for (const bad of ["EN", "ms", "", " bm", null, undefined, 1, {}, ["bm"]]) expect(parseLang(bad)).toBeNull();
  });
  it("a bad cookie falls back to the default", () => {
    expect(langFromCookie("fr")).toBe(DEFAULT_LANG);
    expect(langFromCookie(undefined)).toBe("en");
    expect(langFromCookie("bm")).toBe("bm");
  });
  it("html lang is 'ms' for BM", () => {
    expect(htmlLang("bm")).toBe("ms");
    expect(htmlLang("en")).toBe("en");
  });
});
