import { describe, expect, it } from "vitest";
import { resolveTarget, targetBasePath } from "../target";
import { attachErrorKey, daysUntilPurge, mapAttachResult, purgeCutoff, sanitizeTitle } from "../practice";
import { inRange, parseRange, pct, summarise, teamTable, type InsightRow } from "../insights";
import { t } from "../i18n";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";

describe("target resolution", () => {
  it("accepts a lead id (legacy shape) and a lead target", () => {
    expect(resolveTarget({ leadId: U1 })).toEqual({ ok: true, target: { kind: "lead", leadId: U1 } });
    expect(resolveTarget({ target: { kind: "lead", leadId: U1 } })).toEqual({ ok: true, target: { kind: "lead", leadId: U1 } });
  });
  it("accepts a practice target", () => {
    expect(resolveTarget({ target: { kind: "practice", id: U2 } })).toEqual({ ok: true, target: { kind: "practice", id: U2 } });
  });
  it("target wins over leadId", () => {
    const r = resolveTarget({ target: { kind: "practice", id: U2 }, leadId: U1 });
    expect(r).toEqual({ ok: true, target: { kind: "practice", id: U2 } });
  });
  it("rejects junk and says which message to show", () => {
    expect(resolveTarget({ leadId: "x" })).toEqual({ ok: false, kind: "lead" });
    expect(resolveTarget(null)).toEqual({ ok: false, kind: "lead" });
    expect(resolveTarget({ target: { kind: "practice", id: "nope" } })).toEqual({ ok: false, kind: "practice" });
    expect(resolveTarget({ target: { kind: "other" } })).toEqual({ ok: false, kind: "lead" });
  });
  it("builds base paths", () => {
    expect(targetBasePath({ kind: "practice", id: U2 })).toBe(`/storyboards/practice/${U2}`);
    expect(targetBasePath({ kind: "lead", leadId: U1 }, "hibah")).toBe(`/leads/${U1}/storyboard/hibah`);
  });
});

describe("purge cutoff", () => {
  const now = new Date("2026-11-12T00:00:00Z");
  it("is 30 days back", () => {
    expect(purgeCutoff(now).toISOString()).toBe("2026-10-13T00:00:00.000Z");
  });
  it("counts days until auto-delete", () => {
    expect(daysUntilPurge("2026-11-12T00:00:00Z", now)).toBe(30);
    expect(daysUntilPurge("2026-11-02T00:00:00Z", now)).toBe(20);
    expect(daysUntilPurge("2026-10-13T00:00:00Z", now)).toBe(0);
    expect(daysUntilPurge("2026-01-01T00:00:00Z", now)).toBe(0);
    expect(daysUntilPurge("garbage", now)).toBe(30);
  });
});

describe("titles", () => {
  it("trims, collapses and caps at 80", () => {
    expect(sanitizeTitle("  my   try \n")).toBe("my try");
    expect(sanitizeTitle("x".repeat(200))?.length).toBe(80);
    expect(sanitizeTitle("   ")).toBeNull();
    expect(sanitizeTitle(5)).toBeNull();
  });
});

describe("attach result mapping", () => {
  it("maps known results and everything else to error", () => {
    expect(mapAttachResult("ok")).toBe("ok");
    expect(mapAttachResult("duplicate")).toBe("duplicate");
    expect(mapAttachResult("not_allowed")).toBe("not_allowed");
    expect(mapAttachResult("not_found")).toBe("not_found");
    expect(mapAttachResult(null)).toBe("error");
    expect(mapAttachResult("weird")).toBe("error");
  });
  it("has a friendly message in both languages for each failure", () => {
    for (const o of ["not_found", "not_allowed", "duplicate", "error"] as const) {
      const key = attachErrorKey(o);
      expect(t(key, "en").length).toBeGreaterThan(5);
      expect(t(key, "bm")).not.toBe(t(key, "en"));
    }
  });
});

const row = (p: Partial<InsightRow>): InsightRow => ({
  module: "hibah",
  practice: false,
  actorId: "a",
  stepStatus: {},
  outcome: null,
  createdAt: "2026-11-10T00:00:00Z",
  ...p,
});

describe("insights", () => {
  const now = new Date("2026-11-12T00:00:00Z");
  it("parses the range", () => {
    expect(parseRange("90")).toBe(90);
    expect(parseRange("7")).toBe(30);
    expect(parseRange(undefined)).toBe(30);
  });
  it("filters by range", () => {
    const rows = [row({}), row({ createdAt: "2026-08-01T00:00:00Z" }), row({ createdAt: "2027-01-01T00:00:00Z" })];
    expect(inRange(rows, 30, now)).toHaveLength(1);
    expect(inRange(rows, 365, now)).toHaveLength(2);
  });
  it("summarises", () => {
    const s = summarise([
      row({ practice: true, stepStatus: { fill: "saved" } }),
      row({ module: "ci", stepStatus: { fill: "saved", explain: "saved", risk: "saved", objections: "saved" }, outcome: "ready_for_quote" }),
      row({ module: "ci", outcome: "not_interested" }),
    ]);
    expect(s.total).toBe(3);
    expect(s.practice).toBe(1);
    expect(s.lead).toBe(2);
    expect(s.byModule.find((m) => m.module === "ci")).toMatchObject({ lead: 2, practice: 0, total: 2 });
    expect(s.steps).toEqual({ fill: 2, explain: 1, risk: 1, objections: 1 });
    expect(s.stepsCompleted).toBe(5);
    expect(s.outcomes.ready_for_quote).toBe(1);
    expect(s.outcomesRecorded).toBe(2);
    expect(s.reachedStep4).toBe(1);
    expect(pct(s.reachedStep4Share)).toBe(33);
  });
  it("handles no rows", () => {
    const s = summarise([]);
    expect(s.total).toBe(0);
    expect(s.reachedStep4Share).toBe(0);
  });
  it("builds the team table", () => {
    const names = new Map([["a", "Aini"], ["b", "Bob"]]);
    const t1 = teamTable(
      [
        row({ actorId: "b", practice: true }),
        row({ actorId: "a", outcome: "ready_for_quote" }),
        row({ actorId: "a", outcome: "needs_spouse" }),
        row({ actorId: "z" }),
        row({ actorId: null }),
      ],
      names,
      "?",
    );
    expect(t1.map((r) => r.name)).toEqual(["Aini", "?", "Bob"]);
    expect(t1[0]).toMatchObject({ sessions: 2, practice: 0, withOutcome: 2, readyForQuote: 1 });
    expect(t1[2]).toMatchObject({ sessions: 1, practice: 1 });
  });
});
