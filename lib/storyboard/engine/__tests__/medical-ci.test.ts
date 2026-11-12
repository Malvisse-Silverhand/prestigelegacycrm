import { describe, expect, it } from "vitest";
import { computeMedical, MEDICAL_RISK_MAX } from "../medical";
import { computeCi } from "../ci";
import { MEDICAL_DEFAULT_INPUTS } from "../../defaults/medical";
import { CI_DEFAULT_INPUTS } from "../../defaults/ci";

// Explicit test values: the shipped bill amounts are placeholders, not facts.
const bills = [
  { label: "Test bill A", amount: 100000, source: "test" },
  { label: "Test bill B", amount: 5000, source: "test" },
];

describe("medical engine", () => {
  it("bill gap = bill - company cover - savings, clamped at 0", () => {
    const r = computeMedical({ ...MEDICAL_DEFAULT_INPUTS, bills, scenario: 0, company: 20000, savings: 10000 });
    expect(r.out.companyUsed).toBe(20000);
    expect(r.out.savingsUsed).toBe(10000);
    expect(r.out.gap).toBe(70000);
    const small = computeMedical({ ...MEDICAL_DEFAULT_INPUTS, bills, scenario: 1, company: 20000, savings: 10000 });
    expect(small.out.gap).toBe(0);
    expect(small.out.companyUsed).toBe(5000);
    expect(small.out.savingsUsed).toBe(0);
  });

  it("self-employed has no company cover", () => {
    const r = computeMedical({ ...MEDICAL_DEFAULT_INPUTS, bills, scenario: 0, work: "self" });
    expect(r.out.companyUsed).toBe(0);
    expect(r.out.gap).toBe(100000 - 10000);
  });

  it("weighted risk score and level", () => {
    const none = computeMedical({ ...MEDICAL_DEFAULT_INPUTS, bills, checked: {} });
    expect(none.out.score).toBe(0);
    expect(none.out.level).toBe("LOW");
    const default2 = computeMedical({ ...MEDICAL_DEFAULT_INPUTS, bills }); // w0 (3) + l0 (4)
    expect(default2.out.score).toBe(7);
    expect(default2.out.level).toBe("LOW");
    const mod = computeMedical({ ...MEDICAL_DEFAULT_INPUTS, bills, checked: { w0: true, l0: true, l1: true } });
    expect(mod.out.score).toBe(10);
    expect(mod.out.level).toBe("MODERATE");
    expect(mod.out.topFactors[0]).toBe("Ride a motorcycle every day");
    const all: Record<string, boolean> = {};
    for (const k of ["w", "l", "t", "h"]) for (let i = 0; i < 5; i++) all[k + i] = true;
    const high = computeMedical({ ...MEDICAL_DEFAULT_INPUTS, bills, checked: all });
    expect(high.out.score).toBe(MEDICAL_RISK_MAX);
    expect(MEDICAL_RISK_MAX).toBe(35);
    expect(high.out.level).toBe("HIGH");
  });

  it("inflation is an input with a source, not a constant", () => {
    const a = computeMedical({ ...MEDICAL_DEFAULT_INPUTS, bills, scenario: 0, inflation: 10, inflationSource: "src" });
    const b = computeMedical({ ...MEDICAL_DEFAULT_INPUTS, bills, scenario: 0, inflation: 0 });
    expect(a.out.futureBill).toBeCloseTo(100000 * 1.1 ** 5, 5);
    expect(b.out.futureBill).toBe(100000);
    expect(a.out.inflationSource).toBe("src");
    expect(a.out.billSource).toBe("test");
  });

  it("every shipped default bill carries a source placeholder", () => {
    for (const b of MEDICAL_DEFAULT_INPUTS.bills) expect(b.source).toMatch(/^\[.*\]$/);
    expect(MEDICAL_DEFAULT_INPUTS.inflationSource).toMatch(/^\[.*\]$/);
  });

  it("empty inputs do not break", () => {
    const r = computeMedical({});
    expect(r.out.gap).toBe(0);
    expect(r.out.yearsToSave).toBeNull();
  });
});

describe("ci engine", () => {
  it("total = recovery + extra + caregiver loss + contribution total", () => {
    const r = computeCi({ ...CI_DEFAULT_INPUTS, cg: 1000, cgMonths: 3, waiver: "no", contrib: 200 });
    expect(r.out.monthly).toBe(3500); // max(5000 x 70%, 3000)
    expect(r.out.recovery).toBe(3500 * 12);
    expect(r.out.extra).toBe(30000);
    expect(r.out.cgLoss).toBe(3000);
    expect(r.out.contribTotal).toBe(2400);
    expect(r.out.total).toBe(42000 + 30000 + 3000 + 2400);
  });

  it("waiver removes the contribution from the need", () => {
    const r = computeCi({ ...CI_DEFAULT_INPUTS, waiver: "yes", contrib: 200 });
    expect(r.out.contribTotal).toBe(0);
  });

  it("commitments floor the monthly figure", () => {
    expect(computeCi({ ...CI_DEFAULT_INPUTS, commit: 9000 }).out.monthly).toBe(9000);
  });

  it("early vs late structure", () => {
    const late = computeCi({ ...CI_DEFAULT_INPUTS, structure: "late", ciAmt: 100000 });
    expect(late.out.ciEarly).toBe(0);
    expect(late.out.ciLate).toBe(100000);
    const staged = computeCi({ ...CI_DEFAULT_INPUTS, structure: "staged", ciAmt: 100000, earlyPct: 50 });
    expect(staged.out.ciEarly).toBe(50000);
    expect(staged.out.ciLate).toBe(100000);
    const none = computeCi({ ...CI_DEFAULT_INPUTS, structure: "none", ciAmt: 100000, recovery: "5000" });
    expect(none.out.ciEarly).toBe(0);
    expect(none.out.ciLate).toBe(0);
    const boosted = computeCi({ ...CI_DEFAULT_INPUTS, structure: "late", ciAmt: 100000, booster: "50", recovery: "10000" });
    expect(boosted.out.ciLate).toBe(160000);
  });

  it("months = 0 gives 0 need, never NaN", () => {
    const r = computeCi({ ...CI_DEFAULT_INPUTS, months: 0, rehab: 0, emer: 0 });
    expect(r.out.recovery).toBe(0);
    expect(r.out.total).toBe(0);
    expect(r.out.gapEarly).toBe(0);
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/NaN|Infinity/);
    expect(r.scene.wEarly).toBe(0);
  });

  it("cover greater than need clamps the gap to 0", () => {
    const r = computeCi({ ...CI_DEFAULT_INPUTS, structure: "late", ciAmt: 5_000_000 });
    expect(r.out.gapLate).toBe(0);
    expect(r.out.gapEarly).toBeGreaterThan(0);
  });

  it("dependency score levels", () => {
    const deps = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [String(i), true]));
    expect(computeCi({ ...CI_DEFAULT_INPUTS, deps: deps(3) }).out.depLevel).toBe("Low dependency so far");
    expect(computeCi({ ...CI_DEFAULT_INPUTS, deps: deps(6) }).out.depLevel).toBe("Moderate dependency");
    expect(computeCi({ ...CI_DEFAULT_INPUTS, deps: deps(7) }).out.depLevel).toBe("High dependency");
  });

  it("empty inputs", () => {
    const r = computeCi({});
    expect(r.out.total).toBe(0);
    expect(r.out.runEarly).toBe(0);
  });
});
