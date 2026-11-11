// The words that go with the numbers: the one-line caption under each animated
// block, the agent's talk track, and the WhatsApp summary. All three are built
// from the same result, so what the prospect hears, sees and is sent agree.
import type { HibahInputs, HibahResult } from "./hibah";
import type { MedicalInputs, MedicalResult } from "./medical";
import type { CiInputs, CiResult } from "./ci";
import { STORYBOARD_TEXT, rm, type Lang } from "./i18n";
import { suggestedCover, type StoryboardProfile } from "./modules";

const who = (p: StoryboardProfile, lang: Lang) => p.nickname.trim() || (lang === "bm" ? "anda" : "you");

export function hibahCaption(r: HibahResult, p: StoryboardProfile, lang: Lang) {
  const name = who(p, lang);
  if (r.gap === 0) {
    return lang === "bm"
      ? `Keluarga ${name} sudah dilindungi sepenuhnya untuk keperluan yang dikira.`
      : `${name}'s family is fully covered for the needs we counted.`;
  }
  return lang === "bm"
    ? `Hari ini keluarga ${name} ada ${r.coveredPct}%. Baki ${100 - r.coveredPct}%, iaitu ${rm(r.gap)}, belum dirancang.`
    : `Today ${name}'s family has ${r.coveredPct}%. The other ${100 - r.coveredPct}%, ${rm(r.gap)}, isn't planned for yet.`;
}

export function medicalCaption(r: MedicalResult, lang: Lang) {
  if (r.gap === 0) {
    return lang === "bm" ? "Panel syarikat dan simpanan cukup untuk senario ini." : "The company panel and savings cover this scenario.";
  }
  return lang === "bm"
    ? `Daripada bil ${rm(r.bill)}, ${rm(r.gap)} perlu dicari sendiri: KWSP, jual aset, pinjam, atau keluarga.`
    : `Of a ${rm(r.bill)} bill, ${rm(r.gap)} has to be found elsewhere: EPF, selling assets, borrowing, or family.`;
}

export function ciCaption(r: CiResult, p: StoryboardProfile, lang: Lang) {
  const name = who(p, lang);
  const short = r.monthsCovered < r.recoveryMonths;
  if (r.gap === 0) {
    return lang === "bm"
      ? `Simpanan dan CI ${name} cukup untuk ${r.recoveryMonths} bulan pemulihan.`
      : `${name}'s savings and CI cover the ${r.recoveryMonths}-month recovery.`;
  }
  return lang === "bm"
    ? `Yang ada bertahan ±${r.monthsCovered} bulan${short ? `, sebelum ${r.recoveryMonths} bulan pemulihan selesai` : ""}. Kurang ${rm(r.gap)} tunai.`
    : `What's in place lasts about ${r.monthsCovered} months${short ? `, before the ${r.recoveryMonths}-month recovery ends` : ""}. ${rm(r.gap)} of cash short.`;
}

export function ciTalkTrack(r: CiResult, p: StoryboardProfile, lang: Lang): string[] {
  const name = who(p, lang);
  if (lang === "en") {
    return [
      `${name}, the medical card pays the hospital. But while you recover, the house, the car and the groceries still need paying, and the income may stop.`,
      `To keep ${rm(r.monthlyNeed)} a month coming in for ${r.recoveryMonths} months, plus ${rm(r.extraCosts)} for rehab and emergencies, you need ${rm(r.need)}.`,
      `Savings and existing CI come to ${rm(r.have)} — about ${r.monthsCovered} months of commitments. The gap is ${rm(r.gap)}.`,
      `Critical illness cover pays a lump sum in cash on diagnosis, while you're still here, to spend on whatever the family needs.`,
      `Shall I prepare an illustration of around ${rm(suggestedCover(r.gap))} in CI cover?`,
    ];
  }
  return [
    `${name}, medical card bayar hospital. Tapi masa pulih, rumah, kereta dan dapur tetap perlu dibayar, dan pendapatan mungkin terhenti.`,
    `Untuk kekalkan ${rm(r.monthlyNeed)} sebulan selama ${r.recoveryMonths} bulan, ditambah ${rm(r.extraCosts)} untuk rehab dan kecemasan, ${name} perlukan ${rm(r.need)}.`,
    `Simpanan dan CI sedia ada ${rm(r.have)}, lebih kurang ${r.monthsCovered} bulan komitmen. Jurangnya ${rm(r.gap)}.`,
    `Perlindungan penyakit kritikal bayar tunai sekaligus bila disahkan, semasa kita masih hidup, untuk apa saja keperluan keluarga.`,
    `Boleh saya sediakan ilustrasi CI sekitar ${rm(suggestedCover(r.gap))}?`,
  ];
}

/** Five beats the agent speaks to, in order. Plain text: the agent reads it. */
export function hibahTalkTrack(r: HibahResult, i: HibahInputs, p: StoryboardProfile, lang: Lang): string[] {
  const name = who(p, lang);
  const years = i.supportYears;
  if (lang === "en") {
    return [
      `${name}, we work every day to provide. If we were gone tomorrow, who would carry on with the house, the kitchen and the children's school?`,
      `By the numbers we just went through, your family needs ${rm(r.need)}. What's in place today is ${rm(r.have)}, so the gap is ${rm(r.gap)}.`,
      `${rm(r.support)} of that is keeping the household running for ${years} years. ${rm(r.debt)} is debt that would otherwise fall on them.`,
      `With a hibah nomination, the death benefit goes straight to the people you name, quickly and outside the estate process, so they aren't left waiting.`,
      `Let's find a level that fits your budget. Shall I prepare an illustration of around ${rm(suggestedCover(r.gap))}?`,
    ];
  }
  return [
    `${name}, kita keluar cari rezeki setiap hari. Kalau esok kita tiada, siapa yang sambung bayar rumah, dapur dan sekolah anak?`,
    `Ikut angka yang kita isi tadi, keluarga perlukan ${rm(r.need)}. Yang ada sekarang ${rm(r.have)}, jadi jurangnya ${rm(r.gap)}.`,
    `${rm(r.support)} daripadanya untuk rumah tangga terus berjalan selama ${years} tahun. ${rm(r.debt)} pula hutang yang akan jatuh ke bahu mereka.`,
    `Dengan penamaan hibah, manfaat kematian terus kepada orang yang ${name} namakan, cepat dan di luar proses pusaka, supaya mereka tak tertunggu-tunggu.`,
    `Kita cari tahap yang selesa ikut bajet. Boleh saya sediakan ilustrasi sekitar ${rm(suggestedCover(r.gap))}?`,
  ];
}

export function medicalTalkTrack(r: MedicalResult, i: MedicalInputs, p: StoryboardProfile, lang: Lang): string[] {
  const t = STORYBOARD_TEXT[lang];
  const name = who(p, lang);
  const bill = t.medical.bills[i.billKey];
  if (lang === "en") {
    return [
      `${name}, your everyday risk score is ${r.riskScore}, ${t.medical.level[r.riskLevel].toLowerCase()}. Most hospital stays start with something ordinary.`,
      `Take one real scenario: ${bill.toLowerCase()} comes to about ${rm(r.bill)} at a private hospital.`,
      `The company panel covers ${rm(r.companyUsed)} and savings ${rm(r.savingsUsed)}. That leaves ${rm(r.gap)} to find, and in five years the same bill is about ${rm(r.billIn5Years)}.`,
      `A medical card of your own pays the panel hospital directly, with no cash deposit, and stays with you whatever job you're in.`,
      `It's roughly ${rm(r.ownCardYearly)} a year. Shall I check what fits your age and budget?`,
    ];
  }
  return [
    `${name}, skor risiko harian ${r.riskScore}, tahap ${t.medical.level[r.riskLevel].toLowerCase()}. Kebanyakan kemasukan hospital bermula dengan perkara biasa.`,
    `Ambil satu senario sebenar: ${bill.toLowerCase()} lebih kurang ${rm(r.bill)} di hospital swasta.`,
    `Panel syarikat tanggung ${rm(r.companyUsed)}, simpanan ${rm(r.savingsUsed)}. Baki ${rm(r.gap)} perlu dicari sendiri, dan 5 tahun lagi bil yang sama sekitar ${rm(r.billIn5Years)}.`,
    `Medical card sendiri bayar terus ke hospital panel, tanpa deposit tunai, dan kekal walaupun tukar kerja.`,
    `Lebih kurang ${rm(r.ownCardYearly)} setahun. Boleh saya semak pelan yang sesuai dengan umur dan bajet ${name}?`,
  ];
}

export function waSummary(
  module: "hibah" | "medical" | "ci",
  result: HibahResult | MedicalResult | CiResult,
  inputs: HibahInputs | MedicalInputs | CiInputs,
  p: StoryboardProfile,
  lang: Lang,
  agent: { name: string; phone: string | null },
) {
  const t = STORYBOARD_TEXT[lang];
  const name = who(p, lang);
  const lines: string[] = [];
  const bold = (s: string) => `*${s}*`;

  if (module === "hibah") {
    const r = result as HibahResult;
    lines.push(bold(lang === "bm" ? `Ringkasan Perancangan Hibah — ${name}` : `Hibah Planning Summary — ${name}`), "");
    lines.push(`${t.hibah.breakdown.support}: ${rm(r.support)}`);
    lines.push(`${t.hibah.breakdown.debt}: ${rm(r.debt)}`);
    lines.push(`${t.hibah.breakdown.oneOff}: ${rm(r.oneOff)}`);
    lines.push(`${t.common.need}: ${bold(rm(r.need))}`);
    lines.push(`${t.common.have}: ${rm(r.have)} (${r.coveredPct}%)`);
    lines.push(`${t.common.gap}: ${bold(rm(r.gap))}`, "");
    lines.push(hibahCaption(r, p, lang));
  } else if (module === "ci") {
    const r = result as CiResult;
    lines.push(bold(lang === "bm" ? `Ringkasan Penyakit Kritikal — ${name}` : `Critical Illness Summary — ${name}`), "");
    lines.push(`${t.ci.monthlyNeed}: ${rm(r.monthlyNeed)} × ${r.recoveryMonths} ${t.common.months}`);
    lines.push(`${t.ci.runway}: ${rm(r.runwayNeed)}`);
    lines.push(`${t.ci.extraCosts}: ${rm(r.extraCosts)}`);
    lines.push(`${t.common.need}: ${bold(rm(r.need))}`);
    lines.push(`${t.common.have}: ${rm(r.have)} (${r.coveredPct}%)`);
    lines.push(`${t.common.gap}: ${bold(rm(r.gap))}`, "");
    lines.push(ciCaption(r, p, lang));
  } else {
    const r = result as MedicalResult;
    const i = inputs as MedicalInputs;
    lines.push(bold(lang === "bm" ? `Ringkasan Medical Card — ${name}` : `Medical Card Summary — ${name}`), "");
    lines.push(`${t.medical.score} ${t.analytics.riskScore.toLowerCase()}: ${r.riskScore} (${t.medical.level[r.riskLevel]})`);
    lines.push(`${t.medical.bill}: ${t.medical.bills[i.billKey]} ${rm(r.bill)}`);
    lines.push(`${t.medical.company}: ${rm(r.companyUsed)}`);
    lines.push(`${t.medical.ownSavings}: ${rm(r.savingsUsed)}`);
    lines.push(`${t.common.gap}: ${bold(rm(r.gap))}`);
    lines.push(`${t.medical.billIn5}: ${rm(r.billIn5Years)}`, "");
    lines.push(medicalCaption(r, lang));
  }

  lines.push("", `_${t.common.disclaimer}_`, "", agent.name + (agent.phone ? ` · ${agent.phone}` : ""));
  return lines.join("\n");
}
