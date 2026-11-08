import { describe, expect, it } from "vitest";
import { HIBAH_DEFAULT_INPUTS } from "../defaults/hibah";
import { computeModule } from "../engine";
import {
  cleanText,
  clampNumber,
  isIsoDate,
  isUuid,
  mergeHibah,
  readStoredHibah,
  sanitizeHibahPatch,
  sanitizeNotes,
  EMPTY_EXTRAS,
} from "../validate";

describe("cleanText", () => {
  it("strips angle brackets and control characters and limits length", () => {
    expect(cleanText("<script>alert(1)</script>", 100)).toBe("scriptalert(1)/script");
    expect(cleanText("a\u0000b\u0007c", 100)).toBe("a b c");
    expect(cleanText("x".repeat(50), 10)).toHaveLength(10);
    expect(cleanText(42, 10)).toBe("");
  });
  it("keeps newlines only in multiline mode", () => {
    expect(cleanText("a\nb", 10)).toBe("a b");
    expect(cleanText("a\nb", 10, true)).toBe("a\nb");
  });
});

describe("clampNumber", () => {
  it("clamps and rounds, and rejects non-numbers", () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
    expect(clampNumber(-5, 0, 10)).toBe(0);
    expect(clampNumber(1e12, 0, 1e8)).toBe(1e8);
    expect(clampNumber("12.345", 0, 100)).toBe(12.35);
    expect(clampNumber("abc", 0, 100)).toBeNull();
    expect(clampNumber(NaN, 0, 100)).toBeNull();
    expect(clampNumber(Infinity, 0, 100)).toBeNull();
    expect(clampNumber("", 0, 100)).toBeNull();
  });
});

describe("sanitizeHibahPatch", () => {
  it("accepts the design defaults unchanged", () => {
    const r = sanitizeHibahPatch(HIBAH_DEFAULT_INPUTS);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual(HIBAH_DEFAULT_INPUTS);
  });
  it("clamps out-of-range numbers", () => {
    const r = sanitizeHibahPatch({ income: -500, replace: 250, years: 99, age: 400, home: 9e15 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ income: 0, replace: 100, years: 30, age: 120, home: 100_000_000 });
  });
  it("rejects unknown keys", () => {
    expect(sanitizeHibahPatch({ income: 1, ic_number: "900101" }).ok).toBe(false);
    expect(sanitizeHibahPatch({ outputs: {} }).ok).toBe(false);
    expect(sanitizeHibahPatch({ gap: 1 }).ok).toBe(false);
  });
  it("rejects bad enums and non-numbers", () => {
    expect(sanitizeHibahPatch({ scenario: "alive" }).ok).toBe(false);
    expect(sanitizeHibahPatch({ method: "x" }).ok).toBe(false);
    expect(sanitizeHibahPatch({ homeCov: "maybe" }).ok).toBe(false);
    expect(sanitizeHibahPatch({ income: "lots" }).ok).toBe(false);
    expect(sanitizeHibahPatch(null).ok).toBe(false);
    expect(sanitizeHibahPatch([]).ok).toBe(false);
  });
  it("cleans the nickname", () => {
    const r = sanitizeHibahPatch({ nick: "<b>Aiman</b>" });
    expect(r.ok && r.value.nick).toBe("bAiman/b");
  });
  it("validates extras", () => {
    const r = sanitizeHibahPatch({ riskChecked: ["Smoke / vape", "Smoke / vape", "<x>"], raised: ["q"] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.riskChecked).toEqual(["Smoke / vape", "x"]);
      expect(r.value.raised).toEqual(["q"]);
    }
    expect(sanitizeHibahPatch({ riskChecked: "nope" }).ok).toBe(false);
    expect(sanitizeHibahPatch({ riskChecked: [1] }).ok).toBe(false);
  });
});

describe("stored inputs", () => {
  it("fall back to defaults and ignore junk", () => {
    // A patch with a bad enum fails as a whole, so defaults win rather than half-trusting it.
    const stored = readStoredHibah({ income: 9000, evil: "x", scenario: "bad" });
    expect(stored.income).toBe(HIBAH_DEFAULT_INPUTS.income);
    expect(readStoredHibah(null)).toEqual({ ...HIBAH_DEFAULT_INPUTS, ...EMPTY_EXTRAS });
    expect(readStoredHibah({ income: 9000, evil: "x" }).income).toBe(9000);
  });
  it("later steps patch what step 1 stored", () => {
    const base = readStoredHibah({ income: 9000 });
    const merged = mergeHibah(base, { riskChecked: ["Smoke / vape"] });
    expect(merged.income).toBe(9000);
    expect(merged.riskChecked).toEqual(["Smoke / vape"]);
  });
  it("engine output for the defaults is the design fixture", () => {
    const { out } = computeModule("hibah", HIBAH_DEFAULT_INPUTS);
    expect(out.text.need).toBe("RM720,806");
    expect(out.text.have).toBe("RM175,000");
    expect(out.text.gap).toBe("RM545,806");
  });
});

describe("misc validators", () => {
  it("uuid, dates, notes", () => {
    expect(isUuid("3f2b8a52-1d3e-4c55-9a4b-0c1d2e3f4a5b")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isIsoDate("2026-11-30")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("30/11/2026")).toBe(false);
    expect(sanitizeNotes("  ")).toBeNull();
    expect(sanitizeNotes("a<b>c")).toBe("abc");
    expect(sanitizeNotes("x".repeat(5000))).toHaveLength(2000);
  });
});
