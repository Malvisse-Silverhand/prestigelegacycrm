import { describe, expect, it } from "vitest";
import { MEDICAL_DEFAULT_INPUTS } from "../defaults/medical";
import { CI_DEFAULT_INPUTS } from "../defaults/ci";
import { BUSINESS_DEFAULT_INPUTS } from "../defaults/business";
import { computeModule } from "../engine";
import { mentionsOtherOperator } from "../client-summary";
import { buildBusinessWaSummary, buildCiWaSummary, buildMedicalWaSummary } from "../wa-summary";

const FORBIDDEN = [
  "guarantee", "guaranteed", "guarantor", "100%", "etiqa", "prudential", "aia", "allianz", "manulife", "takaful malaysia",
  "great eastern", "commission", "anc", "ic number", "nric", "mykad",
];

function expectClean(text: string) {
  const lower = text.toLowerCase();
  for (const w of FORBIDDEN) {
    const re = new RegExp("(^|[^a-z0-9])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9]|$)");
    expect(re.test(lower), w).toBe(false);
  }
  expect(mentionsOtherOperator(lower)).toBe(false);
  expect(text).not.toMatch(/NaN|undefined|Infinity/);
}

const SECRET_STORY = "SECRET-AGENT-STORY-9431";

describe("buildMedicalWaSummary", () => {
  const { out } = computeModule("medical", MEDICAL_DEFAULT_INPUTS);
  const text = buildMedicalWaSummary({ nick: "Nurul", out, agentFirstName: "Mal" });

  it("states the scenario figures", () => {
    expect(text).toContain("Breast cancer, full treatment");
    expect(text).toContain("RM395,000");
    expect(text).toContain("RM365,000");
  });
  it("marks a placeholder source as to be confirmed instead of presenting it as fact", () => {
    expect(text).toContain("source to be confirmed");
  });
  it("shows a real source the agent entered", () => {
    const withSource = computeModule("medical", {
      ...MEDICAL_DEFAULT_INPUTS,
      bills: MEDICAL_DEFAULT_INPUTS.bills.map((b) => ({ ...b, source: "Hospital estimate, Jan 2026" })),
      inflationSource: "Published survey, 2026",
    });
    const t = buildMedicalWaSummary({ nick: "Nurul", out: withSource.out });
    expect(t).toContain("source: Hospital estimate, Jan 2026");
    expect(t).toContain("source: Published survey, 2026");
  });
  it("never repeats a source that names another operator", () => {
    const bad = computeModule("medical", {
      ...MEDICAL_DEFAULT_INPUTS,
      bills: MEDICAL_DEFAULT_INPUTS.bills.map((b) => ({ ...b, source: "Etiqa price list" })),
    });
    const t = buildMedicalWaSummary({ nick: "Nurul", out: bad.out });
    expect(t.toLowerCase()).not.toContain("etiqa");
  });
  it("contains no forbidden words", () => expectClean(text));
  it("does not promise payment", () => {
    expect(text).toContain("could help");
    expect(text).toContain("subject to");
  });
  it("copes with an empty nickname and a zero gap", () => {
    const rich = computeModule("medical", { ...MEDICAL_DEFAULT_INPUTS, company: 900000 });
    const t = buildMedicalWaSummary({ nick: "", out: rich.out });
    expect(t).toContain("Salam there");
    expect(t).toContain("meet the estimated bill");
  });
});

describe("buildCiWaSummary", () => {
  const { out } = computeModule("ci", CI_DEFAULT_INPUTS);
  const text = buildCiWaSummary({ nick: "Siti", out, agentFirstName: "Mal" });

  it("states need, availability, gap and runway", () => {
    expect(text).toContain(out.text.total);
    expect(text).toContain(out.text.gapEarly);
    expect(text).toContain(out.text.runEarly);
  });
  it("contains no forbidden words", () => expectClean(text));
  it("never includes the agent-only story, even when the inputs carry one", () => {
    const withStory = computeModule("ci", { ...CI_DEFAULT_INPUTS, story: SECRET_STORY } as never);
    const t = buildCiWaSummary({ nick: "Siti", out: withStory.out });
    expect(t).not.toContain(SECRET_STORY);
    expect(JSON.stringify(withStory.out)).not.toContain(SECRET_STORY);
  });
  it("is safe with months = 0", () => {
    const r = computeModule("ci", { ...CI_DEFAULT_INPUTS, months: 0 });
    expectClean(buildCiWaSummary({ nick: "Siti", out: r.out }));
  });
});

describe("buildBusinessWaSummary", () => {
  const { out } = computeModule("business", BUSINESS_DEFAULT_INPUTS);
  const text = buildBusinessWaSummary({ company: BUSINESS_DEFAULT_INPUTS.company, out, agentFirstName: "Mal" });

  it("states the needs and the total", () => {
    expect(text).toContain(out.text.kmTotal);
    expect(text).toContain(out.text.bsTotal);
    expect(text).toContain(out.text.total);
  });
  it("contains no forbidden words (no guarantee wording, no 100%)", () => expectClean(text));
  it("shows the enterprise line only for non-company entities", () => {
    expect(text).not.toContain("accounts may be frozen");
    const sole = computeModule("business", { ...BUSINESS_DEFAULT_INPUTS, entity: "sole" });
    const t = buildBusinessWaSummary({ company: "Acme", out: sole.out });
    expect(t).toContain("accounts may be frozen");
    expectClean(t);
  });
  it("does not print the partner-share warning, even when shares do not total 100", () => {
    const odd = computeModule("business", {
      ...BUSINESS_DEFAULT_INPUTS,
      partners: [{ name: "A", pct: 60, age: 40, ex: 0 }, { name: "B", pct: 30, age: 40, ex: 0 }],
      pCount: 2,
    });
    expect(odd.warnings.length).toBe(1);
    const t = buildBusinessWaSummary({ company: "Acme", out: odd.out });
    expect(t).not.toMatch(/90%/);
    expectClean(t);
  });
  it("falls back when the company name looks like another operator", () => {
    const t = buildBusinessWaSummary({ company: "Prudential Trading Sdn Bhd", out });
    expect(t).toContain("your business");
  });
});
