import { describe, expect, it } from "vitest";
import { buildClientSummary } from "../client-summary";
import { computeModule } from "../engine";
import { HIBAH_DEFAULT_CONTENT, HIBAH_DEFAULT_INPUTS } from "../defaults/hibah";
import { MEDICAL_DEFAULT_CONTENT, MEDICAL_DEFAULT_INPUTS } from "../defaults/medical";
import { CI_DEFAULT_CONTENT, CI_DEFAULT_INPUTS, CI_DEFAULT_STORY } from "../defaults/ci";
import { BUSINESS_DEFAULT_CONTENT, BUSINESS_DEFAULT_INPUTS } from "../defaults/business";
import { MORTGAGE_DEFAULT_CONTENT, MORTGAGE_DEFAULT_INPUTS } from "../defaults/mortgage";
import { STORYBOARD_MODULES, type StoryboardModule } from "../types";

const agent = { firstName: "Mal", wa: "+60123456789" };

const FORBIDDEN = ["notes", "script", "objection", "checklist", "settings", "inputs", "pipeline", "commission", "anc", "ic_number"];

function build(mod: StoryboardModule, plan?: Parameters<typeof buildClientSummary>[4]) {
  const inputs = {
    hibah: HIBAH_DEFAULT_INPUTS,
    medical: MEDICAL_DEFAULT_INPUTS,
    ci: CI_DEFAULT_INPUTS,
    business: BUSINESS_DEFAULT_INPUTS,
    mortgage: MORTGAGE_DEFAULT_INPUTS,
  }[mod];
  // Adversarial extras on the inputs that must never reach the client.
  const dirty = { ...inputs, notes: "SECRET NOTE", ic_number: "900101-01-1234", commission: 999, anc: 1, pipeline_stage: "quoted" };
  const result = computeModule(mod, dirty as never);
  return buildClientSummary(mod, dirty, result as never, agent, plan);
}

/** All object keys, recursively. */
function keys(v: unknown): string[] {
  if (Array.isArray(v)) return v.flatMap(keys);
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)]);
  return [];
}

describe("buildClientSummary", () => {
  for (const mod of STORYBOARD_MODULES) {
    describe(mod, () => {
      const s = build(mod);
      const json = JSON.stringify(s);

      it("has none of the forbidden keys", () => {
        const found = keys(s).filter((k) => FORBIDDEN.includes(k.toLowerCase()));
        expect(found).toEqual([]);
        for (const word of FORBIDDEN.filter((w) => w.length > 3)) {
          expect(json.toLowerCase(), "word: " + word).not.toContain(word);
        }
      });

      it("does not leak injected agent-only values", () => {
        expect(json).not.toContain("SECRET NOTE");
        expect(json).not.toContain("900101");
        expect(json).not.toContain("999");
      });

      it("contains only the ClientSummary keys", () => {
        expect(Object.keys(s).sort()).toEqual(
          ["agentFirstName", "agentWa", "disclaimerKey", "flow", "gap", "gapNote", "have", "haveVsNeed", "kicker", "meaning", "moduleLabel", "need", "nextSteps", "plan"].sort(),
        );
        expect(Object.keys(s.plan).sort()).toEqual(["contribution", "cover", "name", "why"]);
      });

      it("shows the contribution as 'From official illustration' unless entered", () => {
        expect(s.plan.contribution).toBe("From official illustration");
      });

      it("never claims a guarantee or a 100% fill", () => {
        // Loan guarantors are a real business concept, not a promise of benefits.
        const withoutLoanTerms = json.replace(/personal(ly)? guarantee[d]?|guarantor/gi, "");
        expect(withoutLoanTerms).not.toMatch(/guarantee/i);
        expect(json).not.toMatch(/(?<!could )fills? the gap/i);
        expect(json).not.toMatch(/gap[^"]{0,25}100%/i);
      });

      it("carries the agent's first name and WhatsApp number only", () => {
        expect(s.agentFirstName).toBe("Mal");
        expect(s.agentWa).toBe("+60123456789");
      });

      it("has no NaN or undefined", () => {
        expect(json).not.toMatch(/NaN|undefined|Infinity/);
      });
    });
  }

  it("hibah headline numbers match the engine (RM545,806 gap)", () => {
    const s = build("hibah");
    expect(s.gap).toBe("RM545,806");
    expect(s.need).toBe("RM720,806");
    expect(s.have).toBe("RM175,000");
    expect(s.gapNote).toMatch(/could fill the gap, subject to the PDS & certificate terms/);
    expect(s.plan.name).toBe("[GE hibah plan]");
  });

  it("a contribution is shown only when the agent entered a figure", () => {
    expect(build("hibah", { contribution: 250 }).plan.contribution).toBe("RM250/mo");
    expect(build("hibah", { contribution: 0 }).plan.contribution).toBe("From official illustration");
    expect(build("hibah", { contribution: null }).plan.contribution).toBe("From official illustration");
  });

  it("falls back to the placeholder when a plan name mentions another operator", () => {
    expect(build("hibah", { name: "Prudential PRUlink" }).plan.name).toBe("[GE hibah plan]");
    expect(build("hibah", { name: "Etiqa Hibah" }).plan.name).toBe("[GE hibah plan]");
    expect(build("hibah", { name: "[GE hibah plan B]" }).plan.name).toBe("[GE hibah plan B]");
  });

  it("mortgage keeps the MRTT / MLTT placeholders", () => {
    const s = build("mortgage");
    expect(JSON.stringify(s.haveVsNeed)).toContain("[GE MRTT plan]");
    expect(JSON.stringify(s.haveVsNeed)).toContain("[GE MLTT plan]");
  });
});

describe("default content hygiene", () => {
  const all = {
    hibah: HIBAH_DEFAULT_CONTENT,
    medical: MEDICAL_DEFAULT_CONTENT,
    ci: CI_DEFAULT_CONTENT,
    business: BUSINESS_DEFAULT_CONTENT,
    mortgage: MORTGAGE_DEFAULT_CONTENT,
  };

  it("has no guarantee promises or invented statistics", () => {
    for (const [name, c] of Object.entries(all)) {
      const text = JSON.stringify(c);
      expect(text, name).not.toMatch(/guaranteed (claim|payout|approval|acceptance)/i);
      expect(text, name).not.toMatch(/\b\d{1,3}(\.\d+)?\s?% of (malaysians|people|claims)/i);
    }
  });

  it("names no other operator", () => {
    for (const [name, c] of Object.entries(all)) {
      expect(JSON.stringify(c), name).not.toMatch(/prudential|etiqa|allianz|\baia\b|manulife|takaful malaysia/i);
    }
  });

  it("CI story default is empty", () => {
    expect(CI_DEFAULT_STORY).toBe("");
  });
});
