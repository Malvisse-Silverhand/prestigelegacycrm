import { describe, expect, it } from "vitest";
import { buildClientSummary } from "../client-summary";
import { computeModule } from "../engine";
import { MEDICAL_DEFAULT_INPUTS } from "../defaults/medical";
import { CI_DEFAULT_INPUTS } from "../defaults/ci";
import { BUSINESS_DEFAULT_INPUTS } from "../defaults/business";
import { defaultStored, type CiStored, type MedicalStored } from "../validate";

const agent = { firstName: "Mal", wa: "+60123456789" };

// Values that exist only in agent-only fields. None may reach a client.
const STORY = "AGENT-ONLY-STORY-5521";
const PROOF = "AGENT-ONLY-PROOF-7788";
const CLAIM = "AGENT-ONLY-CLAIM-3300";
const NOTE = "AGENT-ONLY-NOTE-1199";

describe("client summary never carries agent-only fields (Medical, CI, Business)", () => {
  it("CI: the story, proofs, commitments and plan names stay out", () => {
    const stored: CiStored = {
      ...defaultStored("ci"),
      story: STORY,
      proofs: [{ t: PROOF, v: "RM1", d: PROOF }],
      commitChecked: ["Home instalment / rent"],
      approachNames: [PROOF],
    };
    const result = computeModule("ci", stored);
    const s = buildClientSummary("ci", { ...stored, notes: NOTE }, result, agent, { name: "[GE critical illness plan]" });
    const json = JSON.stringify(s);
    for (const secret of [STORY, PROOF, NOTE]) expect(json).not.toContain(secret);
    expect(json).not.toMatch(/\bstory\b/i);
    expect(Object.keys(s).sort()).toEqual(
      ["agentFirstName", "agentWa", "disclaimerKey", "flow", "gap", "gapNote", "have", "haveVsNeed", "kicker", "meaning", "moduleLabel", "need", "nextSteps", "plan"].sort(),
    );
  });

  it("Medical: the claim story, prices and age comparison stay out", () => {
    const stored: MedicalStored = {
      ...defaultStored("medical"),
      story: CLAIM,
      storyPaid: 777001,
      storyClient: 888002,
      prices: [PROOF, PROOF, PROOF, PROOF],
      priceNow: PROOF,
      priceLater: PROOF,
    };
    const result = computeModule("medical", stored);
    const s = buildClientSummary("medical", { ...stored, notes: NOTE }, result, agent);
    const json = JSON.stringify(s);
    for (const secret of [CLAIM, PROOF, NOTE, "777001", "888002", "777,001", "888,002"]) expect(json).not.toContain(secret);
  });

  it("Business: notes and per-person details stay out; only computed totals appear", () => {
    const inputs = {
      ...BUSINESS_DEFAULT_INPUTS,
      kps: BUSINESS_DEFAULT_INPUTS.kps.map((k, i) => (i === 0 ? { ...k, name: "AGENT-ONLY-NAME-4242" } : k)),
    };
    const result = computeModule("business", inputs);
    const s = buildClientSummary("business", { ...inputs, notes: NOTE }, result, agent);
    const json = JSON.stringify(s);
    for (const secret of [NOTE, "AGENT-ONLY-NAME-4242"]) expect(json).not.toContain(secret);
    // The partner list and salaries are not in the payload.
    expect(json).not.toContain("120000");
  });

  it("uses GE-only wording and the plan placeholder for each module", () => {
    for (const [mod, inputs, name] of [
      ["medical", MEDICAL_DEFAULT_INPUTS, "[GE medical plan]"],
      ["ci", CI_DEFAULT_INPUTS, "[GE critical illness plan]"],
      ["business", BUSINESS_DEFAULT_INPUTS, "[GE business protection plan]"],
    ] as const) {
      const result = computeModule(mod, inputs as never);
      const s = buildClientSummary(mod, inputs, result as never, agent);
      expect(s.plan.name).toBe(name);
      expect(s.plan.contribution).toBe("From official illustration");
      const hostile = buildClientSummary(mod, inputs, result as never, agent, { name: "Allianz Shield" });
      expect(hostile.plan.name).toBe(name);
    }
  });

  it("Medical: the placeholder bill never claims a fact", () => {
    const result = computeModule("medical", MEDICAL_DEFAULT_INPUTS);
    const s = buildClientSummary("medical", MEDICAL_DEFAULT_INPUTS, result, agent);
    expect(s.gapNote).toMatch(/placeholder/i);
  });
});
