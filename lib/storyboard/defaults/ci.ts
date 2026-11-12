import type { CiInputs } from "../engine/ci";
import { COMMON_CONTENT, COMMON_FAQ, COMMON_OBJECTIONS, type ModuleContent } from "./common";
import type { Localised } from "./localised";

export const CI_DEFAULT_INPUTS: CiInputs = {
  nick: "Siti",
  income: 5000,
  commit: 3000,
  pct: 70,
  months: 12,
  rehab: 20000,
  emer: 10000,
  cg: 0,
  cgMonths: 0,
  waiver: "yes",
  contrib: 0,
  savings: 10000,
  employer: 0,
  countEmp: "no",
  structure: "late",
  ciAmt: 30000,
  earlyPct: 50,
  booster: "0",
  recovery: "0",
  reduces: "unsure",
  base: 0,
  afford: 0,
  deps: {},
};

export const CI_COMMITMENT_LABELS = [
  "Home instalment / rent",
  "Car / motorcycle loan",
  "Electricity, water, phone & internet",
  "Groceries & family meals",
  "School fees, childcare, school transport",
  "Caregiver / helper",
  "Travel to hospital & parking",
  "Follow-up treatment, physio & rehab",
  "Business / staff costs if self-employed",
  "Living fund until able to work again",
];

export const CI_DEPENDENCY_ITEMS = [
  { label: "I’m the main breadwinner", hint: "The family relies on my income." },
  { label: "I run a business / earn commission", hint: "No work = income can drop fast." },
  { label: "Emergency fund under 6 months", hint: "Savings may run out quickly." },
  { label: "Home loan / high rent", hint: "Big commitments keep running." },
  { label: "Vehicle loan / other debts", hint: "Monthly payments still due." },
  { label: "Children / dependants", hint: "Their needs don’t stop while we’re ill." },
  { label: "Spouse also relies on my income", hint: "Household income is easily hit." },
  { label: "Company medical is limited / tied to the job", hint: "Cover can be lost when changing or leaving work." },
  { label: "Not sure how much CI I already have", hint: "Have a plan but don’t know the rider sum covered." },
  { label: "Current savings are earmarked", hint: "House, education, business, retirement and so on." },
];

/** Presets for the "share of income to replace" and "recovery period" chips. */
export const CI_PCT_PRESETS = [50, 70, 100];
export const CI_MONTH_PRESETS = [3, 6, 12, 24];
export const CI_BOOSTER_OPTIONS = [0, 5, 10, 15, 20, 25, 30];

/**
 * The CI story is an empty, AGENT-ONLY field. It is stored with the inputs for
 * the agent's own use and is never read by buildClientSummary, the WhatsApp
 * text or the portal.
 */
export const CI_DEFAULT_STORY = "";

/** Placeholders only. Replace from a verified source (for example the latest national statistics) and name the year. */
export const CI_STAT_PLACEHOLDERS = [
  "[statistic + source: deaths from ischaemic heart disease, year]",
  "[statistic + source: deaths from cancer, year]",
  "[statistic + source: leading causes of death by age group, year]",
];

export const CI_CYCLE = [
  { t: "Diagnosis", d: "Treatment and tests begin" },
  { t: "Less or no work", d: "Income slows or stops" },
  { t: "Commitments continue", d: "Instalments and bills still fall due" },
  { t: "Recovery costs appear", d: "Caregiver, travel, rehab, special food" },
  { t: "Rebuilding", d: "Returning to work, restoring savings" },
];

/** Three plan structures. Names come from the agent; counts and percentages come from each plan's PDS. */
export const CI_APPROACHES = [
  {
    tag: "LUMP SUM",
    defaultName: "[GE lump-sum CI rider]",
    points: [
      "[n] critical illnesses covered",
      "One lump-sum payment when the diagnosis meets the definition",
      "Paid while alive; check the survival period",
      "Waiting period: [days]; may be longer for certain illnesses",
    ],
    line: "Medical card pays the hospital. CI protects cashflow.",
  },
  {
    tag: "STAGED · EARLY TO LATE",
    defaultName: "[GE staged CI option]",
    points: [
      "[n] conditions across early, late and special stages",
      "Early stage: [x]% of sum covered",
      "Late stage: balance less earlier payments",
      "Extra benefits per the PDS",
    ],
    line: "Cover from early to late stage, subject to the certificate’s definitions.",
  },
  {
    tag: "STANDALONE",
    defaultName: "[GE standalone CI plan]",
    points: [
      "Early stage: [x]% of base cover, plus any booster",
      "Late stage: balance less earlier payments",
      "Booster, if any, grows with certificate years per the PDS",
      "Check whether early payouts reduce the base cover",
    ],
    line: "A plan whose benefits can grow with the certificate years, per the PDS.",
  },
];

export const CI_CERT_CHECKS = [
  "Rider name and actual rider sum covered",
  "Early stage, or late stage only",
  "Does a CI payout reduce the basic sum covered?",
  "Waiting and survival periods",
  "Exclusions, endorsements, loading",
  "Rider expiry age",
  "Is the amount still right for income and commitments?",
];

export const CI_ILLNESSES = [
  "Stroke", "Heart attack", "Kidney failure", "Cancer", "Coronary artery bypass surgery",
  "Serious coronary artery disease", "Angioplasty & other invasive coronary treatment", "End-stage liver failure",
  "Fulminant viral hepatitis", "Coma", "Benign brain tumour", "Paralysis of limbs", "Blindness", "Deafness",
  "Third-degree burns", "End-stage lung disease", "Encephalitis", "Major organ / bone marrow transplant",
  "Loss of speech", "Brain surgery", "Heart valve surgery", "Terminal illness", "Loss of independent existence",
  "Bacterial meningitis", "Major head trauma", "Chronic aplastic anaemia", "Motor neurone disease",
  "Parkinson’s disease", "Alzheimer’s / severe dementia", "Muscular dystrophy", "Surgery to aorta",
  "Multiple sclerosis", "Primary pulmonary arterial hypertension", "Cardiomyopathy", "Poliomyelitis",
];

export const CI_RISK_SPECIFIC = [
  "Family history of heart disease or cancer matters a lot for CI.",
  "A general waiting period applies, and it can be longer for some illnesses. [Check the certificate for the days.]",
  "A survival period after diagnosis applies to certain benefits.",
  "The certificate’s definition decides, not the illness name. Early and late stages have separate criteria.",
  "Existing illness, smoking and vaping must be fully declared; non-disclosure is a common reason claims are rejected.",
  "Loading, exclusion or endorsement may be applied after underwriting.",
  "Early and intermediate stage payouts may have a cap on some plans. [Check the PDS.]",
  "A rider or certificate may end after the full CI benefit is paid; new cover can be harder after that history.",
  "Extra cash benefits have their own conditions. Read them in the PDS.",
];

export const CI_DEFAULT_CONTENT: ModuleContent = {
  script: [
    { title: "Separate the 3 products", text: "Medical card pays the hospital bill. Hibah helps the family when we’re gone. CI gives {name} cash while still alive but tested." },
    { title: "Show the commitments", text: "Just now {name} ticked {commits} commitments that keep running even when ill. Dependency score {dep}/10." },
    { title: "Show both scenarios", text: "At early stage, {name} receives {recEarly} and the gap is {gapEarly}. At late stage, receives {recLate}, gap {gapLate}. Current sources last about {runEarly} to {runLate} months of commitments." },
    { title: "Proof", text: "[Your proof] Share one approved CI claim you handled: the plan type, amount and date, with names hidden and the client’s consent." },
    { title: "Close", text: "Let me check your existing certificate first, then show options that fit your budget. Agreed?" },
  ],
  riskItems: [
    { label: "Existing illness", detail: "Examples: high blood pressure, diabetes, heart, asthma, cholesterol, kidney, cancer, mental health. Likely outcome: may be accepted with loading, an exclusion for that condition, postponed or declined. Declare fully with doctor’s reports." },
    { label: "Smoke / vape", detail: "Examples: including vape and occasional smoking. Likely outcome: higher smoker rates. Never declare non-smoker if you smoke: a claim can be rejected." },
    { label: "High / low BMI", detail: "Examples: weight and height outside the normal range. Likely outcome: loading or postponement. Note the exact weight and height." },
    { label: "Hospitalised / surgery before", detail: "Examples: recent stays or operations. Likely outcome: the underwriter may ask for hospital reports; an exclusion is possible." },
    { label: "Tests / symptoms not yet investigated", detail: "Examples: waiting for test results, a lump, chest pain, a specialist referral. Likely outcome: usually postponed until results are out. Never submit without declaring." },
    { label: "Hazardous occupation", detail: "Examples: construction, factory machinery, motorcycle delivery, offshore, security. Likely outcome: higher contribution or limits on accident benefits." },
    { label: "Risky hobbies", detail: "Examples: motorsport, scuba diving, high-altitude climbing, skydiving. Likely outcome: activity exclusion or loading." },
    { label: "Family history", detail: "Examples: parents or siblings with heart disease, cancer or stroke at a young age. Likely outcome: important for CI; loading is possible." },
    { label: "Amount out of line with income", detail: "Examples: cover far above what the income level supports. Likely outcome: financial underwriting with payslips, tax and source of funds; may be reduced or declined." },
    { label: "Age outside limits", detail: "Examples: too old or too young for the plan or rider. Likely outcome: choose another plan or a shorter term." },
    { label: "Incomplete documents / information", detail: "Examples: IC copy, address, nominee, signature, health confirmation. Likely outcome: application pending or cancelled. Check everything before submitting." },
  ],
  riskReasons: [
    { label: "Non-disclosure", detail: "Health information not declared at application. A common reason claims are rejected or certificates cancelled." },
    { label: "Waiting period", detail: "A diagnosis within the waiting period, which can differ by illness and plan. [Check the days in the PDS.]" },
    { label: "Exclusions", detail: "Pre-existing conditions, self-inflicted injury, drugs or alcohol, excluded activities." },
    { label: "Certificate lapsed", detail: "Contributions overdue past the grace period can end the cover. Set up auto-debit." },
    { label: "Doesn’t meet the definition", detail: "CI benefits follow the certificate’s clinical definitions and stage criteria, not the name of the illness." },
    { label: "Incomplete claim documents", detail: "Specialist reports, diagnostic results, claim forms or proof of the event are missing." },
  ],
  objections: [
    { q: "I already have a medical card.", a: "A medical card pays the hospital; it isn’t cash for income. Who pays the home instalment while you can’t work?" },
    { q: "I already have hibah.", a: "Hibah is for the beneficiaries when you pass away. CI is for you while you’re alive but ill." },
    { q: "I don’t need it yet.", a: "The commitments exist today. Risk is managed while you’re still healthy and eligible. [statistic + source, if you use one]" },
    { q: "Not sure what CI I already have.", a: "Let’s check the certificate first before changing anything or buying new." },
    { q: "I don’t want to buy right away.", a: "That’s fine. We review the existing certificate and request an illustration, with no obligation to sign up." },
    { q: "Will CI reduce my hibah cover?", a: "It depends on the plan. Some plans reduce the base cover when a CI payout is made. We check the certificate together before deciding." },
    ...COMMON_OBJECTIONS.flatMap((g) => g.items),
  ],
  faq: [
    { q: "If the medical card already paid, can I still claim CI?", a: "CI is paid on a diagnosis that meets the certificate’s definition, not on the bill amount. Check the terms." },
    { q: "Do I need to be warded or in ICU first?", a: "Not necessarily. The trigger is a diagnosis that meets the certificate definition." },
    { q: "Why CI if I already have hibah?", a: "Hibah is for death; CI is for when you’re alive with a critical illness." },
    { q: "Lump-sum CI vs staged CI?", a: "Lump sum pays once for listed illnesses. Staged covers early to late stages, often with extra benefits. Check each PDS." },
    { q: "What is the waiting period?", a: "A period after the start date in which a diagnosis is not covered. It can differ by illness. [Check the certificate.]" },
    { q: "What is the survival period?", a: "For certain benefits, the covered person must survive a set number of days after diagnosis. [Check the certificate.]" },
    { q: "I have an existing illness. Can I apply?", a: "Yes, declare fully. There may be extra terms, an exclusion, postponement or decline." },
    { q: "Does everyone get a big payout?", a: "No. It depends on the rider, sum covered, diagnosis, stage and certificate conditions." },
    ...COMMON_FAQ,
  ],
};

/** One agent-only claim proof row for Step 2: title, amount, detail. */
export type CiProofRow = { t: string; v: string; d: string };

/** Bahasa Malaysia content, parallel to CI_DEFAULT_CONTENT (same counts, same order). Ticks use the English label as key. */
export const CI_CONTENT_BM: ModuleContent = {
  script: [
    { title: "Pisahkan 3 produk", text: "Kad perubatan membayar bil hospital. Hibah membantu keluarga apabila kita tiada. CI memberi {name} tunai semasa masih hidup tetapi sedang diuji." },
    { title: "Tunjuk komitmen", text: "Tadi {name} menanda {commits} komitmen yang terus berjalan walaupun sakit. Skor kebergantungan {dep}/10." },
    { title: "Tunjuk kedua-dua senario", text: "Pada peringkat awal, {name} menerima {recEarly} dan jurangnya ialah {gapEarly}. Pada peringkat lewat, menerima {recLate}, jurang {gapLate}. Sumber semasa bertahan kira-kira {runEarly} hingga {runLate} bulan komitmen." },
    { title: "Bukti", text: "[Bukti anda] Kongsikan satu tuntutan CI yang telah diluluskan dan pernah anda uruskan: jenis pelan, jumlah dan tarikh, dengan nama disembunyikan dan dengan kebenaran klien." },
    { title: "Penutup", text: "Biar saya semak sijil sedia ada anda dahulu, kemudian tunjukkan pilihan yang sesuai dengan bajet anda. Setuju?" },
  ],
  riskItems: [
    { label: "Penyakit sedia ada", detail: "Contoh: darah tinggi, kencing manis, jantung, asma, kolesterol, buah pinggang, kanser, kesihatan mental. Kemungkinan hasil: mungkin diterima dengan caruman tambahan (loading), pengecualian bagi keadaan itu, ditangguhkan atau ditolak. Dedahkan sepenuhnya dengan laporan doktor." },
    { label: "Merokok / vape", detail: "Contoh: termasuk vape dan merokok sekali-sekala. Kemungkinan hasil: kadar perokok yang lebih tinggi. Jangan sekali-kali mengisytiharkan bukan perokok jika anda merokok: tuntutan boleh ditolak." },
    { label: "BMI tinggi / rendah", detail: "Contoh: berat dan tinggi di luar julat normal. Kemungkinan hasil: caruman tambahan (loading) atau penangguhan. Catat berat dan tinggi yang tepat." },
    { label: "Pernah dimasukkan ke hospital / menjalani pembedahan", detail: "Contoh: kemasukan atau pembedahan baru-baru ini. Kemungkinan hasil: penilai risiko (underwriter) mungkin meminta laporan hospital; pengecualian boleh berlaku." },
    { label: "Ujian / simptom yang belum disiasat", detail: "Contoh: menunggu keputusan ujian, ketulan, sakit dada, rujukan pakar. Kemungkinan hasil: biasanya ditangguhkan sehingga keputusan diperoleh. Jangan hantar permohonan tanpa mendedahkannya." },
    { label: "Pekerjaan berisiko tinggi", detail: "Contoh: pembinaan, jentera kilang, penghantaran dengan motosikal, luar pesisir, keselamatan. Kemungkinan hasil: caruman lebih tinggi atau had pada manfaat kemalangan." },
    { label: "Hobi berisiko", detail: "Contoh: sukan permotoran, menyelam skuba, mendaki gunung tinggi, terjun payung. Kemungkinan hasil: pengecualian aktiviti atau caruman tambahan (loading)." },
    { label: "Sejarah keluarga", detail: "Contoh: ibu bapa atau adik-beradik yang menghidap penyakit jantung, kanser atau strok pada usia muda. Kemungkinan hasil: penting bagi CI; caruman tambahan (loading) mungkin dikenakan." },
    { label: "Jumlah tidak setara dengan pendapatan", detail: "Contoh: perlindungan jauh melebihi apa yang disokong oleh tahap pendapatan. Kemungkinan hasil: penilaian risiko (underwriting) kewangan dengan slip gaji, cukai dan sumber dana; mungkin dikurangkan atau ditolak." },
    { label: "Umur di luar had", detail: "Contoh: terlalu tua atau terlalu muda untuk pelan atau rider. Kemungkinan hasil: pilih pelan lain atau tempoh yang lebih pendek." },
    { label: "Dokumen / maklumat tidak lengkap", detail: "Contoh: salinan IC, alamat, penama, tandatangan, pengesahan kesihatan. Kemungkinan hasil: permohonan tertangguh atau dibatalkan. Semak semuanya sebelum menghantar." },
  ],
  riskReasons: [
    { label: "Tidak mendedahkan maklumat", detail: "Maklumat kesihatan tidak diisytiharkan semasa permohonan. Antara sebab biasa tuntutan ditolak atau sijil dibatalkan." },
    { label: "Tempoh menunggu", detail: "Diagnosis dalam tempoh menunggu, yang boleh berbeza mengikut penyakit dan pelan. [Semak bilangan hari dalam PDS.]" },
    { label: "Pengecualian", detail: "Keadaan sedia ada, kecederaan yang dilakukan sendiri, dadah atau alkohol, aktiviti yang dikecualikan." },
    { label: "Sijil luput", detail: "Caruman tertunggak melepasi tempoh bertoleransi (grace period) boleh menamatkan perlindungan. Sediakan auto-debit." },
    { label: "Tidak menepati takrifan", detail: "Manfaat CI mengikut takrifan klinikal dan kriteria peringkat dalam sijil, bukan nama penyakit." },
    { label: "Dokumen tuntutan tidak lengkap", detail: "Laporan pakar, keputusan diagnostik, borang tuntutan atau bukti kejadian tidak lengkap." },
  ],
  objections: [
    { q: "Saya sudah ada kad perubatan.", a: "Kad perubatan membayar hospital; ia bukan tunai untuk menggantikan pendapatan. Siapa yang akan bayar ansuran rumah ketika anda tidak boleh bekerja?" },
    { q: "Saya sudah ada hibah.", a: "Hibah untuk para penerima apabila anda meninggal dunia. CI untuk anda ketika masih hidup tetapi sakit." },
    { q: "Saya belum perlukannya lagi.", a: "Komitmen itu wujud hari ini. Risiko diurus ketika anda masih sihat dan layak. [statistik + sumber, jika anda menggunakannya]" },
    { q: "Saya tidak pasti CI apa yang saya sudah ada.", a: "Mari kita semak sijil dahulu sebelum mengubah apa-apa atau membeli yang baharu." },
    { q: "Saya tidak mahu beli sekarang.", a: "Tidak mengapa. Kita semak sijil sedia ada dan minta ilustrasi, tanpa sebarang kewajipan untuk mendaftar." },
    { q: "Adakah CI akan mengurangkan perlindungan hibah saya?", a: "Ia bergantung pada pelan. Sesetengah pelan mengurangkan perlindungan asas apabila bayaran CI dibuat. Kita semak sijil bersama-sama sebelum memutuskan." },
    ...COMMON_CONTENT.bm.objections.flatMap((g) => g.items),
  ],
  faq: [
    { q: "Jika kad perubatan sudah membayar, bolehkah saya masih menuntut CI?", a: "CI dibayar apabila diagnosis memenuhi takrifan dalam sijil, bukan berdasarkan jumlah bil. Semak terma." },
    { q: "Adakah saya perlu dimasukkan ke wad atau ICU dahulu?", a: "Belum tentu. Pencetusnya ialah diagnosis yang memenuhi takrifan dalam sijil." },
    { q: "Mengapa perlu CI jika saya sudah ada hibah?", a: "Hibah untuk kematian; CI untuk ketika anda masih hidup dengan penyakit kritikal." },
    { q: "CI sekaligus berbanding CI berperingkat?", a: "CI sekaligus membayar sekali untuk penyakit yang disenaraikan. CI berperingkat melindungi dari peringkat awal hingga lewat, selalunya dengan manfaat tambahan. Semak setiap PDS." },
    { q: "Apakah tempoh menunggu?", a: "Tempoh selepas tarikh mula di mana diagnosis tidak dilindungi. Ia boleh berbeza mengikut penyakit. [Semak sijil.]" },
    { q: "Apakah tempoh survival?", a: "Bagi manfaat tertentu, orang yang dilindungi mesti hidup selama bilangan hari tertentu selepas diagnosis. [Semak sijil.]" },
    { q: "Saya ada penyakit sedia ada. Bolehkah saya memohon?", a: "Boleh, dedahkan sepenuhnya. Mungkin ada terma tambahan, pengecualian, penangguhan atau penolakan." },
    { q: "Adakah semua orang mendapat bayaran yang besar?", a: "Tidak. Ia bergantung pada rider, jumlah perlindungan, diagnosis, peringkat dan syarat sijil." },
    ...COMMON_CONTENT.bm.faq,
  ],
};

export const CI_CONTENT: Localised<ModuleContent> = {
  en: CI_DEFAULT_CONTENT,
  bm: CI_CONTENT_BM,
};
