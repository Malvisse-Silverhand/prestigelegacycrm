import { describe, expect, it } from "vitest";
import { addDays, planOutcome, type OutcomeInput } from "../outcome";

const today = "2026-11-08";
const base = (o: Partial<OutcomeInput>): OutcomeInput => ({
  outcome: "needs_spouse",
  currentStage: "new",
  today,
  hasQuotation: true,
  ...o,
});

function ok(i: OutcomeInput) {
  const r = planOutcome(i);
  if (!r.ok) throw new Error(r.error);
  return r;
}

describe("addDays", () => {
  it("rolls over month ends", () => {
    expect(addDays("2026-11-29", 3)).toBe("2026-12-02");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
});

describe("planOutcome", () => {
  it("ready_for_quote -> quoted when a quotation exists", () => {
    for (const stage of ["new", "contacted", "follow_up"]) {
      expect(ok(base({ outcome: "ready_for_quote", currentStage: stage })).patch.pipeline_stage).toBe("quoted");
    }
  });
  it("ready_for_quote keeps the stage without a quotation (existing business rule)", () => {
    const r = ok(base({ outcome: "ready_for_quote", currentStage: "contacted", hasQuotation: false }));
    expect(r.patch.pipeline_stage).toBeUndefined();
    expect(r.summary).toMatch(/quotation/);
  });
  it("needs_spouse -> follow_up with +3 days", () => {
    const r = ok(base({ outcome: "needs_spouse", currentStage: "contacted" }));
    expect(r.patch).toEqual({ pipeline_stage: "follow_up", follow_up_date: "2026-11-11" });
  });
  it("follow_up_later -> follow_up with the picked date", () => {
    const r = ok(base({ outcome: "follow_up_later", currentStage: "new", followUpDate: "2026-12-01" }));
    expect(r.patch).toEqual({ pipeline_stage: "follow_up", follow_up_date: "2026-12-01" });
  });
  it("follow_up_later validates the date", () => {
    expect(planOutcome(base({ outcome: "follow_up_later" })).ok).toBe(false);
    expect(planOutcome(base({ outcome: "follow_up_later", followUpDate: "2026-11-01" })).ok).toBe(false);
    expect(planOutcome(base({ outcome: "follow_up_later", followUpDate: "2031-01-01" })).ok).toBe(false);
    expect(planOutcome(base({ outcome: "follow_up_later", followUpDate: "garbage" })).ok).toBe(false);
  });
  it("not_interested -> closed_lost with the reason", () => {
    const r = ok(base({ outcome: "not_interested", currentStage: "quoted", reason: "Covered elsewhere" }));
    expect(r.patch).toEqual({
      pipeline_stage: "closed_lost",
      status: "closed",
      closed_on: null,
      closed_lost_reason: "Covered elsewhere",
    });
  });
  it("not_interested needs a reason", () => {
    expect(planOutcome(base({ outcome: "not_interested", reason: "  " })).ok).toBe(false);
  });

  describe("never moves a lead backwards", () => {
    const protectedStages = ["appointment", "submission", "closed_won", "servicing", "closed_lost"];
    for (const stage of protectedStages) {
      for (const outcome of ["ready_for_quote", "needs_spouse", "follow_up_later", "not_interested"] as const) {
        it(`${outcome} leaves ${stage} alone`, () => {
          const r = ok(base({ outcome, currentStage: stage, followUpDate: "2026-12-01", reason: "x" }));
          expect(r.patch.pipeline_stage).toBeUndefined();
          expect(r.patch.status).toBeUndefined();
          expect(r.stageChanged).toBe(false);
        });
      }
    }
    it("a quoted lead is not pulled back to follow_up, but still gets a date", () => {
      const r = ok(base({ outcome: "needs_spouse", currentStage: "quoted" }));
      expect(r.patch).toEqual({ follow_up_date: "2026-11-11" });
    });
    it("won and lost leads get no follow-up date", () => {
      for (const stage of ["closed_won", "servicing", "closed_lost"]) {
        expect(ok(base({ outcome: "needs_spouse", currentStage: stage })).patch).toEqual({});
      }
    });
    it("appointment and submission may still get a follow-up date", () => {
      expect(ok(base({ outcome: "needs_spouse", currentStage: "appointment" })).patch).toEqual({ follow_up_date: "2026-11-11" });
    });
    it("an unknown stage is left alone", () => {
      expect(ok(base({ outcome: "ready_for_quote", currentStage: "mystery" })).patch.pipeline_stage).toBeUndefined();
    });
  });
});
