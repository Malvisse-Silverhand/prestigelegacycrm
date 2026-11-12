import type { MedicalInputs } from "../engine/medical";
import { COMMON_CONTENT, COMMON_FAQ, COMMON_OBJECTIONS, type ModuleContent } from "./common";
import type { Localised } from "./localised";

const BILL_SOURCE = "[source + date, e.g. hospital estimate or published figure]";

/**
 * Bill amounts and inflation are PLACEHOLDERS, kept from the design only so the
 * calculator is not empty. They are not facts: the agent must replace the amount
 * and fill in the source before showing a client.
 */
export const MEDICAL_DEFAULT_INPUTS: MedicalInputs = {
  nick: "Nurul",
  work: "employed",
  company: 20000,
  savings: 10000,
  scenario: 7,
  monthlySave: 500,
  cardCost: 300,
  inflation: 15,
  inflationSource: "[source for medical inflation rate]",
  bills: [
    { label: "Heart attack, 2 stents", amount: 60000, source: BILL_SOURCE },
    { label: "Stroke, treatment & rehab", amount: 75000, source: BILL_SOURCE },
    { label: "Heart bypass", amount: 120000, source: BILL_SOURCE },
    { label: "Kidney transplant", amount: 150000, source: BILL_SOURCE },
    { label: "Accident with ICU stay", amount: 165000, source: BILL_SOURCE },
    { label: "Open-heart / valve surgery", amount: 200000, source: BILL_SOURCE },
    { label: "Leukaemia, bone marrow transplant", amount: 300000, source: BILL_SOURCE },
    { label: "Breast cancer, full treatment", amount: 395000, source: BILL_SOURCE },
    { label: "Liver transplant", amount: 500000, source: BILL_SOURCE },
  ],
  checked: { w0: true, l0: true },
};

/** Step 2 price table rows. The plan name comes from the organisation settings. */
export const MEDICAL_PLAN_ROWS = [
  { suffix: "[profile]" },
  { suffix: "+ riders · [profile]" },
  { suffix: "higher tier · [profile]" },
  { suffix: "higher tier + riders · [profile]" },
];

export const MEDICAL_CLAIM_STEPS = [
  { title: "Show card & IC", desc: "At the panel hospital admission counter" },
  { title: "Hospital requests a GL", desc: "A guarantee letter (GL) is sent to the operator" },
  { title: "You are treated", desc: "Focus on recovery, with no large deposit" },
  { title: "Bill paid directly", desc: "You pay only a small portion, for example the deductible" },
];

export const MEDICAL_TILES = [
  { t: "Room & board", d: "Daily room limit by plan" },
  { t: "ICU / CCU", d: "Intensive care on actual charges" },
  { t: "Surgery", d: "Surgeon, anaesthetist, operating theatre" },
  { t: "Medicine & tests", d: "MRI, CT scan, lab, ward medicine" },
  { t: "Cancer & dialysis", d: "Including outpatient treatment, if the plan includes it" },
  { t: "Other outpatient care", d: "Depends on the plan; check the benefit schedule" },
];

export const MEDICAL_COMPARE = [
  { k: "When you resign / retire", a: "Ends", b: "Yours, goes wherever you go" },
  { k: "Annual limit", a: "[check the employer's scheme]", b: "Depends on the plan; see the PDS" },
  { k: "Lifetime limit", a: "Set by the employer", b: "Per plan; see the PDS" },
  { k: "Spouse & children", a: "Often not covered", b: "Can be covered, subject to the plan" },
  { k: "Terms", a: "Can change when the employer changes provider", b: "Follow your own certificate" },
  { k: "Taken at an older age", a: "A new card may cost more; existing illness is excluded", b: "Taken while healthy, more is likely to be covered" },
  { k: "Coverage term", a: "While employed", b: "Up to the plan's expiry age" },
];

export const MEDICAL_GLOSSARY = [
  { t: "Room & board", d: "Daily room limit. A pricier room means you pay the difference; a cheaper room does not pay out the balance." },
  { t: "Annual limit", d: "Maximum claimable per year. Some plans add extra limits after certain diagnoses." },
  { t: "Lifetime limit", d: "Maximum over the life of the plan." },
  { t: "Deductible (per disability)", d: "You pay the first amount of each disability; some items may be exempt. Check the certificate." },
  { t: "Deductible (per year)", d: "You pay the first amount of eligible claims each year, then the plan pays up to the limit." },
  { t: "Co-payment", d: "On some plans, claims above a level are shared between you and the operator. See the certificate." },
  { t: "Waiting period", d: "Accidents are often covered earlier than illness, and specified illnesses can have a longer wait. [Check the plan's waiting periods in the PDS.]" },
  { t: "Pre-existing conditions", d: "Conditions that existed before joining are usually excluded or limited." },
  { t: "Cashless & GL", d: "Once the guarantee letter (GL) is approved, the panel hospital bills the operator directly, up to plan limits." },
  { t: "Step-up vs level", d: "Step-up starts lower and changes at set intervals; level starts higher but is steadier. Contributions can be revised under the certificate terms." },
  { t: "Government hospital allowance", d: "Daily cash if treated at a government hospital, if the plan includes it." },
  { t: "Tabarru'", d: "A donation contribution into the participants' shared fund." },
];

/** Plan-specific points shown beside the Step 3 checklist. */
export const MEDICAL_RISK_SPECIFIC = [
  "Pre-existing conditions are usually not covered even if the application is approved.",
  "Specified illnesses can have a longer waiting period. [Check the PDS for the days that apply.]",
  "Past hospital stays or repeated treatment are assessed closely by the underwriter.",
];

export const MEDICAL_DEFAULT_CONTENT: ModuleContent = {
  script: [
    { title: "A real case", text: "[Your claim story] Share one real case you handled, with the client's consent and no identifying details: when they joined, what happened, the bill, and how much the client paid in the end." },
    { title: "Daily risk", text: "The test we just did shows {name}'s daily risk is {level}, mainly because of: {reason}." },
    { title: "Connect it to them", text: "If it were {scenario}, the bill could be around {bill}. Company cover is {company}. The remaining {gap} would have to come from somewhere. [Source for the bill figure]" },
    { title: "The panel isn't yours", text: "A company panel can end when you change jobs, are let go or retire. An own card goes wherever you go, subject to its terms." },
    { title: "The age factor", text: "For the same plan and class, starting earlier usually means a lower monthly contribution, and you join while still healthy." },
    { title: "Close & disclosure", text: "I'll prepare 2 to 3 options with a clear comparison. Before we fill in the form, we declare all health history honestly so any claim can be assessed properly." },
  ],
  riskItems: [
    { label: "Existing illness", detail: "Examples: high blood pressure, diabetes, heart, asthma, cholesterol, kidney, cancer, mental health. Likely outcome: may be accepted with loading, an exclusion for that condition, postponed or declined. Declare fully with doctor's reports." },
    { label: "Smoke / vape", detail: "Examples: including vape and occasional smoking. Likely outcome: higher smoker rates. Never declare non-smoker if you smoke: a claim can be rejected." },
    { label: "High / low BMI", detail: "Examples: weight and height outside the normal range. Likely outcome: loading or postponement. Note the exact weight and height." },
    { label: "Hospitalised / surgery before", detail: "Examples: recent stays or operations such as C-section, appendix, kidney stones. Likely outcome: the underwriter may ask for hospital reports; an exclusion is possible." },
    { label: "Tests / symptoms not yet investigated", detail: "Examples: waiting for test results, a lump, chest pain, a specialist referral. Likely outcome: usually postponed until results are out. Never submit without declaring." },
    { label: "Hazardous occupation", detail: "Examples: construction, factory machinery, motorcycle delivery, offshore, security. Likely outcome: higher contribution or limits on accident benefits." },
    { label: "Risky hobbies", detail: "Examples: motorsport, scuba diving, high-altitude climbing, skydiving. Likely outcome: activity exclusion or loading." },
    { label: "Family history", detail: "Examples: parents or siblings with heart disease, cancer or stroke at a young age. Likely outcome: loading is possible." },
    { label: "Amount out of line with income", detail: "Examples: cover far above what the income level supports. Likely outcome: financial underwriting with payslips and proof of income; may be reduced or declined." },
    { label: "Age outside limits", detail: "Examples: too old or too young for the plan or rider. Likely outcome: choose another plan or a shorter term." },
    { label: "Incomplete documents / information", detail: "Examples: IC copy, address, nominee, signature, health confirmation. Likely outcome: application pending or cancelled. Check everything before submitting." },
  ],
  riskReasons: [
    { label: "Non-disclosure", detail: "Health information not declared at application. A common reason claims are rejected or certificates cancelled." },
    { label: "Waiting period", detail: "Illness within the waiting period of the plan. [Check the days in the PDS.] Accidents are often covered earlier." },
    { label: "Exclusions", detail: "Pre-existing conditions, cosmetic treatment, self-inflicted injury, drugs or alcohol, excluded activities." },
    { label: "Certificate lapsed", detail: "Contributions overdue past the grace period can end the cover. Set up auto-debit." },
    { label: "Doesn’t meet the definition", detail: "Specific benefits follow the certificate’s clinical definitions, not the name of the illness." },
    { label: "Incomplete claim documents", detail: "Medical reports, bills, GL forms or proof of the event are missing." },
  ],
  objections: [
    { q: "I’m young and healthy, why now?", a: "This is when the contribution is usually lowest and your health record is clean. After a diagnosis, that condition may be excluded or the application declined." },
    { q: "Government hospitals are cheap, right?", a: "They are good, but you can’t choose your doctor or timing, and there can be waiting lists. If you still choose government care, some plans pay a daily cash allowance. Check the PDS." },
    { q: "My company already has a panel.", a: "Panel limits depend on the employer’s scheme and end when you leave the job. Your own card complements the company benefit. [Check the company panel’s actual limit.]" },
    { q: "Can the contribution go up?", a: "Yes, contributions can be revised under the certificate terms. The operator notifies participants before a change takes effect; check the notice period in the certificate." },
    { q: "If I never claim, is it wasted?", a: "Your tabarru’ helps other participants. Some plans also have a cash value account; check the PDS for how it works. It is not guaranteed." },
    { q: "Can I use it from day one?", a: "Accidents are often covered earlier than illness, and specified illnesses can have a longer waiting period. Don’t wait until symptoms appear. [Check the waiting periods in the PDS.]" },
    { q: "Hospital bills aren’t that high.", a: "The scenario figures on screen are placeholders with a source. Let’s use a source we agreed on and check it against your own hospital’s estimate." },
    ...COMMON_OBJECTIONS.flatMap((g) => g.items),
  ],
  faq: [
    { q: "What happens at the hospital?", a: "Show card & IC, the hospital requests a GL, you are treated without a large deposit, and you pay a small portion such as the deductible and items not covered." },
    { q: "What if the room costs more than my limit?", a: "You pay the difference. If the room is cheaper, the balance is not paid out." },
    { q: "Are pre-existing conditions covered?", a: "Usually not. Declare honestly; if information is hidden, a claim can be rejected or the certificate terminated." },
    { q: "Can I cancel after signing up?", a: "There is a free-look period after you receive the certificate. [Check the number of days and the refund terms in the PDS.]" },
    { q: "Can I use it for outpatient visits?", a: "Depends on the plan. Check the benefit schedule in the PDS." },
    ...COMMON_FAQ,
  ],
};

/**
 * Bahasa Malaysia content, parallel to MEDICAL_DEFAULT_CONTENT: same number of items in the
 * same order. Risk items and objections resolve to the English label/question as their key
 * (see settings.ts), so ticks survive a language switch. Wording follows i18n/GLOSSARY.md;
 * compliance-sensitive lines are in design/financial-storyboard/BM-REVIEW-medical.md.
 */
export const MEDICAL_CONTENT_BM: ModuleContent = {
  script: [
    { title: "Kes sebenar", text: "[Kisah tuntutan anda] Kongsikan satu kes sebenar yang pernah anda uruskan, dengan persetujuan prospek dan tanpa butiran yang mengenal pasti: bila mereka menyertai, apa yang berlaku, jumlah bil, dan berapa yang akhirnya dibayar oleh prospek." },
    { title: "Risiko harian", text: "Ujian yang kita buat tadi menunjukkan risiko harian {name} ialah {level}, terutamanya disebabkan oleh: {reason}." },
    { title: "Kaitkan dengan mereka", text: "Jika ia {scenario}, bil boleh mencecah sekitar {bill}. Perlindungan syarikat ialah {company}. Baki {gap} perlu dicari dari suatu tempat. [Sumber untuk angka bil]" },
    { title: "Panel itu bukan milik anda", text: "Panel syarikat boleh tamat apabila anda bertukar kerja, diberhentikan atau bersara. Kad sendiri dibawa ke mana sahaja anda pergi, tertakluk kepada termanya." },
    { title: "Faktor umur", text: "Bagi pelan dan kelas yang sama, bermula lebih awal biasanya bermakna caruman bulanan lebih rendah, dan anda menyertai ketika masih sihat." },
    { title: "Penutup & pendedahan", text: "Saya akan sediakan 2 hingga 3 pilihan dengan perbandingan yang jelas. Sebelum kita mengisi borang, kita dedahkan semua sejarah kesihatan dengan jujur supaya sebarang tuntutan dapat dinilai dengan betul." },
  ],
  riskItems: [
    { label: "Penyakit sedia ada", detail: "Contoh: darah tinggi, kencing manis, jantung, asma, kolesterol, buah pinggang, kanser, kesihatan mental. Kemungkinan hasil: mungkin diterima dengan caruman tambahan (loading), pengecualian bagi keadaan itu, ditangguhkan atau ditolak. Dedahkan sepenuhnya bersama laporan doktor." },
    { label: "Merokok / vape", detail: "Contoh: termasuk vape dan merokok sekali-sekala. Kemungkinan hasil: kadar perokok yang lebih tinggi. Jangan sekali-kali mengisytiharkan bukan perokok jika anda merokok: tuntutan boleh ditolak." },
    { label: "BMI tinggi / rendah", detail: "Contoh: berat dan tinggi di luar julat normal. Kemungkinan hasil: caruman tambahan (loading) atau penangguhan. Catat berat dan tinggi yang tepat." },
    { label: "Pernah dimasukkan ke hospital / menjalani pembedahan", detail: "Contoh: kemasukan atau pembedahan baru-baru ini seperti bedah caesarean, apendiks, batu karang. Kemungkinan hasil: penilai risiko (underwriter) mungkin meminta laporan hospital; pengecualian adalah mungkin." },
    { label: "Ujian / simptom yang belum disiasat", detail: "Contoh: menunggu keputusan ujian, ketulan, sakit dada, rujukan pakar. Kemungkinan hasil: biasanya ditangguhkan sehingga keputusan diperoleh. Jangan hantar tanpa mendedahkannya." },
    { label: "Pekerjaan berbahaya", detail: "Contoh: pembinaan, jentera kilang, penghantaran dengan motosikal, luar pesisir, pengawal keselamatan. Kemungkinan hasil: caruman lebih tinggi atau had pada manfaat kemalangan." },
    { label: "Hobi berisiko", detail: "Contoh: lumba kereta/motosikal, menyelam skuba, mendaki gunung tinggi, terjun udara. Kemungkinan hasil: pengecualian aktiviti atau caruman tambahan (loading)." },
    { label: "Sejarah keluarga", detail: "Contoh: ibu bapa atau adik-beradik yang menghidap penyakit jantung, kanser atau strok pada usia muda. Kemungkinan hasil: caruman tambahan (loading) adalah mungkin." },
    { label: "Jumlah tidak setara dengan pendapatan", detail: "Contoh: perlindungan yang jauh melebihi apa yang disokong oleh tahap pendapatan. Kemungkinan hasil: penilaian risiko (underwriting) kewangan dengan slip gaji dan bukti pendapatan; mungkin dikurangkan atau ditolak." },
    { label: "Umur di luar had", detail: "Contoh: terlalu tua atau terlalu muda untuk pelan atau rider. Kemungkinan hasil: pilih pelan lain atau tempoh yang lebih pendek." },
    { label: "Dokumen / maklumat tidak lengkap", detail: "Contoh: salinan IC, alamat, penama, tandatangan, pengesahan kesihatan. Kemungkinan hasil: permohonan tertangguh atau dibatalkan. Semak semuanya sebelum menghantar." },
  ],
  riskReasons: [
    { label: "Tidak mendedahkan maklumat", detail: "Maklumat kesihatan tidak diisytiharkan semasa permohonan. Sebab biasa tuntutan ditolak atau sijil dibatalkan." },
    { label: "Tempoh menunggu", detail: "Penyakit dalam tempoh menunggu pelan. [Semak bilangan hari dalam PDS.] Kemalangan selalunya dilindungi lebih awal." },
    { label: "Pengecualian", detail: "Keadaan sedia ada, rawatan kosmetik, kecederaan yang disengajakan sendiri, dadah atau alkohol, aktiviti yang dikecualikan." },
    { label: "Sijil luput", detail: "Caruman tertunggak melepasi tempoh bertoleransi (grace period) boleh menamatkan perlindungan. Sediakan auto-debit." },
    { label: "Tidak menepati takrifan", detail: "Manfaat tertentu mengikut takrifan klinikal dalam sijil, bukan nama penyakit." },
    { label: "Dokumen tuntutan tidak lengkap", detail: "Laporan perubatan, bil, borang GL atau bukti kejadian tiada." },
  ],
  objections: [
    { q: "Saya masih muda dan sihat, kenapa sekarang?", a: "Inilah masanya caruman biasanya paling rendah dan rekod kesihatan anda bersih. Selepas diagnosis, keadaan itu mungkin dikecualikan atau permohonan ditolak." },
    { q: "Hospital kerajaan murah, kan?", a: "Ia bagus, tetapi anda tidak boleh memilih doktor atau masa, dan mungkin ada senarai menunggu. Jika anda tetap memilih rawatan kerajaan, sesetengah pelan membayar elaun tunai harian. Semak PDS." },
    { q: "Syarikat saya sudah ada panel.", a: "Had panel bergantung pada skim majikan dan tamat apabila anda meninggalkan pekerjaan. Kad sendiri melengkapi manfaat syarikat. [Semak had sebenar panel syarikat.]" },
    { q: "Bolehkah caruman naik?", a: "Ya, caruman boleh disemak semula mengikut terma sijil. Pengendali memaklumkan peserta sebelum perubahan berkuat kuasa; semak tempoh notis dalam sijil." },
    { q: "Kalau saya tak pernah tuntut, adakah sia-sia?", a: "Tabarru’ anda membantu peserta lain. Sesetengah pelan juga mempunyai akaun nilai tunai; semak PDS tentang cara ia berfungsi. Ia tidak dijamin." },
    { q: "Bolehkah saya guna dari hari pertama?", a: "Kemalangan selalunya dilindungi lebih awal daripada penyakit, dan penyakit tertentu boleh mempunyai tempoh menunggu yang lebih lama. Jangan tunggu sehingga simptom muncul. [Semak tempoh menunggu dalam PDS.]" },
    { q: "Bil hospital tidaklah setinggi itu.", a: "Angka senario di skrin ialah contoh dengan sumber. Mari kita guna sumber yang kita sepakati dan semak dengan anggaran hospital anda sendiri." },
    ...COMMON_CONTENT.bm.objections.flatMap((g) => g.items),
  ],
  faq: [
    { q: "Apa yang berlaku di hospital?", a: "Tunjukkan kad & IC, hospital memohon GL, anda dirawat tanpa deposit besar, dan anda membayar sebahagian kecil seperti deductible dan item yang tidak dilindungi." },
    { q: "Bagaimana jika bilik lebih mahal daripada had saya?", a: "Anda membayar perbezaannya. Jika bilik lebih murah, baki tidak dibayar." },
    { q: "Adakah keadaan sedia ada dilindungi?", a: "Biasanya tidak. Dedahkan dengan jujur; jika maklumat disembunyikan, tuntutan boleh ditolak atau sijil ditamatkan." },
    { q: "Bolehkah saya batalkan selepas mendaftar?", a: "Ada tempoh free-look selepas anda menerima sijil. [Semak bilangan hari dan terma bayaran balik dalam PDS.]" },
    { q: "Bolehkah saya guna untuk lawatan pesakit luar?", a: "Bergantung pada pelan. Semak jadual manfaat dalam PDS." },
    ...COMMON_CONTENT.bm.faq,
  ],
};
export const MEDICAL_CONTENT: Localised<ModuleContent> = {
  en: MEDICAL_DEFAULT_CONTENT,
  bm: MEDICAL_CONTENT_BM,
};
