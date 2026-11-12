import { describe, expect, it } from "vitest";
import { buildClientSummary, buildClientSummaryBundle, pickSummary, isSummaryBundle, summaryDefaultLang } from "../client-summary";
import { computeModule } from "../engine";
import { HIBAH_DEFAULT_INPUTS } from "../defaults/hibah";
import { MEDICAL_DEFAULT_INPUTS } from "../defaults/medical";
import { CI_DEFAULT_INPUTS } from "../defaults/ci";
import { BUSINESS_DEFAULT_INPUTS } from "../defaults/business";
import { MORTGAGE_DEFAULT_INPUTS } from "../defaults/mortgage";
import { MODULE_CONTENT, mergeAgentSettings, normaliseStoredAgent, readAgentSettings, resolveSettings, sanitizeAgentSettings } from "../settings";
import { COMMON_CONTENT } from "../defaults/common";
import { BUILT_MODULES } from "../modules";
import { buildHibahWaSummary } from "../wa-summary";
import { mentionsOtherOperator } from "../client-summary";
import { STORYBOARD_MODULES, type StoryboardModule } from "../types";
import type { Lang } from "../i18n";
import { LANGS } from "../i18n";

const agent = { firstName: "Mal", wa: "+60123456789" };
const INPUTS: Record<StoryboardModule, Record<string, unknown>> = {
  hibah: HIBAH_DEFAULT_INPUTS,
  medical: MEDICAL_DEFAULT_INPUTS,
  ci: CI_DEFAULT_INPUTS,
  business: BUSINESS_DEFAULT_INPUTS,
  mortgage: MORTGAGE_DEFAULT_INPUTS,
} as never;

describe("hibah engine in Bahasa Malaysia", () => {
  const en = computeModule("hibah", HIBAH_DEFAULT_INPUTS, "en");
  const bm = computeModule("hibah", HIBAH_DEFAULT_INPUTS, "bm");

  it("money and numbers are identical in both languages", () => {
    expect(bm.out).toEqual(en.out);
    expect(bm.scene.ringOffset).toBe(en.scene.ringOffset);
    expect(bm.flow.map((f) => f.meter)).toEqual(en.flow.map((f) => f.meter));
    expect(bm.flow.map((f) => f.value).slice(-2)).toEqual(en.flow.map((f) => f.value).slice(-2));
  });

  it("no English slide titles, tags, captions or legend labels remain", () => {
    en.flow.forEach((s, i) => {
      expect(bm.flow[i].title, "title " + i).not.toBe(s.title);
      expect(bm.flow[i].tag, "tag " + i).not.toBe(s.tag);
      expect(bm.flow[i].desc, "desc " + i).not.toBe(s.desc);
      expect(bm.flow[i].meterLabel, "meterLabel " + i).not.toBe(s.meterLabel);
    });
    expect(bm.caption).not.toBe(en.caption);
    en.legend.forEach((l, i) => expect(bm.legend[i].label).not.toBe(l.label));
    expect(bm.scene.label).not.toBe(en.scene.label);
  });

  it("has no NaN, undefined or unfilled placeholders", () => {
    const json = JSON.stringify(bm);
    expect(json).not.toMatch(/NaN|undefined|Infinity|\{\w+\}/);
  });

  it("keeps the compliance wording: could help, subject to the PDS and certificate, never 100%", () => {
    const last = bm.flow[bm.flow.length - 1];
    expect(last.desc).toContain("tertakluk kepada terma Helaian Pendedahan Produk (PDS) dan sijil");
    expect(last.title).toContain("boleh membantu menampung jurang ini");
    expect(JSON.stringify(bm)).not.toMatch(/100\s?%/);
  });

  it("an empty nickname reads naturally in BM", () => {
    const r = computeModule("hibah", { ...HIBAH_DEFAULT_INPUTS, nick: "" }, "bm");
    expect(r.flow[0].title).toBe("Pendapatan prospek terhenti");
  });
});

// Words that must never appear in anything a client reads, in either language.
const FORBIDDEN = [
  "guarantee", "guaranteed", "jamin", "dijamin", "menjamin", "jaminan", "etiqa", "prudential", "allianz", "manulife",
  "takaful malaysia", "commission", "komisen", "ic number", "nombor ic", "nric", "mykad", "anc",
];
function expectClean(text: string, strict100 = false) {
  // A summary may show 100% of a progress meter; it must never say a gap is filled 100%.
  if (strict100) expect(text).not.toMatch(/100s?%/);
  expect(text).not.toMatch(/gap[^"]{0,25}100%|jurang[^"]{0,25}100%/i);
  const lower = text.toLowerCase();
  for (const w of FORBIDDEN) {
    const re = new RegExp("(^|[^a-z0-9])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9]|$)");
    expect(re.test(lower), w).toBe(false);
  }
  expect(mentionsOtherOperator(lower)).toBe(false);
  expect(text).not.toMatch(/NaN|undefined|Infinity/);
}

describe("client summary and WhatsApp text, both languages", () => {
  for (const lang of LANGS) {
    describe(lang, () => {
      for (const mod of STORYBOARD_MODULES) {
        it(`${mod}: client summary is clean and has only the ClientSummary keys`, () => {
          const dirty = { ...INPUTS[mod], notes: "SECRET NOTE", ic_number: "900101-01-1234", commission: 999, anc: 1 };
          const result = computeModule(mod, dirty as never, lang);
          const s = buildClientSummary(mod, dirty, result as never, agent, undefined, lang);
          // Loan guarantors are a business concept, not a promise of benefits.
          expectClean(JSON.stringify(s).replace(/personal(ly)? guarantee[d]?|guarantor|penjamin/gi, ""));
          expect(JSON.stringify(s)).not.toContain("SECRET NOTE");
          expect(Object.keys(s).sort()).toEqual(
            ["agentFirstName", "agentWa", "disclaimerKey", "flow", "gap", "gapNote", "have", "haveVsNeed", "kicker", "meaning", "moduleLabel", "need", "nextSteps", "plan"].sort(),
          );
        });
      }
      it("hibah WhatsApp text is clean and complete", () => {
        const { out } = computeModule("hibah", HIBAH_DEFAULT_INPUTS, lang);
        const text = buildHibahWaSummary({ nick: "Aiman", out, planName: "x", agentFirstName: "Mal", lang });
        expectClean(text, true);
        for (const fig of ["RM720,806", "RM175,000", "RM545,806"]) expect(text).toContain(fig);
      });
    });
  }

  it("the BM hibah summary and WhatsApp text are actually Malay", () => {
    const result = computeModule("hibah", HIBAH_DEFAULT_INPUTS, "bm");
    const s = buildClientSummary("hibah", HIBAH_DEFAULT_INPUTS, result, agent, undefined, "bm");
    expect(s.gapNote).toContain("boleh membantu menampung jurang ini, tertakluk kepada terma Helaian Pendedahan Produk (PDS) dan sijil");
    expect(s.plan.contribution).toBe("Daripada ilustrasi rasmi");
    expect(s.plan.name).toBe("[pelan hibah GE]");
    expect(s.haveVsNeed.map((h) => h.label)).toEqual(["Sedia ada", "Masih belum dilindungi", "Anggaran keperluan"]);
    const { out } = computeModule("hibah", HIBAH_DEFAULT_INPUTS, "bm");
    const wa = buildHibahWaSummary({ nick: "", out, planName: "x", lang: "bm" });
    expect(wa).toContain("Salam tuan/puan");
    expect(wa).toContain("Ini ialah anggaran untuk perbincangan, bukan sebut harga.");
  });
});

describe("client_summary bundle", () => {
  const bundle = buildClientSummaryBundle({
    module: "hibah",
    inputs: HIBAH_DEFAULT_INPUTS,
    agent,
    plans: { en: { name: "[GE hibah plan]" }, bm: { name: "[pelan hibah GE]" } },
    defaultLang: "bm",
  });

  it("holds both languages and the default language", () => {
    expect(bundle.defaultLang).toBe("bm");
    expect(bundle.en.gap).toBe("RM545,806");
    expect(bundle.bm.gap).toBe("RM545,806");
    expect(bundle.en.flow[0].title).not.toBe(bundle.bm.flow[0].title);
    expect(bundle.en.plan.name).toBe("[GE hibah plan]");
    expect(bundle.bm.plan.name).toBe("[pelan hibah GE]");
  });

  it("survives a JSON round trip and picks each language", () => {
    const stored: unknown = JSON.parse(JSON.stringify(bundle));
    expect(isSummaryBundle(stored)).toBe(true);
    expect(pickSummary(stored, "en")).toEqual(bundle.en);
    expect(pickSummary(stored, "bm")).toEqual(bundle.bm);
    expect(summaryDefaultLang(stored)).toBe("bm");
  });

  it("tolerates a legacy flat ClientSummary (English) and junk", () => {
    const legacy: unknown = JSON.parse(JSON.stringify(bundle.en));
    expect(isSummaryBundle(legacy)).toBe(false);
    expect(pickSummary(legacy, "bm")).toEqual(bundle.en);
    expect(pickSummary(legacy, "en")).toEqual(bundle.en);
    expect(summaryDefaultLang(legacy)).toBe("en");
    for (const junk of [null, undefined, 5, "x", [], {}, { en: {}, bm: {}, defaultLang: "bm" }]) expect(pickSummary(junk, "en")).toBeNull();
  });

  it("every module builds a bundle with no forbidden keys in either language", () => {
    for (const mod of STORYBOARD_MODULES) {
      const b = buildClientSummaryBundle({ module: mod, inputs: INPUTS[mod], agent, plans: {}, defaultLang: "en" });
      expect(Object.keys(b).sort()).toEqual(["bm", "defaultLang", "en"]);
      for (const lang of LANGS) {
        const json = JSON.stringify(b[lang]).toLowerCase();
        for (const w of ["notes", "script", "objection", "checklist", "settings", "inputs", "pipeline", "commission", "ic_number"]) {
          expect(json, `${mod} ${lang} ${w}`).not.toContain(w);
        }
      }
    }
  });
});

describe("agent settings are stored per language", () => {
  const bmOverride = { script: ["Skrip saya", "", "", "", ""], objections: [{ q: "Mahal.", a: "Jawapan saya" }] };

  it("saving BM leaves English untouched, and the reverse", () => {
    const legacy = { script: ["Legacy EN", "", "", "", ""], riskItems: [{ label: "Mine", detail: "d" }] };
    const step1 = mergeAgentSettings(legacy, "bm", bmOverride);
    expect(readAgentSettings(step1, "hibah", "en")).toEqual({ script: legacy.script, riskItems: legacy.riskItems });
    expect(readAgentSettings(step1, "hibah", "bm")).toEqual(bmOverride);
    const step2 = mergeAgentSettings(step1, "en", { script: ["New EN", "", "", "", ""] });
    expect(readAgentSettings(step2, "hibah", "bm")).toEqual(bmOverride);
    expect(readAgentSettings(step2, "hibah", "en").script?.[0]).toBe("New EN");
    expect(readAgentSettings(step2, "hibah", "en").riskItems).toEqual(legacy.riskItems);
  });

  it("legacy un-keyed overrides count as English only", () => {
    const legacy = { objections: [{ q: "It’s expensive.", a: "Mine" }] };
    expect(normaliseStoredAgent(legacy)).toEqual({ objections: { en: legacy.objections } });
    expect(readAgentSettings(legacy, "hibah", "bm")).toEqual({});
    expect(resolveSettings("hibah", "en", {}, readAgentSettings(legacy, "hibah", "en")).overridden).toContain("It’s expensive.");
    expect(resolveSettings("hibah", "bm", {}, readAgentSettings(legacy, "hibah", "bm")).overridden).toEqual([]);
  });

  it("a BM override shows in BM only", () => {
    const stored = mergeAgentSettings(null, "bm", bmOverride);
    const bm = resolveSettings("hibah", "bm", {}, readAgentSettings(stored, "hibah", "bm"));
    const en = resolveSettings("hibah", "en", {}, readAgentSettings(stored, "hibah", "en"));
    expect(bm.script[0].text).toBe("Skrip saya");
    expect(bm.objectionsSpecific.find((o) => o.q === "Mahal.")?.a).toBe("Jawapan saya");
    expect(en.script[0].text).not.toBe("Skrip saya");
    expect(en.overridden).toEqual([]);
  });

  it("junk in one key does not discard the others", () => {
    const stored = { script: { bm: "nope" }, objections: { bm: bmOverride.objections } };
    expect(readAgentSettings(stored, "hibah", "bm")).toEqual({ objections: bmOverride.objections });
  });

  it("validation still refuses other operators in either language", () => {
    for (const lang of LANGS) {
      expect(sanitizeAgentSettings({ script: ["Prudential lebih baik", "", "", "", ""] }, "hibah", lang).ok).toBe(false);
    }
  });
});

describe("localised default content", () => {
  it("BM is parallel to English for every built module (ticks and the raised log use the English key)", () => {
    for (const m of BUILT_MODULES) {
      const { en, bm } = MODULE_CONTENT[m].localised;
      for (const part of ["script", "riskItems", "riskReasons", "objections", "faq"] as const) {
        expect(bm[part].length, `${m} ${part}`).toBe(en[part].length);
      }
    }
    expect(COMMON_CONTENT.bm.objections.map((g) => g.items.length)).toEqual(COMMON_CONTENT.en.objections.map((g) => g.items.length));
    expect(COMMON_CONTENT.bm.faq.length).toBe(COMMON_CONTENT.en.faq.length);
  });

  it("hibah is fully translated (nothing left identical to English)", () => {
    const { en, bm } = MODULE_CONTENT.hibah.localised;
    en.script.forEach((s, i) => expect(bm.script[i].text).not.toBe(s.text));
    en.riskItems.forEach((s, i) => expect(bm.riskItems[i].label).not.toBe(s.label));
    en.objections.forEach((s, i) => expect(bm.objections[i].q).not.toBe(s.q));
    en.faq.forEach((s, i) => expect(bm.faq[i].q).not.toBe(s.q));
  });

  it("BM items resolve to the English key, so ticks survive a language switch", () => {
    const bm = resolveSettings("hibah", "bm");
    const en = resolveSettings("hibah", "en");
    expect(bm.riskItems.map((r) => r.key)).toEqual(en.riskItems.map((r) => r.label));
    expect(bm.objectionsSpecific.map((o) => o.key)).toEqual(en.objectionsSpecific.map((o) => o.q));
    expect(bm.faq.map((o) => o.key)).toEqual(en.faq.map((o) => o.q));
    expect(bm.objectionGroups.flatMap((g) => g.items.map((o) => o.key))).toEqual(en.objectionGroups.flatMap((g) => g.items.map((o) => o.q)));
    expect(en.riskItems.every((r) => r.key === undefined)).toBe(true);
    expect(bm.multLabels[0]).toBe("Kematian");
  });

  it("BM default content has no benefit-guarantee promises and names no other operator", () => {
    const text = JSON.stringify(MODULE_CONTENT.hibah.localised.bm);
    expect(text).not.toMatch(/(tuntutan|pembayaran|kelulusan|penerimaan) (yang )?dijamin/i);
    expect(text).not.toMatch(/prudential|etiqa|allianz|\baia\b|manulife|takaful malaysia/i);
  });

  it("every language resolves for every module", () => {
    for (const m of BUILT_MODULES) for (const lang of ["en", "bm"] as Lang[]) {
      const r = resolveSettings(m, lang);
      expect(r.script.length).toBeGreaterThan(0);
      expect(r.lang).toBe(lang);
    }
  });
});
