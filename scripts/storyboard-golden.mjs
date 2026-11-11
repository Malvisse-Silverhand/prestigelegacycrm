// Golden checks for the Financial Storyboard engines. Each case is a set of
// inputs whose answer was read off a reference needs-analysis tool, so a
// formula change that moves any of these numbers is caught here.
//
//   npm run test:storyboard
//
// Imports the .ts engines directly: Node 22.18+/24 strips the types itself.
import assert from "node:assert/strict";
import { calcHibah, HIBAH_DEFAULTS } from "../lib/storyboard/hibah.ts";
import { calcMedical, MEDICAL_DEFAULTS, riskLevel } from "../lib/storyboard/medical.ts";
import { calcCi, CI_DEFAULTS } from "../lib/storyboard/ci.ts";

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}\n       ${e.message.split("\n").join("\n       ")}`);
  }
}
const hibah = (patch) => calcHibah({ ...HIBAH_DEFAULTS, ...patch });
const pick = (r, keys) => Object.fromEntries(keys.map((k) => [k, r[k]]));

console.log("Hibah");
check("defaults: need 705k, have 120k, gap 585k, 17%", () =>
  assert.deepEqual(pick(hibah({}), ["need", "have", "gap", "coveredPct", "support", "debt", "oneOff"]), {
    need: 705000, have: 120000, gap: 585000, coveredPct: 17, support: 300000, debt: 340000, oneOff: 65000,
  }));
check("5% inflation from year 2: support 331,538", () => {
  const r = hibah({ inflationPct: 5 });
  assert.equal(r.support, 331538);
  assert.equal(r.gap, 616538);
  assert.equal(r.coveredPct, 16);
});
check("5% inflation + RM1,000 other contribution: support 271,538", () => {
  const r = hibah({ inflationPct: 5, otherContribution: 1000 });
  assert.equal(r.support, 271538);
  assert.equal(r.coveredPct, 18);
});
check("70% replaced + RM1,000 contribution: support 150,000", () =>
  assert.equal(hibah({ replacePct: 70, otherContribution: 1000 }).gap, 435000));
check("TPD adds RM1,500 care: support 390,000", () => assert.equal(hibah({ scenario: "tpd" }).support, 390000));
check("itemised + TPD: support 291,000, gap 576,000", () => {
  const r = hibah({ scenario: "tpd", method: "itemised" });
  assert.equal(r.support, 291000);
  assert.equal(r.gap, 576000);
});
check("house loan partly covered (RM100k): debt 240,000", () =>
  assert.equal(hibah({ houseCover: "partial", houseCovered: 100000 }).debt, 240000));
check("house loan fully covered: debt 60,000, gap 305,000", () => {
  const r = hibah({ houseCover: "full" });
  assert.equal(r.debt, 60000);
  assert.equal(r.gap, 305000);
});
check("gap never negative", () => assert.equal(hibah({ savings: 5_000_000 }).gap, 0));

console.log("Medical Card");
const medical = (patch) => calcMedical({ ...MEDICAL_DEFAULTS, ...patch });
check("breast cancer: gap 365k, 5-yr bill 794,486, 61 yrs to save", () =>
  assert.deepEqual(pick(medical({}), ["bill", "gap", "billIn5Years", "yearsToSave", "ownCardYearly"]), {
    bill: 395000, gap: 365000, billIn5Years: 794486, yearsToSave: 61, ownCardYearly: 3600,
  }));
check("self-employed: company cover ignored", () => assert.equal(medical({ employment: "self_employed" }).gap, 385000));
check("risk: desk + motorcycle = 4, low, top = motorcycle", () => {
  const r = medical({});
  assert.deepEqual([r.riskScore, r.riskLevel, r.topRisk], [4, "low", "motorcycle"]);
});
check("risk: field + industry + gig = 9, medium", () =>
  assert.equal(medical({ risks: ["field_work", "heavy_industry", "gig_work"] }).riskLevel, "medium"));
check("risk: tie keeps first in list", () =>
  assert.equal(medical({ risks: ["desk_work", "shift_work", "no_exercise"] }).topRisk, "shift_work"));
check("risk bands: 5 low, 6 medium, 13 medium, 14 high", () =>
  assert.deepEqual([5, 6, 13, 14].map(riskLevel), ["low", "medium", "medium", "high"]));

console.log("Critical Illness");
const ci = (patch) => calcCi({ ...CI_DEFAULTS, ...patch });
check("defaults: 70% of 5k × 12 + 30k − 40k = gap 32,000; 11.4 months", () =>
  assert.deepEqual(pick(ci({}), ["monthlyNeed", "runwayNeed", "need", "have", "gap", "monthsCovered"]), {
    monthlyNeed: 3500, runwayNeed: 42000, need: 72000, have: 40000, gap: 32000, monthsCovered: 11.4,
  }));
check("100% replaced: gap 50,000", () => assert.equal(ci({ replacePct: 100 }).gap, 50000));
check("50% replaced: gap 20,000", () => assert.equal(ci({ replacePct: 50 }).gap, 20000));
check("months covered uses the commitment, not the need: 20.0", () =>
  assert.deepEqual([ci({ monthlyCommitment: 2000 }).gap, ci({ monthlyCommitment: 2000 }).monthsCovered], [32000, 20]));
check("24 months: gap 74,000", () => assert.equal(ci({ recoveryMonths: 24 }).gap, 74000));
check("employer CI RM5k: gap 27,000, 12.9 months", () => {
  const r = ci({ employerCi: 5000 });
  assert.deepEqual([r.gap, r.monthsCovered], [27000, 12.9]);
});

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
