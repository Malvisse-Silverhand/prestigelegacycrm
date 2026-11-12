import { describe, expect, it } from "vitest";
import { formatNum, formatRM, fromSen, num, pctOf, rmWhole, safeDiv, sumRm, toSen } from "../money";

describe("money", () => {
  it("converts to integer sen and back", () => {
    expect(toSen(12.34)).toBe(1234);
    expect(toSen(0.1) + toSen(0.2)).toBe(30);
    expect(fromSen(1234)).toBe(12.34);
    expect(sumRm(0.1, 0.2)).toBe(0.3);
  });

  it("rounds once at output", () => {
    expect(toSen(1.006)).toBe(101);
    expect(toSen(-1.006)).toBe(-101);
    expect(fromSen(100.4)).toBe(1);
  });

  it("formats RM with en-MY grouping and no needless decimals", () => {
    expect(formatRM(1234)).toBe("RM1,234");
    expect(formatRM(720806)).toBe("RM720,806");
    expect(formatRM(1234567)).toBe("RM1,234,567");
    expect(formatRM(0)).toBe("RM0");
    expect(formatRM(0.5)).toBe("RM0.50");
    expect(formatRM(-1500)).toBe("-RM1,500");
    expect(rmWhole(545806.2)).toBe("RM545,806");
    expect(formatNum(1234.6)).toBe("1,235");
  });

  it("never returns NaN or Infinity", () => {
    expect(num(NaN)).toBe(0);
    expect(num(Infinity)).toBe(0);
    expect(num("abc")).toBe(0);
    expect(num(undefined)).toBe(0);
    expect(formatRM(NaN)).toBe("RM0");
    expect(safeDiv(1, 0)).toBe(0);
    expect(pctOf(5, 0)).toBe(0);
    expect(pctOf(500, 100)).toBe(100);
  });
});
