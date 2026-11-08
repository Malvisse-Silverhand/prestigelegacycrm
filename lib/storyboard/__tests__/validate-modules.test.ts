import { describe, expect, it } from "vitest";
import { MEDICAL_DEFAULT_INPUTS } from "../defaults/medical";
import { CI_DEFAULT_INPUTS } from "../defaults/ci";
import { BUSINESS_DEFAULT_INPUTS } from "../defaults/business";
import { computeModule } from "../engine";
import {
  defaultStored,
  mergeStored,
  readStored,
  sanitizeBusinessPatch,
  sanitizeCiPatch,
  sanitizeMedicalPatch,
  sanitizePatch,
  type MedicalStored,
} from "../validate";

describe("sanitizeMedicalPatch", () => {
  it("accepts the design defaults unchanged", () => {
    const r = sanitizeMedicalPatch(MEDICAL_DEFAULT_INPUTS);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual(MEDICAL_DEFAULT_INPUTS);
  });
  it("clamps numbers and rounds the scenario index", () => {
    const r = sanitizeMedicalPatch({ company: -5, savings: 9e15, scenario: 2.6, inflation: 900, monthlySave: "12.345" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ company: 0, savings: 100_000_000, scenario: 3, inflation: 100, monthlySave: 12.35 });
  });
  it("rejects unknown keys, including smuggled outputs and ID numbers", () => {
    expect(sanitizeMedicalPatch({ company: 1, ic_number: "900101-01-1234" }).ok).toBe(false);
    expect(sanitizeMedicalPatch({ outputs: {} }).ok).toBe(false);
    expect(sanitizeMedicalPatch({ gap: 1 }).ok).toBe(false);
    // CI and Business keys do not leak across modules.
    expect(sanitizeMedicalPatch({ commitChecked: [] }).ok).toBe(false);
  });
  it("rejects bad enums, bad numbers and bad shapes", () => {
    expect(sanitizeMedicalPatch({ work: "retired" }).ok).toBe(false);
    expect(sanitizeMedicalPatch({ company: "lots" }).ok).toBe(false);
    expect(sanitizeMedicalPatch(null).ok).toBe(false);
    expect(sanitizeMedicalPatch([]).ok).toBe(false);
    expect(sanitizeMedicalPatch({ bills: [] }).ok).toBe(false);
    expect(sanitizeMedicalPatch({ bills: new Array(13).fill({ label: "x", amount: 1, source: "" }) }).ok).toBe(false);
    expect(sanitizeMedicalPatch({ bills: [{ label: "x", amount: 1, source: "", extra: 1 }] }).ok).toBe(false);
    expect(sanitizeMedicalPatch({ bills: [{ label: "x", amount: "abc", source: "" }] }).ok).toBe(false);
    expect(sanitizeMedicalPatch({ checked: { zz: true } }).ok).toBe(false);
    expect(sanitizeMedicalPatch({ checked: { w0: "yes" } }).ok).toBe(false);
  });
  it("keeps only the ticked checklist keys", () => {
    const r = sanitizeMedicalPatch({ checked: { w0: true, l1: false, t2: true } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.checked).toEqual({ w0: true, t2: true });
  });
  it("strips markup and limits lengths in the bill source and story", () => {
    const r = sanitizeMedicalPatch({
      bills: [{ label: "<b>Stay</b>", amount: 100, source: "x".repeat(500) }],
      story: "y".repeat(5000),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.bills?.[0].label).toBe("bStay/b");
      expect(r.value.bills?.[0].source).toHaveLength(200);
      expect(r.value.story).toHaveLength(1500);
    }
  });
  it("refuses a source that names another operator", () => {
    expect(sanitizeMedicalPatch({ bills: [{ label: "x", amount: 1, source: "Etiqa price list" }] }).ok).toBe(false);
    expect(sanitizeMedicalPatch({ inflationSource: "Prudential report" }).ok).toBe(false);
  });
  it("merging keeps the scenario index inside the bills list", () => {
    const base = defaultStored("medical");
    const merged = mergeStored("medical", base, { bills: [{ label: "Only", amount: 10, source: "s" }] }) as MedicalStored;
    expect(merged.scenario).toBe(0);
  });
});

describe("sanitizeCiPatch", () => {
  it("accepts the design defaults (string booster and recovery become numbers)", () => {
    const r = sanitizeCiPatch(CI_DEFAULT_INPUTS);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ ...CI_DEFAULT_INPUTS, booster: 0, recovery: 0 });
  });
  it("clamps numbers", () => {
    const r = sanitizeCiPatch({ income: -1, pct: 400, months: 9999, earlyPct: 130, booster: "25", ciAmt: 9e15 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ income: 0, pct: 100, months: 120, earlyPct: 100, booster: 25, ciAmt: 100_000_000 });
  });
  it("rejects unknown keys and bad enums", () => {
    expect(sanitizeCiPatch({ income: 1, nric: "900101" }).ok).toBe(false);
    expect(sanitizeCiPatch({ structure: "everything" }).ok).toBe(false);
    expect(sanitizeCiPatch({ waiver: "maybe" }).ok).toBe(false);
    expect(sanitizeCiPatch({ reduces: 1 }).ok).toBe(false);
    expect(sanitizeCiPatch({ deps: { "99": true } }).ok).toBe(false);
    expect(sanitizeCiPatch({ bills: [] }).ok).toBe(false);
  });
  it("stores the story as agent text, limited and without markup", () => {
    const r = sanitizeCiPatch({ story: "<i>A client</i>" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.story).toBe("iA client/i");
    const long = sanitizeCiPatch({ story: "z".repeat(9000) });
    if (long.ok) expect(long.value.story).toHaveLength(2000);
  });
  it("limits proofs and refuses plan names of other operators", () => {
    expect(sanitizeCiPatch({ proofs: [{ t: "a", v: "b", d: "c" }, { t: "a", v: "b", d: "c" }, { t: "a", v: "b", d: "c" }, { t: "a", v: "b", d: "c" }] }).ok).toBe(false);
    expect(sanitizeCiPatch({ proofs: [{ t: "a", v: "b", d: "c", x: 1 }] }).ok).toBe(false);
    expect(sanitizeCiPatch({ approachNames: ["AIA Vitality CI"] }).ok).toBe(false);
    expect(sanitizeCiPatch({ approachNames: ["[GE lump-sum CI rider]"] }).ok).toBe(true);
  });
  it("the story defaults to empty", () => {
    expect(defaultStored("ci").story).toBe("");
  });
});

describe("sanitizeBusinessPatch", () => {
  it("accepts the design defaults (string months become numbers)", () => {
    const r = sanitizeBusinessPatch(BUSINESS_DEFAULT_INPUTS);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.company).toBe(BUSINESS_DEFAULT_INPUTS.company);
      expect(r.value.kps?.[0].stable).toBe(12);
      expect(r.value.eMonths).toBe(6);
      expect(r.value.partners).toHaveLength(5);
    }
  });
  it("clamps numbers", () => {
    const r = sanitizeBusinessPatch({ profit: -9, kMult: 500, kCount: 9, guarPct: 150, pCount: 12, eMonths: 99 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ profit: 0, kMult: 50, kCount: 3, guarPct: 100, pCount: 5, eMonths: 36 });
  });
  it("rejects unknown keys, bad enums and over-long lists", () => {
    expect(sanitizeBusinessPatch({ profit: 1, commission: 5 }).ok).toBe(false);
    expect(sanitizeBusinessPatch({ entity: "trust" }).ok).toBe(false);
    expect(sanitizeBusinessPatch({ structure: "x" }).ok).toBe(false);
    expect(sanitizeBusinessPatch({ eWill: "yes" }).ok).toBe(false);
    const kp = BUSINESS_DEFAULT_INPUTS.kps[0];
    expect(sanitizeBusinessPatch({ kps: [kp, kp, kp, kp] }).ok).toBe(false);
    expect(sanitizeBusinessPatch({ kps: [{ ...kp, succ: "maybe" }] }).ok).toBe(false);
    expect(sanitizeBusinessPatch({ kps: [{ ...kp, ic_number: "1" }] }).ok).toBe(false);
    const p = BUSINESS_DEFAULT_INPUTS.partners[0];
    expect(sanitizeBusinessPatch({ partners: new Array(6).fill(p) }).ok).toBe(false);
    expect(sanitizeBusinessPatch({ partners: [{ ...p, pct: "lots" }] }).ok).toBe(false);
  });
  it("clamps partner and key-person fields inside the lists", () => {
    const p = BUSINESS_DEFAULT_INPUTS.partners[0];
    const r = sanitizeBusinessPatch({ partners: [{ ...p, pct: 400, age: 400, ex: -1 }] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.partners?.[0]).toEqual({ name: p.name, pct: 100, age: 120, ex: 0 });
  });
  it("accepts partner shares that do not total 100 (the engine warns instead)", () => {
    const r = sanitizeBusinessPatch({ partners: [{ name: "A", pct: 60, age: 40, ex: 0 }, { name: "B", pct: 30, age: 40, ex: 0 }], pCount: 2 });
    expect(r.ok).toBe(true);
    const out = computeModule("business", { ...BUSINESS_DEFAULT_INPUTS, partners: [{ name: "A", pct: 60, age: 40, ex: 0 }, { name: "B", pct: 30, age: 40, ex: 0 }], pCount: 2 });
    expect(out.warnings.length).toBe(1);
    expect(out.warnings[0]).toMatch(/90%/);
  });
});

describe("generic dispatch", () => {
  it("sanitizePatch routes by module and rejects cross-module keys", () => {
    expect(sanitizePatch("medical", { company: 1 }).ok).toBe(true);
    expect(sanitizePatch("ci", { company: 1 }).ok).toBe(false); // CI has no "company"
    expect(sanitizePatch("business", { company: "Acme Sdn Bhd" }).ok).toBe(true);
    expect(sanitizePatch("hibah", { income: 1 }).ok).toBe(true);
    expect(sanitizePatch("hibah", { company: 1 }).ok).toBe(false);
  });
  it("readStored falls back to defaults for junk, field by field", () => {
    expect(readStored("medical", null)).toEqual(defaultStored("medical"));
    expect(readStored("ci", "junk")).toEqual(defaultStored("ci"));
    const m = readStored("medical", { company: 777, savings: "not a number", ic_number: "x" });
    expect(m.company).toBe(777);
    expect(m.savings).toBe(MEDICAL_DEFAULT_INPUTS.savings);
    expect("ic_number" in m).toBe(false);
  });
  it("every module's stored default computes without NaN", () => {
    for (const mod of ["hibah", "medical", "ci", "business"] as const) {
      const r = computeModule(mod, defaultStored(mod) as never);
      expect(JSON.stringify(r)).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
});
