import { describe, expect, it } from "vitest";
import { computeBusiness, type BusinessInputs } from "../business";
import { BUSINESS_DEFAULT_INPUTS } from "../../defaults/business";

const d = BUSINESS_DEFAULT_INPUTS;
const kp = d.kps[0];

describe("business engine", () => {
  it("keyman, profit method: succession factor 1 / 0.75 / 0.5", () => {
    // base = 360000 + 60000 x 12 = 1,080,000; impact 50% => 540,000/yr; stable 12 months
    const run = (succ: "none" | "second" | "ready") =>
      computeBusiness({ ...d, kCount: 1, reserve: 0, kps: [{ ...kp, succ }] }).out.keymen[0].death;
    expect(run("none")).toBe(540000 * 1 + 60000);
    expect(run("second")).toBe(540000 * 0.75 + 60000);
    expect(run("ready")).toBe(540000 * 0.5 + 60000);
  });

  it("keyman CI uses 0.5 x cost", () => {
    // 540000 x 6/12 x 1 + 0.5 x 60000
    const r = computeBusiness({ ...d, kCount: 1, reserve: 0, kps: [kp] });
    expect(r.out.keymen[0].ci).toBe(270000 + 30000);
  });

  it("salary-multiple and replacement methods", () => {
    const sal = computeBusiness({ ...d, kCount: 1, reserve: 0, kMethod: "salary", kMult: 5, kps: [kp] });
    expect(sal.out.keymen[0].death).toBe(600000);
    const rep = computeBusiness({ ...d, kCount: 1, reserve: 0, kMethod: "replace", kps: [kp] });
    expect(rep.out.keymen[0].death).toBe(60000 + 120000);
  });

  it("reserve and existing cover reduce keyman need, clamped at 0", () => {
    const r = computeBusiness({ ...d, kCount: 1, reserve: 10_000_000, kps: [kp] });
    expect(r.out.kmTotal).toBe(0);
    const ex = computeBusiness({ ...d, kCount: 1, reserve: 0, kps: [{ ...kp, exD: 1_000_000 }] });
    expect(ex.out.keymen[0].death).toBe(0);
  });

  it("buy-sell with multiple valuation less partner existing cover", () => {
    // value = 360000 x 3 = 1,080,000
    const r = computeBusiness({ ...d, pCount: 3 });
    expect(r.out.businessValue).toBe(1080000);
    expect(r.out.partners.map((p) => p.need)).toEqual([540000, 324000, 216000]);
    expect(r.out.bsTotal).toBe(1080000);
    const ex = computeBusiness({ ...d, pCount: 3, partners: d.partners.map((p, i) => (i === 0 ? { ...p, ex: 600000 } : p)) });
    expect(ex.out.partners[0].need).toBe(0);
  });

  it("buy-sell with manual valuation", () => {
    const r = computeBusiness({ ...d, valMethod: "manual", valManual: 2_000_000, pCount: 2, partners: [{ name: "A", pct: 60, age: 40, ex: 0 }, { name: "B", pct: 40, age: 40, ex: 0 }] });
    expect(r.out.businessValue).toBe(2_000_000);
    expect(r.out.bsTotal).toBe(2_000_000);
    expect(r.warnings).toEqual([]);
  });

  it("warns, without changing the maths, when partner % does not total 100", () => {
    const partners = [{ name: "A", pct: 60, age: 40, ex: 0 }, { name: "B", pct: 30, age: 40, ex: 0 }];
    const r = computeBusiness({ ...d, pCount: 2, partners });
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatch(/90%/);
    expect(r.out.pctTotal).toBe(90);
    expect(r.out.bsTotal).toBe(1080000 * 0.9);
  });

  it("loan gap = guaranteed amount - existing loan protection", () => {
    // debt = 450000 + 150000 + 120000 = 720,000
    const r = computeBusiness({ ...d, guarPct: 50, lCover: 100000 });
    expect(r.out.debt).toBe(720000);
    expect(r.out.guar).toBe(360000);
    expect(r.out.loanGap).toBe(260000);
    expect(computeBusiness({ ...d, lCover: 9_999_999 }).out.loanGap).toBe(0);
  });

  it("estate slide only for non-company entities; guarantee is 100% for them", () => {
    const co = computeBusiness({ ...d, entity: "sdn" });
    expect(co.out.showEstate).toBe(false);
    expect(co.out.rows.map((x) => x.key)).toEqual(["keyman", "buysell", "loan"]);
    expect(co.flow.some((s) => s.tag === "ESTATE")).toBe(false);
    const sole = computeBusiness({ ...d, entity: "sole", guarPct: 10 });
    expect(sole.out.showEstate).toBe(true);
    expect(sole.out.rows.map((x) => x.key)).toContain("enterprise");
    expect(sole.flow.some((s) => s.tag === "ESTATE")).toBe(true);
    expect(sole.out.guarPct).toBe(100);
  });

  it("enterprise gap", () => {
    // (8000 + 10000 + 12000 + 8000) x 6 = 228,000
    const r = computeBusiness({ ...d, entity: "sole", eHibah: 28000 });
    expect(r.out.eNeed).toBe(228000);
    expect(r.out.eGap).toBe(200000);
  });

  it("empty inputs", () => {
    const r = computeBusiness({} as Partial<BusinessInputs>);
    expect(r.out.total).toBe(0);
    expect(r.warnings).toEqual([]);
  });
});
