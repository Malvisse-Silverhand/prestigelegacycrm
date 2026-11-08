import type { HibahInputs } from "../engine/hibah";
import { COMMON_CONTENT, COMMON_FAQ, COMMON_OBJECTIONS, COMMON_RISK_REASONS, DEFAULT_PLAN_NAMES, type ModuleContent } from "./common";
import type { Localised } from "./localised";

/** Design defaults from 02-Main.src.html. Produces need RM720,806 / have RM175,000 / gap RM545,806. */
export const HIBAH_DEFAULT_INPUTS: HibahInputs = {
  nick: "Aiman",
  age: 34,
  scenario: "death",
  income: 6000,
  method: "replace",
  replace: 80, // Default: replace 80%
  other: 0,
  years: 5,
  inflation: 3,
  eFood: 1500,
  eUtil: 400,
  eSchool: 800,
  eTrans: 600,
  eRent: 0,
  eOther: 500,
  home: 320000,
  homeCov: "unsure",
  homePart: 0,
  car: 60000,
  carCov: "covered",
  carPart: 0,
  otherDebt: 12000,
  edu: 60000,
  emergency: 15000,
  funeral: 8000,
  savings: 25000,
  existing: 150000,
};

export const HIBAH_DEFAULT_PLAN = {
  name: DEFAULT_PLAN_NAMES.hibah,
  base: 350000,
  /** Benefit multiples of the base amount. Check the PDS. */
  mults: [1, 0, 0, 0, 0],
  multLabels: [
    "Death",
    "Accidental death",
    "Accidental death · public transport",
    "Accidental death · overseas",
    "Accidental death · natural disaster",
  ],
};

export const HIBAH_DEFAULT_CONTENT: ModuleContent = {
  script: [
    { title: "Open", text: "{name}, we work hard every day, and we also leave something behind. If you were gone last night, who would carry on paying for the house, the kitchen and the children’s school today?" },
    { title: "Show the numbers", text: "From what we just calculated, your family would need {need}. What is in place today is {have}. The gap is {gap}." },
    { title: "Explain hibah", text: "With a conditional hibah nomination, the death benefit is paid to the beneficiary you name, subject to the certificate and a valid nomination. An executor (wasi) only administers the estate." },
    { title: "Show the plan", text: "As an example, a base amount of {base} can pay a multiple for accidental death, depending on the plan. I’ll show you the exact figures from the official illustration." },
    { title: "Close", text: "Let’s talk it through, understand it first, and choose what fits your budget. Could I prepare an illustration for around {gap}? I’ll need your date of birth, occupation and smoking status." },
  ],
  riskItems: [
    { label: "Existing illness", detail: "e.g. diabetes, high blood pressure, asthma. May lead to extra contribution (loading), an exclusion or postponement. Prepare recent reports." },
    { label: "Smoke / vape", detail: "Smoker rates may apply. Some operators run a nicotine test. [Check the plan rules on how long since quitting counts.]" },
    { label: "High / low BMI", detail: "BMI outside the normal range may trigger loading or a medical check." },
    { label: "Hospitalised / surgery before", detail: "Declare dates, diagnosis and outcome. Discharge summaries speed up underwriting." },
    { label: "Tests / symptoms not yet investigated", detail: "Pending tests usually mean postponement until results are available. Apply after the results." },
    { label: "Hazardous occupation", detail: "Occupation class affects acceptance and contribution; some roles may be declined or excluded." },
    { label: "Risky hobbies", detail: "e.g. diving, motor racing, mountaineering. May lead to an activity exclusion." },
    { label: "Family history", detail: "Early heart disease, cancer or hereditary illness among parents or siblings may be considered." },
    { label: "Amount out of line with income", detail: "Cover much higher than income can justify may trigger financial underwriting and proof of income." },
    { label: "Age outside limits", detail: "Check the plan’s entry age and coverage term before quoting." },
    { label: "Incomplete documents / information", detail: "Missing details slow down or stop the application. Use the checklist from Step 2." },
  ],
  riskReasons: COMMON_RISK_REASONS,
  objections: [
    { q: "I already have EPF / ASB.", a: "That’s a good foundation. EPF is mainly for retirement and goes through its own nomination; ASB is savings that may take time to release. Compare the balance with the family-support figure from Step 1." },
    { q: "It’s expensive.", a: "Let’s start from the budget you’re comfortable with. Protection that fits the budget today is better than none, and it can be increased as income grows." },
    { q: "I’m still young, maybe later.", a: "Terms depend on age and health when you apply, so earlier is usually easier. The family’s needs already exist today." },
    { q: "My wife works, she can manage.", a: "Her income helps, and we already counted it as ongoing support. The gap figure is what is still left after her contribution." },
    { q: "My home loan already has MRTT.", a: "Good, then the loan is addressed. MRTT only clears the loan; the family still needs money for daily living, school and other debts." },
    ...COMMON_OBJECTIONS.flatMap((g) => g.items),
  ],
  faq: [
    { q: "Is hibah takaful the same as a medical card?", a: "No. Hibah takaful pays a lump sum to your beneficiaries on death (and TPD if included). A medical card pays hospital bills while you are alive." },
    { q: "Is this hibah subject to faraid?", a: "With a valid conditional hibah nomination, the benefit is paid to the beneficiary you name, subject to the certificate terms. I’ll show you the operator’s exact wording." },
    { q: "Is critical illness included?", a: "It depends on the plan and any rider added. Check the Product Disclosure Sheet before assuming it is covered." },
    ...COMMON_FAQ,
  ],
};

/** Benefit-multiple labels in Bahasa Malaysia (same order as HIBAH_DEFAULT_PLAN.multLabels). */
export const HIBAH_MULT_LABELS_BM = [
  "Kematian",
  "Kematian akibat kemalangan",
  "Kematian akibat kemalangan · pengangkutan awam",
  "Kematian akibat kemalangan · luar negara",
  "Kematian akibat kemalangan · bencana alam",
];

export const HIBAH_MULT_LABELS: Localised<string[]> = {
  en: HIBAH_DEFAULT_PLAN.multLabels,
  bm: HIBAH_MULT_LABELS_BM,
};

/**
 * Hibah content in Bahasa Malaysia. Parallel to HIBAH_DEFAULT_CONTENT: same
 * number of items in the same order (ticks and the raised log are stored by
 * the English label / question). Compliance-sensitive items are listed in
 * design/financial-storyboard/BM-REVIEW.md.
 */
export const HIBAH_CONTENT_BM: ModuleContent = {
  script: [
    { title: "Pembukaan", text: "{name}, kita bekerja keras setiap hari, dan kita juga mahu meninggalkan sesuatu untuk keluarga. Jika anda tiada semalam, siapa yang akan terus menanggung rumah, dapur dan persekolahan anak-anak hari ini?" },
    { title: "Tunjuk angka", text: "Daripada pengiraan tadi, keluarga anda memerlukan {need}. Yang sudah ada hari ini ialah {have}. Jurangnya ialah {gap}." },
    { title: "Terangkan hibah", text: "Dengan penamaan hibah bersyarat, manfaat kematian dibayar kepada penerima yang anda namakan, tertakluk kepada sijil dan penamaan yang sah. Wasi (pelaksana) hanya mentadbir harta pusaka." },
    { title: "Tunjuk pelan", text: "Sebagai contoh, jumlah asas {base} boleh membayar gandaan untuk kematian akibat kemalangan, bergantung kepada pelan. Saya akan tunjukkan angka tepat daripada ilustrasi rasmi." },
    { title: "Penutup", text: "Mari kita bincangkan, fahami dahulu, dan pilih yang sesuai dengan bajet anda. Bolehkah saya sediakan ilustrasi sekitar {gap}? Saya perlukan tarikh lahir, pekerjaan dan status merokok anda." },
  ],
  riskItems: [
    { label: "Penyakit sedia ada", detail: "cth. kencing manis, darah tinggi, asma. Mungkin menyebabkan caruman tambahan (loading), pengecualian atau penangguhan. Sediakan laporan terkini." },
    { label: "Merokok / vape", detail: "Kadar perokok mungkin terpakai. Sesetengah pengendali menjalankan ujian nikotin. [Semak peraturan pelan tentang tempoh sejak berhenti merokok yang diambil kira.]" },
    { label: "BMI tinggi / rendah", detail: "BMI di luar julat normal boleh mencetuskan caruman tambahan (loading) atau pemeriksaan perubatan." },
    { label: "Pernah dimasukkan ke hospital / menjalani pembedahan", detail: "Nyatakan tarikh, diagnosis dan hasilnya. Ringkasan discaj mempercepat penilaian risiko (underwriting)." },
    { label: "Ujian / simptom yang belum disiasat", detail: "Ujian yang belum selesai biasanya bermakna penangguhan sehingga keputusan diperoleh. Mohon selepas keputusan diterima." },
    { label: "Pekerjaan berisiko tinggi", detail: "Kelas pekerjaan mempengaruhi penerimaan dan caruman; sesetengah pekerjaan mungkin ditolak atau dikecualikan." },
    { label: "Hobi berisiko", detail: "cth. menyelam, lumba kereta, mendaki gunung. Mungkin menyebabkan pengecualian aktiviti." },
    { label: "Sejarah keluarga", detail: "Penyakit jantung awal, kanser atau penyakit keturunan dalam kalangan ibu bapa atau adik-beradik mungkin dipertimbangkan." },
    { label: "Jumlah tidak setara dengan pendapatan", detail: "Perlindungan yang jauh lebih tinggi daripada yang boleh dijustifikasikan oleh pendapatan mungkin mencetuskan penilaian risiko (underwriting) kewangan dan bukti pendapatan." },
    { label: "Umur di luar had", detail: "Semak umur kemasukan dan tempoh perlindungan pelan sebelum memberi sebut harga." },
    { label: "Dokumen / maklumat tidak lengkap", detail: "Maklumat yang tidak lengkap melambatkan atau menghentikan permohonan. Gunakan senarai semak daripada Langkah 2." },
  ],
  riskReasons: COMMON_CONTENT.bm.riskReasons,
  objections: [
    { q: "Saya sudah ada KWSP / ASB.", a: "Itu asas yang baik. KWSP terutamanya untuk persaraan dan melalui penamaannya sendiri; ASB ialah simpanan yang mungkin mengambil masa untuk dikeluarkan. Bandingkan bakinya dengan angka sokongan keluarga daripada Langkah 1." },
    { q: "Mahal.", a: "Mari kita mulakan dengan bajet yang anda selesa. Perlindungan yang sesuai dengan bajet hari ini lebih baik daripada tiada, dan ia boleh ditambah apabila pendapatan meningkat." },
    { q: "Saya masih muda, mungkin nanti.", a: "Terma bergantung pada umur dan kesihatan semasa anda memohon, jadi lebih awal biasanya lebih mudah. Keperluan keluarga sudah pun wujud hari ini." },
    { q: "Isteri saya bekerja, dia boleh uruskan.", a: "Pendapatannya membantu, dan kita sudah mengiranya sebagai sokongan berterusan. Angka jurang ialah apa yang masih berbaki selepas sumbangannya." },
    { q: "Pinjaman rumah saya sudah ada MRTT.", a: "Bagus, jadi pinjaman itu sudah ditangani. MRTT hanya melunaskan pinjaman; keluarga masih memerlukan wang untuk sara hidup harian, persekolahan dan hutang lain." },
    ...COMMON_CONTENT.bm.objections.flatMap((g) => g.items),
  ],
  faq: [
    { q: "Adakah hibah takaful sama dengan kad perubatan?", a: "Tidak. Hibah takaful membayar sejumlah wang sekaligus kepada penerima anda apabila berlaku kematian (dan TPD jika disertakan). Kad perubatan membayar bil hospital semasa anda masih hidup." },
    { q: "Adakah hibah ini tertakluk kepada faraid?", a: "Dengan penamaan hibah bersyarat yang sah, manfaat dibayar kepada penerima yang anda namakan, tertakluk kepada terma sijil. Saya akan tunjukkan perkataan tepat daripada pengendali." },
    { q: "Adakah penyakit kritikal termasuk?", a: "Ia bergantung pada pelan dan sebarang rider yang ditambah. Semak Helaian Pendedahan Produk sebelum menganggap ia dilindungi." },
    ...COMMON_CONTENT.bm.faq,
  ],
};

export const HIBAH_CONTENT: Localised<ModuleContent> = {
  en: HIBAH_DEFAULT_CONTENT,
  bm: HIBAH_CONTENT_BM,
};
