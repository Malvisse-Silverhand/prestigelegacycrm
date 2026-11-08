import { describe, expect, it } from "vitest";
import {
  computeMortgage,
  CONTRIBUTION_FROM_ILLUSTRATION,
  hibahHomeCovFromMortgage,
  loanBalance,
  monthlyPayment,
} from "../mortgage";
import { MORTGAGE_DEFAULT_INPUTS } from "../../defaults/mortgage";

describe("mortgage maths", () => {
  it("standard annuity payment", () => {
    // 300,000 at 4.5% over 30 years is about RM1,520.06
    expect(monthlyPayment(300000, 4.5, 360)).toBeCloseTo(1520.06, 2);
  });

  it("zero rate is straight line", () => {
    expect(monthlyPayment(120000, 0, 120)).toBe(1000);
    expect(loanBalance(120000, 0, 120, 60)).toBe(60000);
  });

  it("balance starts at P, ends at 0, and matches the closed form", () => {
    expect(loanBalance(300000, 4.5, 360, 0)).toBe(300000);
    expect(loanBalance(300000, 4.5, 360, 360)).toBe(0);
    const r = 0.045 / 12;
    const pmt = monthlyPayment(300000, 4.5, 360);
    const k = 60;
    const expected = 300000 * (1 + r) ** k - (pmt * ((1 + r) ** k - 1)) / r;
    expect(loanBalance(300000, 4.5, 360, k)).toBeCloseTo(expected, 6);
  });

  it("degenerate inputs give 0, never NaN", () => {
    expect(monthlyPayment(0, 4, 360)).toBe(0);
    expect(monthlyPayment(1000, 4, 0)).toBe(0);
    expect(loanBalance(0, 4, 360, 10)).toBe(0);
    expect(loanBalance(1000, 4, 0, 10)).toBe(0);
  });
});

describe("mortgage engine", () => {
  const base = { ...MORTGAGE_DEFAULT_INPUTS, loanAmount: 300000, rate: 4.5, termYears: 30 };

  it("MRTT at the same rate and term tracks the balance exactly", () => {
    const r = computeMortgage(base);
    for (const p of r.out.series) {
      expect(p.mrttGap).toBe(0);
      expect(p.mrttCover).toBeCloseTo(p.balance, 2);
    }
  });

  it("MLTT is level and leaves a growing surplus", () => {
    const r = computeMortgage(base);
    expect(r.out.series[0].mlttCover).toBe(300000);
    expect(r.out.series[10].mlttCover).toBe(300000);
    expect(r.out.series[10].mlttGap).toBe(0);
    expect(r.out.series[10].mlttSurplus).toBeCloseTo(300000 - r.out.series[10].balance, 2);
    expect(r.out.mlttMaxSurplus).toBeGreaterThan(0);
  });

  it("a higher real rate than the assumed rate opens an MRTT gap", () => {
    const r = computeMortgage({ ...base, rate: 6, mrttAssumedRate: 3.5 });
    expect(r.out.series[10].mrttGap).toBeGreaterThan(0);
    expect(r.out.mrttMaxGap).toBeGreaterThan(0);
    expect(r.out.mlttMaxGap).toBe(0);
  });

  it("a short MRTT cover term ends the cover while the loan runs on", () => {
    const r = computeMortgage({ ...base, mrttCoverYears: 20 });
    expect(r.out.series[25].mrttCover).toBe(0);
    expect(r.out.series[25].mrttGap).toBeGreaterThan(0);
  });

  it("contributions show the illustration note unless the agent entered them", () => {
    const r = computeMortgage(base);
    expect(r.out.contribution.mrtt).toBe(CONTRIBUTION_FROM_ILLUSTRATION);
    expect(r.out.contribution.mltt).toBe(CONTRIBUTION_FROM_ILLUSTRATION);
    expect(r.out.contribution.difference).toBeNull();
    const e = computeMortgage({ ...base, mrttContribution: 80, mlttContribution: 120 });
    expect(e.out.contribution.mrtt).toBe("RM80/mo");
    expect(e.out.contribution.mltt).toBe("RM120/mo");
    expect(e.out.contribution.difference).toBe("RM40/mo");
    const half = computeMortgage({ ...base, mrttContribution: 80 });
    expect(half.out.contribution.mltt).toBe(CONTRIBUTION_FROM_ILLUSTRATION);
    expect(half.out.contribution.difference).toBeNull();
  });

  it("plan names are placeholders by default", () => {
    const r = computeMortgage(base);
    expect(r.out.mrttName).toBe("[GE MRTT plan]");
    expect(r.out.mlttName).toBe("[GE MLTT plan]");
  });

  it("zero rate and empty inputs", () => {
    expect(computeMortgage({ ...base, rate: 0 }).out.series[15].balance).toBe(150000);
    const e = computeMortgage({});
    expect(JSON.stringify(e)).not.toMatch(/NaN|Infinity/);
    expect(e.out.series[0].balance).toBe(0);
  });

  it("flow has slides and no guarantee wording", () => {
    const r = computeMortgage(base);
    expect(r.flow.length).toBeGreaterThanOrEqual(4);
    expect(JSON.stringify(r.flow)).not.toMatch(/guarantee/i);
  });
});

describe("hibah auto-feed", () => {
  const r = computeMortgage({ ...MORTGAGE_DEFAULT_INPUTS, loanAmount: 300000, rate: 6, mrttAssumedRate: 3.5 });
  const mrtt = { series: r.out.series, chosenPlan: "mrtt" as const };
  const mltt = { series: r.out.series, chosenPlan: "mltt" as const };

  it("MLTT level cover is 'covered' while it exceeds the balance", () => {
    expect(hibahHomeCovFromMortgage(mltt, 5)).toBe("covered");
  });

  it("MRTT below the balance is 'partial'", () => {
    expect(hibahHomeCovFromMortgage(mrtt, 5)).toBe("partial");
  });

  it("no chosen plan is 'unsure'", () => {
    expect(hibahHomeCovFromMortgage({ series: r.out.series, chosenPlan: null }, 5)).toBe("unsure");
  });

  it("cover that has ended is 'unsure'", () => {
    const short = computeMortgage({ ...MORTGAGE_DEFAULT_INPUTS, mrttCoverYears: 10 });
    expect(hibahHomeCovFromMortgage({ series: short.out.series, chosenPlan: "mrtt" }, 20)).toBe("unsure");
  });

  it("is skipped when the agent set homeCov manually", () => {
    expect(hibahHomeCovFromMortgage(mltt, 5, true, "partial")).toBe("partial");
    expect(hibahHomeCovFromMortgage(mltt, 5, true)).toBe("unsure");
  });
});
