// Every word the prospect can see in a storyboard, in Bahasa Melayu and
// English. The session carries its own language (storyboard_sessions.lang), so
// the agent can present in English to one prospect and BM to the next without
// touching the rest of the CRM, which stays in English.
import type { HibahExpenseKey, LoanCover } from "./hibah";
import type { MedicalBillKey, MedicalRiskKey, RiskLevel } from "./medical";
import type { CiCommitment, CiSituation } from "./ci";

export type Lang = "bm" | "en";

type Dict = {
  modules: Record<"hibah" | "medical" | "ci", { name: string; tagline: string }>;
  scenes: { story: string; numbers: string; gap: string; solution: string; next: string };
  common: {
    rm: string;
    need: string;
    have: string;
    gap: string;
    covered: string;
    notes: string;
    notesHint: string;
    assumptions: string;
    disclaimer: string;
    practice: string;
    present: string;
    exitPresent: string;
    saved: string;
    saving: string;
    years: string;
    months: string;
  };
  profile: {
    title: string;
    hint: string;
    nickname: string;
    age: string;
    gender: string;
    male: string;
    female: string;
    marital: string;
    maritalOptions: Record<"single" | "married" | "single_parent" | "widowed", string>;
    occupation: string;
    occupationClass: string;
    smoker: string;
    smokerOptions: Record<"no" | "yes" | "quit", string>;
    dependants: string;
    budget: string;
    budgetOptions: Record<"discuss" | "lt150" | "150_300" | "300_500" | "gt500", string>;
  };
  hibah: {
    question: (name: string) => string;
    intro: string;
    groups: { family: string; monthly: string; debts: string; oneOff: string; existing: string };
    scenario: string;
    death: string;
    tpd: string;
    netIncome: string;
    supportYears: string;
    inflation: string;
    method: string;
    methodIncome: string;
    methodItemised: string;
    replacePct: string;
    otherContribution: string;
    otherContributionHint: string;
    tpdCareCost: string;
    expenses: Record<HibahExpenseKey, string>;
    houseLoan: string;
    carLoan: string;
    loanCover: string;
    loanCovered: string;
    cover: Record<LoanCover, string>;
    otherDebt: string;
    educationFund: string;
    emergencyFund: string;
    funeralCost: string;
    savings: string;
    existingBenefit: string;
    breakdown: { support: string; debt: string; oneOff: string };
    yearlyTitle: string;
    assumptions: string[];
  };
  medical: {
    riskQuestion: string;
    riskIntro: string;
    gapQuestion: string;
    groups: Record<"work" | "lifestyle" | "travel" | "health", string>;
    risks: Record<MedicalRiskKey, string>;
    level: Record<RiskLevel, string>;
    levelLine: Record<RiskLevel, string>;
    score: string;
    topReason: string;
    noReason: string;
    employment: string;
    employmentOptions: Record<"salaried" | "self_employed" | "not_working", string>;
    companyCover: string;
    savings: string;
    bill: string;
    bills: Record<MedicalBillKey, string>;
    monthlySaving: string;
    ownCard: string;
    ownCardOptions: { 300: string; 500: string };
    whoPays: string;
    company: string;
    ownSavings: string;
    billIn5: string;
    yearsToSave: (monthly: string, years: number | null) => string;
    ownCardYear: string;
    assumptions: string[];
  };
  ci: {
    hook: string;
    question: (name: string) => string;
    intro: string;
    groups: { commitments: string; situations: string; income: string; costs: string; existing: string };
    commitments: Record<CiCommitment, string>;
    situations: Record<CiSituation, string>;
    monthlyIncome: string;
    monthlyCommitment: string;
    replacePct: string;
    recoveryMonths: string;
    rehabCost: string;
    emergencyFund: string;
    savings: string;
    employerCi: string;
    existingCi: string;
    cashNote: string;
    gapTitle: string;
    monthlyNeed: string;
    runway: string;
    extraCosts: string;
    runwayTitle: string;
    monthsLast: string;
    monthsNeeded: string;
    assumptions: string[];
  };
  analytics: {
    title: string;
    coveredShare: string;
    gapPerDependant: string;
    runway: string;
    monthlyToClose: string;
    sensitivity: string;
    sensitivityIncome: string;
    riskScore: string;
  };
  solution: { talkTrack: string; objections: string; underwriting: string; underwritingHint: string };
  underwriting: {
    flags: Record<UnderwritingFlag, string>;
    level: Record<RiskLevel, string>;
    levelLine: Record<RiskLevel, string>;
    hibahNote: string;
    medicalNote: string;
    ciNote: string;
    declare: string;
  };
  next: {
    title: string;
    copyWa: string;
    copied: string;
    sendWa: string;
    preview: string;
    markPresented: string;
    presented: string;
    movedToAppointment: string;
    attachLead: string;
    attach: string;
    createQuote: string;
    target: string;
    report: string;
    quotesSince: string;
    noLead: string;
  };
};

export const UNDERWRITING_FLAGS = [
  "existing_condition",
  "smoker",
  "bmi",
  "admitted_surgery",
  "pending_tests",
  "risky_job",
  "risky_hobby",
  "family_history",
  "sum_vs_income",
  "age_limit",
  "missing_docs",
] as const;
export type UnderwritingFlag = (typeof UNDERWRITING_FLAGS)[number];

export function underwritingLevel(count: number): RiskLevel {
  if (count >= 3) return "high";
  if (count >= 1) return "medium";
  return "low";
}

const bm: Dict = {
  modules: {
    hibah: { name: "Hibah", tagline: "Bekal keluarga bila pencari nafkah tiada" },
    medical: { name: "Medical Card", tagline: "Bil hospital tanpa kacau simpanan" },
    ci: { name: "Penyakit Kritikal", tagline: "Tunai untuk hidup sementara pulih" },
  },
  scenes: { story: "Kisah", numbers: "Angka", gap: "Jurang", solution: "Penyelesaian", next: "Seterusnya" },
  common: {
    rm: "RM",
    need: "Perlu",
    have: "Ada",
    gap: "Jurang",
    covered: "sudah tersedia",
    notes: "Nota perbualan",
    notesHint: "Apa yang prospek kongsi, kebimbangan, keutamaan.",
    assumptions: "Cara kiraan & andaian",
    disclaimer:
      "Ilustrasi perbincangan sahaja, bukan sebut harga, kontrak atau nasihat kewangan. Manfaat sebenar tertakluk kepada PDS, sijil dan pengunderaitan pengendali takaful.",
    practice: "Sesi latihan",
    present: "Mod present",
    exitPresent: "Keluar",
    saved: "Disimpan",
    saving: "Menyimpan…",
    years: "tahun",
    months: "bulan",
  },
  profile: {
    title: "Tentang prospek",
    hint: "Diisi dari rekod lead. Jangan masukkan nombor IC atau butiran perubatan.",
    nickname: "Nama panggilan",
    age: "Umur",
    gender: "Jantina",
    male: "Lelaki",
    female: "Perempuan",
    marital: "Status",
    maritalOptions: { single: "Bujang", married: "Berkahwin", single_parent: "Ibu/bapa tunggal", widowed: "Duda/janda" },
    occupation: "Pekerjaan",
    occupationClass: "Kelas pekerjaan",
    smoker: "Merokok / vape",
    smokerOptions: { no: "Tidak", yes: "Ya", quit: "Berhenti < 12 bulan" },
    dependants: "Tanggungan",
    budget: "Bajet sebulan",
    budgetOptions: { discuss: "Bincang dulu", lt150: "Bawah RM150", "150_300": "RM150–300", "300_500": "RM300–500", gt500: "Lebih RM500" },
  },
  hibah: {
    question: (name) => `Berapa sebenarnya ${name} perlu tinggalkan untuk keluarga?`,
    intro:
      "Bayangkan pendapatan terhenti semalam. Hari ini dapur, sekolah anak dan ansuran rumah masih berjalan. Mari kira apa yang sudah ada, dan apa yang belum.",
    groups: {
      family: "Situasi keluarga",
      monthly: "Keperluan bulanan keluarga",
      debts: "Hutang yang perlu selesai",
      oneOff: "Kos sekali bayar & dana masa depan",
      existing: "Apa yang sudah ada",
    },
    scenario: "Jika berlaku semalam",
    death: "Saya meninggal dunia",
    tpd: "Saya hilang upaya kekal (TPD)",
    netIncome: "Pendapatan bersih sebulan",
    supportYears: "Berapa tahun keluarga perlu disokong",
    inflation: "Kenaikan kos sara hidup setahun (%)",
    method: "Cara kira keperluan bulanan",
    methodIncome: "Ganti sebahagian pendapatan",
    methodItemised: "Senarai belanja satu per satu",
    replacePct: "Peratus pendapatan diganti",
    otherContribution: "Sumbangan bulanan lain yang berterusan",
    otherContributionHint: "Contoh: pendapatan pasangan yang benar-benar menampung rumah.",
    tpdCareCost: "Kos penjaga / rawatan TPD sebulan",
    expenses: {
      utilities: "Bil elektrik, air, telefon, internet",
      groceries: "Barang dapur & makan",
      personal: "Pakaian & keperluan diri",
      schooling: "Sekolah, taska, tuisyen",
      transport: "Pengangkutan",
      parents: "Bantuan ibu bapa",
      health: "Kesihatan & perlindungan keluarga",
      rent: "Sewa rumah",
      other: "Lain-lain",
    },
    houseLoan: "Baki pinjaman rumah",
    carLoan: "Baki pinjaman kereta",
    loanCover: "Dilindungi MRTT/MLTT?",
    loanCovered: "Amaun yang dilindungi",
    cover: { unsure: "Belum pasti", full: "Ya, sepenuhnya", partial: "Sebahagian", none: "Tidak" },
    otherDebt: "Hutang lain",
    educationFund: "Dana pendidikan anak",
    emergencyFund: "Dana kecemasan / peralihan",
    funeralCost: "Kos pengurusan jenazah",
    savings: "Simpanan yang boleh digunakan",
    existingBenefit: "Manfaat takaful / insurans sedia ada",
    breakdown: { support: "Sokongan keluarga", debt: "Hutang belum dilindungi", oneOff: "Kos sekali bayar" },
    yearlyTitle: "Sokongan keluarga setiap tahun",
    assumptions: [
      "Jurang = sokongan keluarga + hutang belum dilindungi + kos sekali bayar − simpanan − manfaat sedia ada. Minimum RM0.",
      "Keperluan bulanan ialah peratus pendapatan diganti, atau jumlah senarai belanja. TPD menambah kos penjaga.",
      "Kos bulanan naik ikut kadar dipilih bermula tahun kedua. Sumbangan lain ditolak setiap tahun, minimum RM0.",
      "Hutang dan kos sekali bayar tidak dinaikkan. Pinjaman yang belum pasti dikira belum dilindungi.",
      "Tiada pulangan pelaburan diandaikan.",
    ],
  },
  medical: {
    riskQuestion: "Setinggi mana risiko harian prospek?",
    riskIntro: "Tanda apa yang berkaitan. Skor dikira terus. Ini alat kesedaran, bukan penilaian perubatan.",
    gapQuestion: "Cukupkah panel syarikat dan simpanan bila bil sebenar sampai?",
    groups: { work: "Kerja", lifestyle: "Gaya hidup", travel: "Perjalanan", health: "Kesihatan & tanggungan" },
    risks: {
      field_work: "Kerja lapangan, jualan atau penghantaran",
      heavy_industry: "Kilang, pembinaan atau mesin berat",
      gig_work: "Bekerja sendiri, gig atau kontrak tanpa panel",
      desk_work: "Kerja pejabat, lama duduk depan skrin",
      shift_work: "Kerja syif / malam",
      motorcycle: "Tunggang motosikal setiap hari",
      smoker: "Merokok atau vape",
      no_exercise: "Jarang bersenam",
      fast_food: "Kerap makan luar / makanan segera",
      short_sleep: "Tidur kurang 6 jam",
      long_drives: "Memandu jauh di lebuh raya hampir setiap hari",
      frequent_travel: "Kerap outstation atau ke luar negara",
      family_trips: "Kerap bawa keluarga berjalan jauh",
      age_40: "Umur 40 tahun ke atas",
      family_history: "Sejarah keluarga: jantung, kanser, strok, kencing manis",
      dependants: "Ada anak / ibu bapa bergantung pada saya",
      no_own_card: "Tiada medical card sendiri",
      low_emergency_fund: "Dana kecemasan kurang 6 bulan",
    },
    level: { low: "RENDAH", medium: "SEDERHANA", high: "TINGGI" },
    levelLine: {
      low: "Faktor harian rendah, tetapi kemalangan dan penyakit tidak memilih orang.",
      medium: "Risiko biasa orang bekerja. Satu kemasukan wad sudah cukup untuk menggugat simpanan.",
      high: "Banyak faktor harian yang boleh membawa ke hospital, dan kesan kewangannya besar.",
    },
    score: "Skor",
    topReason: "Faktor utama",
    noReason: "Tiada faktor ditanda",
    employment: "Status kerja",
    employmentOptions: { salaried: "Makan gaji (ada panel syarikat)", self_employed: "Bekerja sendiri / gig", not_working: "Tidak bekerja" },
    companyCover: "Baki had perubatan syarikat",
    savings: "Simpanan sanggup guna untuk hospital",
    bill: "Senario bil hospital swasta",
    bills: {
      heart_stent: "Serangan jantung, 2 stent",
      stroke: "Strok, rawatan & pemulihan",
      bypass: "Pembedahan pintasan jantung",
      kidney_transplant: "Pemindahan buah pinggang",
      road_accident_icu: "Kemalangan jalan raya + ICU",
      open_heart: "Pembedahan jantung terbuka / injap",
      leukaemia: "Leukemia, pemindahan sumsum",
      breast_cancer: "Kanser payudara, rawatan penuh",
      liver_transplant: "Pemindahan hati",
    },
    monthlySaving: "Kalau simpan sendiri, sebulan",
    ownCard: "Banding medical card sendiri",
    ownCardOptions: { 300: "Had RM200k + deduktibel, ±RM300/bulan", 500: "Tanpa had tahunan, ±RM500/bulan" },
    whoPays: "Siapa bayar bil ini?",
    company: "Panel syarikat",
    ownSavings: "Simpanan",
    billIn5: "Bil yang sama 5 tahun lagi",
    yearsToSave: (monthly, years) =>
      years === null ? "Tiada simpanan bulanan dimasukkan" : `Simpan ${monthly} sebulan: ${years} tahun untuk cukupkan jurang`,
    ownCardYear: "Medical card sendiri setahun",
    assumptions: [
      "Jurang = bil hospital − panel syarikat − simpanan digunakan. Minimum RM0.",
      "Panel syarikat dikira hanya jika makan gaji, dan hilang bila bertukar atau berhenti kerja.",
      "Inflasi kos perubatan 15% setahun: bil hari ini × 1.15⁵ ≈ ×2.01 dalam 5 tahun.",
      "Angka anggaran hujung atas. Tidak mengambil kira deduktibel, item tidak dilindungi atau keputusan tuntutan.",
    ],
  },
  ci: {
    hook: "Sakit itu ujian. Tidak bersedia itu pilihan.",
    question: (name) => `Berapa tunai ${name} perlukan untuk terus hidup sementara pulih?`,
    intro:
      "Medical card bayar hospital. Hibah untuk keluarga bila kita tiada. Tapi kalau doktor sahkan kanser, serangan jantung atau strok semalam, dan kita tak boleh kerja berbulan-bulan, siapa ganti pendapatan?",
    groups: {
      commitments: "Yang masih perlu dibayar semasa sakit",
      situations: "Situasi prospek",
      income: "Pendapatan & tempoh pemulihan",
      costs: "Kos di luar bil hospital",
      existing: "Apa yang sudah tersedia",
    },
    commitments: {
      housing: "Ansuran / sewa rumah",
      vehicle: "Pinjaman kereta / motosikal",
      utilities: "Bil elektrik, air, telefon & internet",
      groceries: "Barang dapur & makan minum",
      schooling: "Yuran sekolah, taska, pengangkutan anak",
      caregiver: "Penjaga / bantuan rumah",
      hospital_travel: "Ulang-alik hospital & parking",
      rehab: "Rawatan susulan & fisioterapi",
      business_costs: "Kos bisnes / pekerja",
      living_until_work: "Belanja hidup sehingga boleh bekerja semula",
    },
    situations: {
      main_earner: "Saya pencari nafkah utama",
      commission_income: "Pendapatan ikut jualan / komisen",
      low_emergency_fund: "Dana kecemasan kurang 6 bulan",
      high_housing: "Ansuran / sewa rumah tinggi",
      other_loans: "Ada pinjaman kenderaan / hutang lain",
      dependants: "Ada anak / tanggungan",
      spouse_depends: "Pasangan juga bergantung pada saya",
      company_cover_only: "Hanya ada perlindungan syarikat",
      unsure_existing_ci: "Tak pasti berapa CI sedia ada",
      savings_earmarked: "Simpanan sudah ada tujuan lain",
    },
    monthlyIncome: "Pendapatan sebulan",
    monthlyCommitment: "Komitmen wajib keluarga sebulan",
    replacePct: "Peratus pendapatan diganti semasa pulih",
    recoveryMonths: "Tempoh pemulihan (bulan)",
    rehabCost: "Kos pemulihan / rehab / penjaga",
    emergencyFund: "Dana kecemasan tambahan",
    savings: "Simpanan sanggup guna",
    employerCi: "Manfaat CI majikan / kumpulan",
    existingCi: "Pampasan CI sedia ada",
    cashNote: "Had medical card bukan tunai, jadi tidak dikira di sini.",
    gapTitle: "Jurang pampasan CI",
    monthlyNeed: "Keperluan sebulan",
    runway: "Tunai untuk tempoh pulih",
    extraCosts: "Kos tambahan",
    runwayTitle: "Berapa lama yang ada boleh bertahan?",
    monthsLast: "Simpanan & CI bertahan",
    monthsNeeded: "Tempoh perlu pulih",
    assumptions: [
      "Keperluan sebulan = pendapatan × peratus diganti.",
      "Jurang = keperluan sebulan × tempoh pulih + kos pemulihan + dana kecemasan − simpanan − CI majikan − CI sedia ada. Minimum RM0.",
      "Tempoh bertahan = (simpanan + CI) ÷ komitmen wajib sebulan.",
      "Hanya wang tunai dikira. Had medical card tidak termasuk.",
    ],
  },
  analytics: {
    title: "Analitik",
    coveredShare: "Bahagian sudah tersedia",
    gapPerDependant: "Jurang setiap tanggungan",
    runway: "Simpanan + manfaat bertahan",
    monthlyToClose: "Keperluan sebulan keluarga",
    sensitivity: "Bagaimana kalau…",
    sensitivityIncome: "Pendapatan berubah",
    riskScore: "Skor risiko harian",
  },
  solution: {
    talkTrack: "Jalan cerita",
    objections: "Skrip & bantahan",
    underwriting: "Semakan sebelum isi borang",
    underwritingHint: "Tanda apa yang berkaitan. Keputusan sebenar oleh underwriter.",
  },
  underwriting: {
    flags: {
      existing_condition: "Penyakit sedia ada",
      smoker: "Merokok / vape",
      bmi: "BMI terlalu tinggi / rendah",
      admitted_surgery: "Pernah masuk wad / pembedahan",
      pending_tests: "Ujian atau simptom belum disiasat",
      risky_job: "Pekerjaan berisiko",
      risky_hobby: "Hobi berisiko",
      family_history: "Sejarah penyakit keluarga",
      sum_vs_income: "Jumlah perlindungan tak sepadan pendapatan",
      age_limit: "Umur di luar had pelan",
      missing_docs: "Dokumen / maklumat belum lengkap",
    },
    level: { low: "Rendah", medium: "Sederhana", high: "Tinggi" },
    levelLine: {
      low: "Berkemungkinan diterima pada kadar standard.",
      medium: "Mungkin ada soalan tambahan, loading atau pengecualian.",
      high: "Sediakan prospek: pemeriksaan perubatan, loading atau penangguhan mungkin berlaku.",
    },
    hibahNote: "Jumlah besar mungkin perlukan pemeriksaan perubatan dan dokumen pendapatan. Pastikan penamaan hibah lengkap dan penerima dimaklumkan.",
    medicalNote: "Penyakit sedia ada biasanya dikecualikan, dan ada tempoh menunggu untuk penyakit tertentu. Isytihar semuanya.",
    ciNote: "CI biasanya ada tempoh menunggu (lazimnya 30–90 hari) dan tempoh hidup selepas diagnosis. Sejarah keluarga dan saringan lepas akan ditanya.",
    declare: "Isytihar penuh dan jujur. Satu pengecualian lebih baik daripada seluruh tuntutan ditolak.",
  },
  next: {
    title: "Langkah seterusnya",
    copyWa: "Salin ringkasan WhatsApp",
    copied: "Disalin",
    sendWa: "Hantar ke WhatsApp prospek",
    preview: "Pratonton ringkasan",
    markPresented: "Tanda sudah dibentang",
    presented: "Sudah dibentang",
    movedToAppointment: "Lead dipindahkan ke Appointment",
    attachLead: "Simpan ke lead",
    attach: "Simpan",
    createQuote: "Buka sebut harga",
    target: "sasaran",
    report: "Laporan PDF",
    quotesSince: "Sebut harga disimpan selepas sesi ini",
    noLead: "Sesi latihan: pilih lead untuk simpan ke rekod mereka.",
  },
};

const en: Dict = {
  modules: {
    hibah: { name: "Hibah", tagline: "Provision for the family if the breadwinner is gone" },
    medical: { name: "Medical Card", tagline: "Hospital bills without draining savings" },
    ci: { name: "Critical Illness", tagline: "Cash to live on while recovering" },
  },
  scenes: { story: "Story", numbers: "Numbers", gap: "Gap", solution: "Solution", next: "Next steps" },
  common: {
    rm: "RM",
    need: "Need",
    have: "Have",
    gap: "Gap",
    covered: "already in place",
    notes: "Conversation notes",
    notesHint: "What the prospect shared, worries, priorities.",
    assumptions: "How it's calculated",
    disclaimer:
      "For discussion only. Not a quotation, contract or financial advice. Actual benefits depend on the PDS, certificate and the takaful operator's underwriting.",
    practice: "Practice session",
    present: "Present mode",
    exitPresent: "Exit",
    saved: "Saved",
    saving: "Saving…",
    years: "years",
    months: "months",
  },
  profile: {
    title: "About the prospect",
    hint: "Filled from the lead record. Never enter an IC number or medical detail.",
    nickname: "Preferred name",
    age: "Age",
    gender: "Gender",
    male: "Male",
    female: "Female",
    marital: "Status",
    maritalOptions: { single: "Single", married: "Married", single_parent: "Single parent", widowed: "Widowed / divorced" },
    occupation: "Occupation",
    occupationClass: "Occupation class",
    smoker: "Smoke / vape",
    smokerOptions: { no: "No", yes: "Yes", quit: "Quit < 12 months" },
    dependants: "Dependants",
    budget: "Monthly budget",
    budgetOptions: { discuss: "Discuss first", lt150: "Under RM150", "150_300": "RM150–300", "300_500": "RM300–500", gt500: "Over RM500" },
  },
  hibah: {
    question: (name) => `How much does ${name} really need to leave the family?`,
    intro:
      "Imagine the income stopped yesterday. Today the groceries, the school fees and the house instalment still need paying. Let's see what's already in place, and what isn't.",
    groups: {
      family: "Family situation",
      monthly: "Family's monthly needs",
      debts: "Debts to settle",
      oneOff: "One-off costs & future funds",
      existing: "Already in place",
    },
    scenario: "If it happened yesterday",
    death: "I passed away",
    tpd: "I became totally & permanently disabled",
    netIncome: "Net monthly income",
    supportYears: "Years the family needs support",
    inflation: "Cost-of-living increase per year (%)",
    method: "How to estimate monthly needs",
    methodIncome: "Replace part of my income",
    methodItemised: "List expenses one by one",
    replacePct: "Share of income to replace",
    otherContribution: "Other ongoing monthly contribution",
    otherContributionHint: "E.g. a spouse's income that genuinely covers the household.",
    tpdCareCost: "Monthly carer / TPD care cost",
    expenses: {
      utilities: "Electricity, water, phone, internet",
      groceries: "Groceries & meals",
      personal: "Clothing & personal needs",
      schooling: "School, childcare, tuition",
      transport: "Transport",
      parents: "Support for parents",
      health: "Family health & protection",
      rent: "Rent",
      other: "Other",
    },
    houseLoan: "Home loan balance",
    carLoan: "Car loan balance",
    loanCover: "Covered by MRTT/MLTT?",
    loanCovered: "Amount covered",
    cover: { unsure: "Not sure", full: "Yes, fully", partial: "Partly", none: "No" },
    otherDebt: "Other debts",
    educationFund: "Children's education fund",
    emergencyFund: "Emergency / transition fund",
    funeralCost: "Funeral costs",
    savings: "Savings that can be used",
    existingBenefit: "Existing takaful / insurance benefit",
    breakdown: { support: "Family support", debt: "Uncovered debt", oneOff: "One-off costs" },
    yearlyTitle: "Family support each year",
    assumptions: [
      "Gap = family support + uncovered debt + one-off costs − savings − existing benefits. Never below RM0.",
      "Monthly need is the share of income replaced, or the itemised expenses. TPD adds the carer cost.",
      "Monthly costs rise at the chosen rate from year two. Other contributions are deducted each year, never below RM0.",
      "Debts and one-off costs are not inflated. A loan marked 'not sure' counts as uncovered.",
      "No investment return is assumed.",
    ],
  },
  medical: {
    riskQuestion: "How high is the prospect's everyday risk?",
    riskIntro: "Tick what applies. The score updates instantly. An awareness tool, not a medical assessment.",
    gapQuestion: "Will the company panel and savings be enough when the real bill arrives?",
    groups: { work: "Work", lifestyle: "Lifestyle", travel: "Travel", health: "Health & dependants" },
    risks: {
      field_work: "Field work, sales or delivery",
      heavy_industry: "Factory, construction or heavy machinery",
      gig_work: "Self-employed, gig or contract with no panel",
      desk_work: "Office work, long hours at a screen",
      shift_work: "Shift / night work",
      motorcycle: "Rides a motorcycle daily",
      smoker: "Smokes or vapes",
      no_exercise: "Rarely exercises",
      fast_food: "Often eats out / fast food",
      short_sleep: "Sleeps under 6 hours",
      long_drives: "Long highway drives most days",
      frequent_travel: "Often travels outstation or abroad",
      family_trips: "Often takes the family on long trips",
      age_40: "Aged 40 or above",
      family_history: "Family history: heart, cancer, stroke, diabetes",
      dependants: "Children / parents depend on me",
      no_own_card: "No medical card of my own",
      low_emergency_fund: "Emergency fund under 6 months",
    },
    level: { low: "LOW", medium: "MODERATE", high: "HIGH" },
    levelLine: {
      low: "Few everyday risk factors, but accidents and illness don't choose.",
      medium: "Normal working-life risk. One hospital stay is enough to dent savings.",
      high: "Many everyday factors that can lead to hospital, with a large financial impact.",
    },
    score: "Score",
    topReason: "Main factor",
    noReason: "Nothing ticked",
    employment: "Employment",
    employmentOptions: { salaried: "Salaried (company panel)", self_employed: "Self-employed / gig", not_working: "Not working" },
    companyCover: "Remaining company medical limit",
    savings: "Savings willing to use for hospital",
    bill: "Private hospital bill scenario",
    bills: {
      heart_stent: "Heart attack, 2 stents",
      stroke: "Stroke, treatment & rehab",
      bypass: "Heart bypass surgery",
      kidney_transplant: "Kidney transplant",
      road_accident_icu: "Road accident + ICU",
      open_heart: "Open-heart / valve surgery",
      leukaemia: "Leukaemia, bone-marrow transplant",
      breast_cancer: "Breast cancer, full treatment",
      liver_transplant: "Liver transplant",
    },
    monthlySaving: "If self-funding, saved per month",
    ownCard: "Compare an own medical card",
    ownCardOptions: { 300: "RM200k limit + deductible, ±RM300/month", 500: "No annual limit, ±RM500/month" },
    whoPays: "Who pays this bill?",
    company: "Company panel",
    ownSavings: "Savings",
    billIn5: "The same bill in 5 years",
    yearsToSave: (monthly, years) =>
      years === null ? "No monthly saving entered" : `Saving ${monthly} a month: ${years} years to cover the gap`,
    ownCardYear: "Own medical card per year",
    assumptions: [
      "Gap = hospital bill − company panel − savings used. Never below RM0.",
      "The company panel only counts while salaried, and ends on changing or leaving the job.",
      "Medical inflation of 15% a year: today's bill × 1.15⁵ ≈ ×2.01 in 5 years.",
      "Upper-end estimates. Deductibles, excluded items and claim decisions are not considered.",
    ],
  },
  ci: {
    hook: "Illness is a test. Being unprepared is a choice.",
    question: (name) => `How much cash does ${name} need to live on while recovering?`,
    intro:
      "The medical card pays the hospital. Hibah looks after the family if we're gone. But if a doctor confirmed cancer, a heart attack or a stroke yesterday, and we couldn't work for months, who replaces the income?",
    groups: {
      commitments: "Still to be paid while ill",
      situations: "The prospect's situation",
      income: "Income & recovery time",
      costs: "Costs beyond the hospital bill",
      existing: "Already in place",
    },
    commitments: {
      housing: "Home instalment / rent",
      vehicle: "Car / motorcycle loan",
      utilities: "Electricity, water, phone & internet",
      groceries: "Groceries & meals",
      schooling: "School fees, childcare, school transport",
      caregiver: "Carer / home help",
      hospital_travel: "Hospital trips & parking",
      rehab: "Follow-up treatment & physiotherapy",
      business_costs: "Business / staff costs",
      living_until_work: "Living costs until back at work",
    },
    situations: {
      main_earner: "I'm the main earner",
      commission_income: "Income depends on sales / commission",
      low_emergency_fund: "Emergency fund under 6 months",
      high_housing: "High home instalment / rent",
      other_loans: "Vehicle loan / other debts",
      dependants: "Children / dependants",
      spouse_depends: "My spouse depends on my income too",
      company_cover_only: "Only company cover",
      unsure_existing_ci: "Not sure how much CI I have",
      savings_earmarked: "Savings are set aside for something else",
    },
    monthlyIncome: "Monthly income",
    monthlyCommitment: "Family's fixed commitments per month",
    replacePct: "Share of income to replace while recovering",
    recoveryMonths: "Recovery period (months)",
    rehabCost: "Rehab / recovery / carer costs",
    emergencyFund: "Extra emergency fund",
    savings: "Savings willing to use",
    employerCi: "Employer / group CI benefit",
    existingCi: "Existing CI payout",
    cashNote: "A medical card's limit isn't cash, so it isn't counted here.",
    gapTitle: "Critical illness cash gap",
    monthlyNeed: "Monthly need",
    runway: "Cash for the recovery period",
    extraCosts: "Extra costs",
    runwayTitle: "How long would what's in place last?",
    monthsLast: "Savings & CI last",
    monthsNeeded: "Recovery takes",
    assumptions: [
      "Monthly need = income × share replaced.",
      "Gap = monthly need × recovery months + rehab costs + emergency fund − savings − employer CI − existing CI. Never below RM0.",
      "Months covered = (savings + CI) ÷ fixed monthly commitments.",
      "Only cash counts. A medical card's limit is excluded.",
    ],
  },
  analytics: {
    title: "Analytics",
    coveredShare: "Share already in place",
    gapPerDependant: "Gap per dependant",
    runway: "Savings + benefits last",
    monthlyToClose: "Family's monthly need",
    sensitivity: "What if…",
    sensitivityIncome: "Income changes",
    riskScore: "Everyday risk score",
  },
  solution: {
    talkTrack: "Talk track",
    objections: "Scripts & objections",
    underwriting: "Check before the application",
    underwritingHint: "Tick what applies. The underwriter makes the actual decision.",
  },
  underwriting: {
    flags: {
      existing_condition: "Existing medical condition",
      smoker: "Smokes / vapes",
      bmi: "BMI too high / low",
      admitted_surgery: "Past hospital admission / surgery",
      pending_tests: "Tests or symptoms not yet investigated",
      risky_job: "Hazardous occupation",
      risky_hobby: "Hazardous hobby",
      family_history: "Family medical history",
      sum_vs_income: "Cover out of line with income",
      age_limit: "Age outside plan limits",
      missing_docs: "Documents / details incomplete",
    },
    level: { low: "Low", medium: "Moderate", high: "High" },
    levelLine: {
      low: "Likely to be accepted at standard rates.",
      medium: "Expect extra questions, a loading or an exclusion.",
      high: "Prepare the prospect: a medical exam, loading or postponement is possible.",
    },
    hibahNote: "Large sums may need a medical exam and proof of income. Make sure the hibah nomination is complete and the recipients know.",
    medicalNote: "Pre-existing conditions are usually excluded, and some illnesses have waiting periods. Declare everything.",
    ciNote: "CI cover usually has a waiting period (often 30–90 days) and a survival period after diagnosis. Family history and past screenings will be asked.",
    declare: "Declare fully and honestly. One exclusion is better than a whole claim declined.",
  },
  next: {
    title: "Next steps",
    copyWa: "Copy WhatsApp summary",
    copied: "Copied",
    sendWa: "Send to prospect's WhatsApp",
    preview: "Preview summary",
    markPresented: "Mark as presented",
    presented: "Presented",
    movedToAppointment: "Lead moved to Appointment",
    attachLead: "Save to a lead",
    attach: "Save",
    createQuote: "Open quotation",
    target: "target",
    report: "PDF report",
    quotesSince: "Quotations saved since this session",
    noLead: "Practice session: pick a lead to save it to their record.",
  },
};

export const STORYBOARD_TEXT: Record<Lang, Dict> = { bm, en };

export function rm(n: number) {
  return `RM${Math.round(n).toLocaleString("en-MY")}`;
}
