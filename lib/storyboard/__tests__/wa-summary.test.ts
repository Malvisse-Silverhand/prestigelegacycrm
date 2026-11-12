import { describe, expect, it } from "vitest";
import { HIBAH_DEFAULT_INPUTS } from "../defaults/hibah";
import { computeModule } from "../engine";
import { mentionsOtherOperator } from "../client-summary";
import { buildHibahWaSummary } from "../wa-summary";

const FORBIDDEN = [
  "guarantee", "100%", "etiqa", "prudential", "aia", "allianz", "manulife", "takaful malaysia", "great eastern",
  "commission", "anc", "ic number", "nric", "mykad",
];

function summary(inputs = HIBAH_DEFAULT_INPUTS) {
  const { out } = computeModule("hibah", inputs);
  return buildHibahWaSummary({ nick: inputs.nick, out, planName: "[GE hibah plan]", agentFirstName: "Mal" });
}

describe("buildHibahWaSummary", () => {
  it("states the design-default figures", () => {
    const s = summary();
    expect(s).toContain("RM720,806");
    expect(s).toContain("RM175,000");
    expect(s).toContain("RM545,806");
  });
  it("uses the compliance wording", () => {
    expect(summary()).toContain("could fill the gap, subject to the PDS & certificate terms");
  });
  it("contains no forbidden words", () => {
    const lower = summary().toLowerCase();
    for (const w of FORBIDDEN) {
      const re = new RegExp("(^|[^a-z0-9])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9]|$)");
      expect(re.test(lower), w).toBe(false);
    }
    expect(mentionsOtherOperator(lower)).toBe(false);
  });
  it("does not offer a hibah when there is no gap", () => {
    const s = summary({ ...HIBAH_DEFAULT_INPUTS, existing: 5_000_000 });
    expect(s).not.toContain("could fill the gap");
    expect(s).toContain("meets the estimated need");
  });
  it("copes with an empty nickname", () => {
    expect(summary({ ...HIBAH_DEFAULT_INPUTS, nick: "" })).toContain("Salam there");
  });
});
