import { describe, expect, it } from "vitest";
import { computeModule } from "../engine";
import { MEDICAL_DEFAULT_INPUTS } from "../defaults/medical";
import { MODULE_CONTENT } from "../settings";
import { buildMedicalWaSummary } from "../wa-summary";

describe("medical in Bahasa Malaysia", () => {
  const en = computeModule("medical", MEDICAL_DEFAULT_INPUTS, "en");
  const bm = computeModule("medical", MEDICAL_DEFAULT_INPUTS, "bm");

  it("numbers are identical, text is not", () => {
    expect({ ...bm.out, billLabel: "", topFactors: [], text: { ...bm.out.text, years: "", explain: "" } }).toEqual({
      ...en.out,
      billLabel: "",
      topFactors: [],
      text: { ...en.out.text, years: "", explain: "" },
    });
    en.flow.forEach((s, i) => {
      expect(bm.flow[i].title).not.toBe(s.title);
      expect(bm.flow[i].desc).not.toBe(s.desc);
    });
    expect(bm.caption).not.toBe(en.caption);
    expect(JSON.stringify(bm)).not.toMatch(/NaN|undefined|Infinity|\{\w+\}|[Jj]amin/);
  });

  it("an empty nickname reads naturally and the WhatsApp text is Malay", () => {
    const r = computeModule("medical", { ...MEDICAL_DEFAULT_INPUTS, nick: "" }, "bm");
    expect(r.flow[1].desc).toContain("prospek");
    const wa = buildMedicalWaSummary({ nick: "", out: r.out, lang: "bm" });
    expect(wa).toContain("Salam tuan/puan");
    expect(wa).toContain("Anggaran bil:");
  });

  it("BM content is parallel to English", () => {
    const { en: e, bm: b } = MODULE_CONTENT.medical.localised;
    for (const part of ["script", "riskItems", "riskReasons", "objections", "faq"] as const) expect(b[part].length).toBe(e[part].length);
    e.script.forEach((s, i) => expect(b.script[i].text).not.toBe(s.text));
  });
});
