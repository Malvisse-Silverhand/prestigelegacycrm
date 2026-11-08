import { describe, expect, it } from "vitest";
import { computeHibah } from "../hibah";
import { HIBAH_DEFAULT_INPUTS } from "../../defaults/hibah";

describe("hibah engine", () => {
  it("design defaults give need RM720,806, have RM175,000, gap RM545,806", () => {
    const r = computeHibah(HIBAH_DEFAULT_INPUTS);
    expect(r.out.text.need).toBe("RM720,806");
    expect(r.out.text.have).toBe("RM175,000");
    expect(r.out.text.gap).toBe("RM545,806");
    expect(r.out.pct).toBe(24);
    expect(r.out.monthly).toBe(4800);
    expect(r.out.debts).toBe(332000); // unsure home loan counts as not covered
    expect(r.out.oneoff).toBe(83000);
    expect(r.caption).toBe("Shield 24% filled · RM545,806 still to plan for");
    expect(r.flow).toHaveLength(5);
    expect(r.legend.map((l) => l.value)).toEqual(["RM175,000", "RM545,806", "RM720,806"]);
  });

  it("never says the hibah fills the gap 100%", () => {
    const r = computeHibah(HIBAH_DEFAULT_INPUTS);
    const text = JSON.stringify(r.flow);
    expect(text).not.toMatch(/100%/);
    expect(text).toMatch(/subject to the PDS & certificate terms/);
  });

  it("zero income and no other inputs: only fixed costs remain", () => {
    const r = computeHibah({ ...HIBAH_DEFAULT_INPUTS, income: 0 });
    expect(r.out.monthly).toBe(0);
    expect(r.out.support).toBe(0);
    expect(r.out.need).toBe(332000 + 83000);
  });

  it("zero debts", () => {
    const r = computeHibah({ ...HIBAH_DEFAULT_INPUTS, home: 0, car: 0, otherDebt: 0 });
    expect(r.out.debts).toBe(0);
  });

  it("debt cover status: covered = 0, partial = amount less part, unsure/no = amount", () => {
    const b = { ...HIBAH_DEFAULT_INPUTS, car: 0, otherDebt: 0, home: 100000 };
    expect(computeHibah({ ...b, homeCov: "covered" }).out.debts).toBe(0);
    expect(computeHibah({ ...b, homeCov: "partial", homePart: 30000 }).out.debts).toBe(70000);
    expect(computeHibah({ ...b, homeCov: "partial", homePart: 999999 }).out.debts).toBe(0);
    expect(computeHibah({ ...b, homeCov: "unsure" }).out.debts).toBe(100000);
    expect(computeHibah({ ...b, homeCov: "no" }).out.debts).toBe(100000);
  });

  it("clamps years to 1-30", () => {
    expect(computeHibah({ ...HIBAH_DEFAULT_INPUTS, years: 0 }).out.years).toBe(1);
    expect(computeHibah({ ...HIBAH_DEFAULT_INPUTS, years: 99 }).out.years).toBe(30);
  });

  it("other support reduces the monthly need but never below zero", () => {
    expect(computeHibah({ ...HIBAH_DEFAULT_INPUTS, other: 1000 }).out.monthly).toBe(3800);
    expect(computeHibah({ ...HIBAH_DEFAULT_INPUTS, other: 99999 }).out.monthly).toBe(0);
  });

  it("itemised method uses the expense total", () => {
    const r = computeHibah({ ...HIBAH_DEFAULT_INPUTS, method: "itemize" });
    expect(r.out.itemTotal).toBe(3800);
    expect(r.out.monthly).toBe(3800);
  });

  it("cover greater than need clamps gap to 0 and pct to 100", () => {
    const r = computeHibah({ ...HIBAH_DEFAULT_INPUTS, existing: 5_000_000 });
    expect(r.out.gap).toBe(0);
    expect(r.out.pct).toBe(100);
    expect(r.caption).toMatch(/Shield full/);
  });

  it("empty inputs: need 0, pct 100, no NaN", () => {
    const r = computeHibah({});
    expect(r.out.need).toBe(0);
    expect(r.out.gap).toBe(0);
    expect(r.out.pct).toBe(100);
    expect(r.out.text.need).toBe("RM0");
  });
});
