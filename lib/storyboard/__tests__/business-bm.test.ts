import { describe, expect, it } from "vitest";
import { computeModule } from "../engine";
import { BUSINESS_CONTENT, BUSINESS_DEFAULT_INPUTS } from "../defaults/business";
import { buildBusinessWaSummary } from "../wa-summary";
import { mentionsOtherOperator } from "../summary/shared";

describe("business in Bahasa Malaysia", () => {
  const en = computeModule("business", BUSINESS_DEFAULT_INPUTS, "en");
  const bm = computeModule("business", BUSINESS_DEFAULT_INPUTS, "bm");

  it("keeps the numbers and translates the text", () => {
    expect(bm.out.text).toEqual(en.out.text);
    expect(bm.flow.length).toBe(en.flow.length);
    expect(bm.caption).not.toBe(en.caption);
    expect(bm.flow[0].title).toBe("Pemilik utama meninggal dunia");
    expect(bm.legend.map((l) => l.label)).toEqual(["Orang kunci", "Beli-jual", "Pinjaman"]);
    expect(JSON.stringify(bm)).not.toMatch(/NaN|undefined|Infinity|\{\w+\}|\bjamin|dijamin|jaminan|100\s?%/i);
  });

  it("translates the partner-share warning", () => {
    const odd = { ...BUSINESS_DEFAULT_INPUTS, pCount: 2 };
    expect(computeModule("business", odd, "en").warnings[0]).toBe("Partner shares total 80%, not 100%. The figures are calculated as entered.");
    expect(computeModule("business", odd, "bm").warnings[0]).toContain("Jumlah pegangan rakan kongsi ialah 80%");
  });

  it("BM content is parallel to English and free of guarantee wording", () => {
    const e = BUSINESS_CONTENT.en;
    const m = BUSINESS_CONTENT.bm;
    for (const k of ["script", "riskItems", "riskReasons", "objections", "faq"] as const) expect(m[k].length).toBe(e[k].length);
    expect(m.script.map((s) => s.group)).toEqual(e.script.map((s) => s.group));
    expect(m.script.length).toBe(16);
    // "tidak dijamin" and the shared FAQ question "...dijamin?" and "penjamin" (loan guarantor) are allowed.
    const text = JSON.stringify(m).replace(/tidak dijamin|nilai tunai dijamin?|penjamin/gi, "");
    expect(text).not.toMatch(/dijamin|jaminan|menjamin|\bjamin\b/i);
    expect(mentionsOtherOperator(text.toLowerCase())).toBe(false);
  });

  it("the WhatsApp text is Malay and never prints the partner-share warning", () => {
    const odd = computeModule("business", { ...BUSINESS_DEFAULT_INPUTS, pCount: 2 }, "bm");
    const text = buildBusinessWaSummary({ company: "Acme Sdn Bhd", out: odd.out, lang: "bm" });
    expect(text).toContain("Salam, berikut ringkasan untuk Acme Sdn Bhd");
    expect(text).toContain("Ini ialah anggaran untuk perbincangan");
    expect(text).not.toMatch(/80%|bukan 100%/);
  });
});
