import { describe, expect, it } from "vitest";
import { en, bm, t, type TKey } from "../i18n";
import { computeModule } from "../engine";
import {
  CI_APPROACHES, CI_CERT_CHECKS, CI_COMMITMENT_LABELS, CI_CYCLE, CI_DEFAULT_INPUTS, CI_DEPENDENCY_ITEMS,
  CI_ILLNESSES, CI_RISK_SPECIFIC, CI_STAT_PLACEHOLDERS, CI_CONTENT,
} from "../defaults/ci";
import { buildClientSummary } from "../client-summary";
import { buildCiWaSummary } from "../wa-summary";

const agent = { firstName: "Mal", wa: "+60123456789" };
const STORY = "ZZ-AGENT-ONLY-STORY";

describe("critical illness: dictionary lists match the English defaults", () => {
  it("every list key exists and equals the English default", () => {
    const k = (s: string) => s as TKey;
    CI_COMMITMENT_LABELS.forEach((v, i) => expect(en[k(`ci.commit.${i}`)]).toBe(v));
    CI_DEPENDENCY_ITEMS.forEach((v, i) => {
      expect(en[k(`ci.depItem.${i}.label`)]).toBe(v.label);
      expect(en[k(`ci.depItem.${i}.hint`)]).toBe(v.hint);
    });
    CI_CYCLE.forEach((v, i) => {
      expect(en[k(`ci.cycle.${i}.t`)]).toBe(v.t);
      expect(en[k(`ci.cycle.${i}.d`)]).toBe(v.d);
    });
    CI_APPROACHES.forEach((v, i) => {
      expect(en[k(`ci.appr.${i}.tag`)]).toBe(v.tag);
      expect(en[k(`ci.appr.${i}.name`)]).toBe(v.defaultName);
      v.points.forEach((p, j) => expect(en[k(`ci.appr.${i}.p${j}`)]).toBe(p));
      expect(en[k(`ci.appr.${i}.line`)]).toBe(v.line);
    });
    CI_CERT_CHECKS.forEach((v, i) => expect(en[k(`ci.cert.${i}`)]).toBe(v));
    CI_ILLNESSES.forEach((v, i) => expect(en[k(`ci.ill.${i}`)]).toBe(v));
    CI_RISK_SPECIFIC.forEach((v, i) => expect(en[k(`ci.riskSpec.${i}`)]).toBe(v));
    CI_STAT_PLACEHOLDERS.forEach((v, i) => expect(en[k(`ci.stat.${i}`)]).toBe(v));
    expect(Object.keys(en).filter((x) => /^ci\.(commit|ill)\./.test(x)).length).toBe(CI_COMMITMENT_LABELS.length + CI_ILLNESSES.length);
  });

  it("BM statistic placeholders stay bracketed", () => {
    for (let i = 0; i < CI_STAT_PLACEHOLDERS.length; i++) expect(bm[`ci.stat.${i}` as TKey]).toMatch(/^\[statistik \+ sumber/);
  });
});

describe("critical illness engine in Bahasa Malaysia", () => {
  const inputs = { ...CI_DEFAULT_INPUTS, reduces: "yes" as const, base: 100000, afford: 20000, structure: "staged" as const };
  const e = computeModule("ci", inputs, "en");
  const b = computeModule("ci", inputs, "bm");

  it("English output is unchanged", () => {
    expect(e.caption).toMatch(/^Cash lasts \d+\.\d months \(early\) to \d+\.\d months \(late\) of 12$/);
    expect(e.flow[0].title).toBe("Early-stage diagnosis, income paused");
    expect(e.flow[0].value).toMatch(/^RM[\d,]+\/mo$/);
    expect(e.out.reduceNote).toContain("Hibah left after a late-stage claim: RM");
    expect(e.legend[0].label).toBe("Early-stage runway");
  });

  it("numbers match and no English text remains", () => {
    expect(b.flow.map((f) => f.meter)).toEqual(e.flow.map((f) => f.meter));
    expect(b.out.text).toEqual(e.out.text);
    e.flow.forEach((s, i) => {
      expect(b.flow[i].tag).not.toBe(s.tag);
      expect(b.flow[i].title).not.toBe(s.title);
      expect(b.flow[i].desc).not.toBe(s.desc);
    });
    expect(b.caption).not.toBe(e.caption);
    expect(b.scene.label).not.toBe(e.scene.label);
    e.legend.forEach((l, i) => expect(b.legend[i].label).not.toBe(l.label));
    expect(b.out.reduceNote).not.toBe(e.out.reduceNote);
    expect(b.out.affordNote).not.toBe(e.out.affordNote);
    expect(JSON.stringify(b)).not.toMatch(/NaN|undefined|Infinity|\{\w+\}/);
  });

  it("keeps compliance wording: no guarantee or 100% claims", () => {
    expect(JSON.stringify(b)).not.toMatch(/jamin|dijamin|100\s?%/i);
    expect(b.flow[4].desc).toContain("Tertakluk kepada takrifan dalam sijil");
  });
});

describe("critical illness summary and WhatsApp in both languages", () => {
  for (const lang of ["en", "bm"] as const) {
    it(`${lang}: the agent-only story never reaches the client text`, () => {
      const dirty = { ...CI_DEFAULT_INPUTS, story: STORY, nick: "Siti" };
      const result = computeModule("ci", dirty, lang);
      const s = buildClientSummary("ci", dirty, result, agent, undefined, lang);
      const wa = buildCiWaSummary({ nick: "Siti", out: result.out, agentFirstName: "Mal", lang });
      expect(JSON.stringify(s)).not.toContain(STORY);
      expect(wa).not.toContain(STORY);
      expect(wa).not.toMatch(/jamin|dijamin|guarantee|100\s?%/i);
      expect(JSON.stringify(s)).not.toMatch(/jamin|dijamin|guarantee/i);
    });
  }

  it("BM WhatsApp text is Malay and keeps the disclaimer", () => {
    const { out } = computeModule("ci", CI_DEFAULT_INPUTS, "bm");
    const wa = buildCiWaSummary({ nick: "", out, lang: "bm" });
    expect(wa).toContain("Salam tuan/puan");
    expect(wa).toContain("Anggaran tunai diperlukan");
    expect(wa).toContain("tertakluk kepada terma Helaian Pendedahan Produk (PDS)");
    expect(wa).toContain(t("wa.disclaimer", "bm"));
  });
});

describe("critical illness BM default content", () => {
  it("is parallel to English and fully translated", () => {
    const { en: E, bm: B } = CI_CONTENT;
    for (const part of ["script", "riskItems", "riskReasons", "objections", "faq"] as const) expect(B[part].length).toBe(E[part].length);
    E.script.forEach((s, i) => expect(B.script[i].text).not.toBe(s.text));
    E.riskItems.forEach((s, i) => expect(B.riskItems[i].label).not.toBe(s.label));
    E.riskReasons.forEach((s, i) => expect(B.riskReasons[i].label).not.toBe(s.label));
    E.objections.forEach((s, i) => expect(B.objections[i].q).not.toBe(s.q));
    E.faq.forEach((s, i) => expect(B.faq[i].q).not.toBe(s.q));
  });

  it("has no guarantee wording, no other operator, and the proof step keeps its placeholder", () => {
    // The shared common objections/FAQ (defaults/common.ts) belong to the common owner, so only CI's own items are checked.
    const own = { ...CI_CONTENT.bm, objections: CI_CONTENT.bm.objections.slice(0, 6), faq: CI_CONTENT.bm.faq.slice(0, 8) };
    const text = JSON.stringify(own);
    expect(text).not.toMatch(/jamin|dijamin|jaminan|100\s?%/i);
    expect(text).not.toMatch(/prudential|etiqa|allianz|\baia\b|manulife|takaful malaysia/i);
    expect(CI_CONTENT.bm.script[3].text).toContain("[Bukti anda]");
  });
});
