import type { BusinessInputs } from "../engine/business";
import { COMMON_CONTENT, COMMON_FAQ, COMMON_OBJECTIONS, type ModuleContent } from "./common";
import type { Localised } from "./localised";

export const BUSINESS_DEFAULT_INPUTS: BusinessInputs = {
  company: "Daniel Logistics Sdn Bhd",
  entity: "sdn",
  revenue: 2400000,
  profit: 360000,
  fixed: 60000,
  reserve: 100000,
  kMethod: "profit",
  kMult: 5,
  kCount: 2,
  kps: [
    { name: "Faris / Founder", role: "Owner / Founder", salary: 120000, impact: 50, stable: "12", ci: "6", cost: 60000, succ: "none", exD: 0, exC: 0 },
    { name: "Lim / Technical lead", role: "Technical Specialist", salary: 96000, impact: 30, stable: "12", ci: "3", cost: 40000, succ: "second", exD: 0, exC: 0 },
    { name: "Key person 3", role: "Operations Head", salary: 72000, impact: 15, stable: "6", ci: "3", cost: 20000, succ: "ready", exD: 0, exC: 0 },
  ],
  valMethod: "multiple",
  valMult: 3,
  valManual: 1000000,
  pCount: 3,
  partners: [
    { name: "Faris", pct: 50, age: 42, ex: 0 },
    { name: "Lim", pct: 30, age: 39, ex: 0 },
    { name: "Siti", pct: 20, age: 35, ex: 0 },
    { name: "Partner 4", pct: 0, age: 40, ex: 0 },
    { name: "Partner 5", pct: 0, age: 40, ex: 0 },
  ],
  structure: "cross",
  agreement: "none",
  lTerm: 450000,
  lOd: 150000,
  lHp: 120000,
  lTrade: 0,
  lOther: 0,
  lInst: 18000,
  guarantor: "Faris",
  guarPct: 100,
  lCover: 0,
  eBank: 80000,
  eStock: 200000,
  eDebt: 300000,
  eInst: 8000,
  ePlan: "continue",
  eMonths: "6",
  eOpex: 10000,
  eWages: 12000,
  eFamily: 8000,
  eHibah: 0,
  eWill: "none",
};

export const BUSINESS_NEEDS = [
  { key: "keyman", label: "Keyman", sub: "The company's key people" },
  { key: "buysell", label: "Buy-sell", sub: "Buy a deceased partner's shares" },
  { key: "loan", label: "Loan", sub: "Debt & director undertakings" },
  { key: "enterprise", label: "Enterprise", sub: "Business & frozen accounts" },
] as const;
export type BusinessNeed = (typeof BUSINESS_NEEDS)[number]["key"];

export const BUSINESS_ROLES = [
  "Owner / Founder",
  "CEO / Managing Director",
  "Director",
  "Top Sales / BD",
  "Technical Specialist",
  "Operations Head",
  "Finance / Key Signatory",
  "Other",
];

export const BUSINESS_ENTITY_NOTES: Record<string, { t: string; d: string }> = {
  sdn: { t: "Sdn. Bhd.", d: "A separate legal entity. Company assets and accounts are not frozen when an owner dies, but the owner's shares become part of the estate." },
  plt: { t: "PLT / LLP", d: "A separate legal entity. A partner's interest becomes part of the estate; check the LLP agreement for exit and buy-out." },
  partner: { t: "Enterprise · Partnership", d: "Not a separate entity. Business debts are the partners' personal debts, and a deceased partner's share becomes part of the estate." },
  sole: { t: "Enterprise · Sole proprietor", d: "Owner and business are the same in law. Accounts, stock and assets can be frozen until the estate is settled, and business debt is personal." },
};

export const BUSINESS_OWNER_TABLE = [
  { need: "Keyman", owner: "Company", money: "Company: continuity" },
  { need: "Buy-sell", owner: "Partners / company / self", money: "Heirs, as the share price" },
  { need: "Loan", owner: "Director / debtor", money: "Bank, to settle the debt" },
  { need: "Enterprise", owner: "Owner", money: "Hibah beneficiary (family)" },
];

export const BUSINESS_TAX_POINTS = [
  { t: "Conditions for deducting contributions", d: "Usually the certificate should have no investment element, for example term or accident cover. Confirm with a tax adviser." },
  { t: "Owner / director / shareholder", d: "Restrictions can apply for directors with shares in a controlled company, partners and sole proprietors. Check with a tax agent." },
  { t: "Reference", d: "Ask your tax adviser to confirm the current inland revenue ruling on key-man cover and how it treats takaful products." },
];

export const BUSINESS_PLAN_TYPE_NOTE =
  "Great Eastern Takaful plans only. For Keyman, buy-sell and loans, focus on pure protection (term) from the GE range, named per the current product list. Plans with an investment element can make tax treatment unclear for company-owned certificates; confirm with a tax adviser.";

export const BUSINESS_RISK_SPECIFIC = [
  "Financial underwriting is standard: management or audited accounts, tax returns, loan statements.",
  "The Keyman amount must be justified by profit contribution or a reasonable salary multiple.",
  "Buy-sell needs a valuation basis and an agreement; partners need an insurable interest in each other.",
  "Loan cover is usually limited to the outstanding balance and may be assigned to the bank.",
  "Company-owned certificates need a board resolution and company documents (SSM forms, constitution).",
  "Each life is underwritten separately. If one partner is declined or loaded, plan an alternative so the arrangement still works.",
  "Prefer pure protection (term) for business needs; plans with an investment element complicate tax and add cost.",
];

export const BUSINESS_DEFAULT_CONTENT: ModuleContent = {
  script: [
    { group: "keyman", title: "Opening question", text: "If {name} were gone tomorrow, how long before {company} runs as well as it does today?" },
    { group: "keyman", title: "Show the numbers", text: "Based on profit contribution, the company would need about {keyman} to bridge the loss while it recovers." },
    { group: "keyman", title: "Solution", text: "Keyman takaful is owned by the company and pays the company, so it can hire, train and keep paying staff and suppliers, subject to the certificate terms." },
    { group: "keyman", title: "Close", text: "Let’s start with the person whose absence would hurt most, and review the others next quarter." },
    { group: "buysell", title: "Opening question", text: "If one of you passed away, would you be comfortable running {company} with their heirs as partners?" },
    { group: "buysell", title: "Show the numbers", text: "Together, the partners would need about {buysell} in cash to buy out a partner’s shares at today’s value." },
    { group: "buysell", title: "Solution", text: "A written buy-sell agreement plus takaful funding: the partners keep control, and the heirs receive cash at an agreed price. Check the agreement with the company’s lawyer." },
    { group: "buysell", title: "Close", text: "Shall we agree the valuation method first, then I’ll prepare the certificate matrix for each partner?" },
    { group: "loan", title: "Opening question", text: "Who gave the personal undertaking on the business loans?" },
    { group: "loan", title: "Show the numbers", text: "The unprotected amount that falls on the owner personally is about {loan}. If that person passed away, the bank can look to the estate first." },
    { group: "loan", title: "Solution", text: "Loan protection can settle the debt so the family keeps the house and savings, subject to the certificate terms." },
    { group: "loan", title: "Close", text: "Let’s list each facility and check which already has cover, then fill the gap." },
    { group: "enterprise", title: "Opening question", text: "If you weren’t here yesterday, who could withdraw money from {company}’s bank account today?" },
    { group: "enterprise", title: "Show the numbers", text: "Accounts and assets of around {frozen} may be frozen. To keep things running through the transition, the family needs about {cash} in cash." },
    { group: "enterprise", title: "Solution", text: "Hibah takaful can be paid directly to the beneficiary you name, rather than through the estate, subject to a valid nomination and the certificate terms." },
    { group: "enterprise", title: "Close", text: "Let’s start with hibah for your spouse, and arrange a will so the business can continue or be sold in an orderly way." },
  ],
  riskItems: [
    { label: "Existing illness (any life assured)", detail: "Examples: high blood pressure, diabetes, heart, asthma, cholesterol, kidney, cancer, mental health. Likely outcome: loading, exclusion, postponement or decline for that person. Declare fully with doctor’s reports." },
    { label: "Smoke / vape", detail: "Examples: including vape and occasional smoking. Likely outcome: higher smoker rates. Never declare non-smoker if you smoke: a claim can be rejected." },
    { label: "High / low BMI", detail: "Examples: weight and height outside the normal range. Likely outcome: loading or postponement." },
    { label: "Hospitalised / surgery before", detail: "Examples: recent stays or operations. Likely outcome: the underwriter may ask for hospital reports; an exclusion is possible." },
    { label: "Tests / symptoms not yet investigated", detail: "Examples: waiting for results, a specialist referral. Likely outcome: usually postponed until results are out." },
    { label: "Hazardous occupation / site work", detail: "Examples: construction sites, factory floor, logistics driving, offshore. Likely outcome: higher contribution or limits on accident benefits." },
    { label: "Risky hobbies", detail: "Examples: motorsport, scuba diving, high-altitude climbing, skydiving. Likely outcome: activity exclusion or loading." },
    { label: "Family history", detail: "Examples: parents or siblings with heart disease, cancer or stroke at a young age. Likely outcome: loading is possible." },
    { label: "Amount not justified by financials", detail: "Examples: Keyman far above profit contribution; buy-sell above a defensible valuation. Likely outcome: financial underwriting with accounts, tax returns and valuation basis; may be reduced or declined." },
    { label: "No insurable interest / ownership unclear", detail: "Examples: the certificate owner has no financial interest in the life assured. Likely outcome: declined or restructured. Match owner, payer and beneficiary to the need." },
    { label: "No board resolution / company documents", detail: "Examples: a company-owned certificate without a resolution, SSM forms or constitution. Likely outcome: application pending until documents are received." },
    { label: "Age outside limits", detail: "Examples: older partners near the plan’s maximum entry age. Likely outcome: shorter term or a different plan for that partner." },
    { label: "Incomplete documents / information", detail: "Examples: IC copy, nominee, signatures, financial statements. Likely outcome: application pending or cancelled. Check everything before submitting." },
  ],
  riskReasons: [
    { label: "Non-disclosure", detail: "Health or financial information not declared at application. A common reason claims are rejected or certificates cancelled." },
    { label: "Waiting period", detail: "Certain benefits only apply after a waiting period from the start date. [Check the PDS.]" },
    { label: "Exclusions", detail: "Pre-existing conditions, self-inflicted injury, drugs or alcohol, excluded activities." },
    { label: "Certificate lapsed", detail: "Contributions unpaid past the grace period, often when company cashflow tightens. Set up auto-debit." },
    { label: "Ownership / beneficiary mismatch", detail: "Owner, payer and beneficiary don’t match the purpose (for example Keyman paid to heirs), creating disputes." },
    { label: "No buy-sell agreement", detail: "Without a written agreement the heirs may refuse to sell, or dispute the price, even after a payout." },
    { label: "Doesn’t meet the definition", detail: "TPD or CI benefits follow the certificate’s definitions, not the name of the condition." },
    { label: "Incomplete claim documents", detail: "Death certificate, company resolutions, loan statements or claim forms missing." },
  ],
  objections: [
    { q: "My business is small, I don’t need this.", a: "Small businesses often depend most on one person. For an enterprise, the accounts and debts become the family’s problem directly." },
    { q: "My partner can take over.", a: "They can, but where does the cash come from to buy the heirs’ share? And who does two people’s work during the transition?" },
    { q: "We have a cash reserve.", a: "Good, the calculator already deducts it. The gap is what the reserve can’t cover." },
    { q: "The bank already has loan protection.", a: "Check the amount and term. Overdrafts, hire purchase and trade lines are often not covered, but may still fall on the owner personally." },
    { q: "It’s just another business cost.", a: "It’s a small, known cost set against a large, unknown one. Keyman may also be tax-deductible if it meets the conditions; confirm with your tax agent." },
    { q: "The family will sort it out later.", a: "Without an agreement and cash, “later” can mean frozen accounts, disputed share prices and a bank claim on the estate." },
    { q: "We trust each other, no need for an agreement.", a: "Trust helps today. The heirs of a partner may not share it, which is why a written agreement protects everyone." },
    ...COMMON_OBJECTIONS.flatMap((g) => g.items),
  ],
  faq: [
    { q: "Keyman vs buy-sell?", a: "Keyman replaces the company’s loss when a key person is gone. Buy-sell gives partners cash to buy the deceased owner’s shares from the heirs." },
    { q: "Who owns and pays for the certificate?", a: "Keyman: the company. Buy-sell: partners, the company, or own-life with hibah to partners. Loan: the debtor. Enterprise: the owner." },
    { q: "Is the Keyman contribution tax-deductible?", a: "It may be, if it meets the conditions in the relevant tax ruling. Confirm with a tax agent." },
    { q: "What if a partner leaves the business?", a: "The agreement should cover exit; certificates can be reassigned or surrendered per the terms." },
    { q: "Can I use my existing personal hibah?", a: "Yes, for the family need. For buy-sell and Keyman, the owner and beneficiary must match the business purpose." },
    { q: "How is the business valued?", a: "Usually a multiple of net profit for SMEs, net assets for asset-heavy businesses, or a value all partners agree on. Review it yearly." },
    ...COMMON_FAQ,
  ],
};

/**
 * Bahasa Malaysia content, parallel to BUSINESS_DEFAULT_CONTENT: same number of
 * items in the same order (a test enforces it, because ticks and the raised log
 * are stored by the English label / question). Compliance-sensitive items are
 * listed in design/financial-storyboard/BM-REVIEW-business.md.
 */
export const BUSINESS_CONTENT_BM: ModuleContent = {
  script: [
    { group: "keyman", title: "Soalan pembukaan", text: "Jika {name} tiada esok, berapa lama sebelum {company} berjalan sebaik hari ini?" },
    { group: "keyman", title: "Tunjuk angka", text: "Berdasarkan sumbangan kepada keuntungan, syarikat memerlukan sekitar {keyman} untuk menampung kerugian semasa ia pulih." },
    { group: "keyman", title: "Penyelesaian", text: "Takaful orang kunci dimiliki oleh syarikat dan dibayar kepada syarikat, jadi ia boleh mengambil pekerja, melatih dan terus membayar gaji serta pembekal, tertakluk kepada terma sijil." },
    { group: "keyman", title: "Penutup", text: "Mari kita mulakan dengan orang yang ketiadaannya paling menjejaskan, dan semak yang lain pada suku tahun depan." },
    { group: "buysell", title: "Soalan pembukaan", text: "Jika seorang daripada anda meninggal dunia, adakah anda selesa menjalankan {company} bersama waris beliau sebagai rakan kongsi?" },
    { group: "buysell", title: "Tunjuk angka", text: "Secara keseluruhan, rakan kongsi memerlukan sekitar {buysell} dalam bentuk tunai untuk membeli saham seorang rakan kongsi pada nilai hari ini." },
    { group: "buysell", title: "Penyelesaian", text: "Perjanjian beli-jual bertulis ditambah pembiayaan takaful: rakan kongsi mengekalkan kawalan, dan waris menerima wang tunai pada harga yang dipersetujui. Semak perjanjian itu dengan peguam syarikat." },
    { group: "buysell", title: "Penutup", text: "Bolehkah kita bersetuju tentang kaedah penilaian dahulu, kemudian saya sediakan matriks sijil untuk setiap rakan kongsi?" },
    { group: "loan", title: "Soalan pembukaan", text: "Siapa yang memberi komitmen peribadi sebagai penjamin bagi pinjaman perniagaan?" },
    { group: "loan", title: "Tunjuk angka", text: "Jumlah yang belum dilindungi dan jatuh ke atas pemilik secara peribadi ialah sekitar {loan}. Jika orang itu meninggal dunia, bank boleh menuntut daripada harta pusaka terlebih dahulu." },
    { group: "loan", title: "Penyelesaian", text: "Perlindungan pinjaman boleh melunaskan hutang supaya keluarga mengekalkan rumah dan simpanan, tertakluk kepada terma sijil." },
    { group: "loan", title: "Penutup", text: "Mari kita senaraikan setiap kemudahan dan semak yang mana sudah ada perlindungan, kemudian tampung jurangnya." },
    { group: "enterprise", title: "Soalan pembukaan", text: "Jika anda tiada semalam, siapa yang boleh mengeluarkan wang daripada akaun bank {company} hari ini?" },
    { group: "enterprise", title: "Tunjuk angka", text: "Akaun dan aset sekitar {frozen} mungkin dibekukan. Untuk memastikan perniagaan terus berjalan semasa peralihan, keluarga memerlukan sekitar {cash} dalam bentuk tunai." },
    { group: "enterprise", title: "Penyelesaian", text: "Takaful hibah boleh dibayar terus kepada penerima yang anda namakan, bukan melalui harta pusaka, tertakluk kepada penamaan yang sah dan terma sijil." },
    { group: "enterprise", title: "Penutup", text: "Mari kita mulakan dengan hibah untuk pasangan anda, dan sediakan wasiat supaya perniagaan boleh diteruskan atau dijual dengan teratur." },
  ],
  riskItems: [
    { label: "Penyakit sedia ada (mana-mana nyawa yang diinsuranskan)", detail: "Contoh: darah tinggi, kencing manis, jantung, asma, kolesterol, buah pinggang, kanser, kesihatan mental. Kemungkinan hasil: caruman tambahan (loading), pengecualian, penangguhan atau penolakan bagi orang itu. Dedahkan sepenuhnya bersama laporan doktor." },
    { label: "Merokok / vape", detail: "Contoh: termasuk vape dan merokok sekali-sekala. Kemungkinan hasil: kadar perokok yang lebih tinggi. Jangan sekali-kali isytihar bukan perokok jika anda merokok: tuntutan boleh ditolak." },
    { label: "BMI tinggi / rendah", detail: "Contoh: berat dan tinggi di luar julat normal. Kemungkinan hasil: caruman tambahan (loading) atau penangguhan." },
    { label: "Pernah dimasukkan ke hospital / menjalani pembedahan", detail: "Contoh: kemasukan atau pembedahan baru-baru ini. Kemungkinan hasil: penilai risiko (underwriter) mungkin meminta laporan hospital; pengecualian boleh berlaku." },
    { label: "Ujian / simptom yang belum disiasat", detail: "Contoh: menunggu keputusan, rujukan pakar. Kemungkinan hasil: biasanya ditangguhkan sehingga keputusan diperoleh." },
    { label: "Pekerjaan berbahaya / kerja di tapak", detail: "Contoh: tapak pembinaan, lantai kilang, pemanduan logistik, luar pesisir. Kemungkinan hasil: caruman lebih tinggi atau had pada manfaat kemalangan." },
    { label: "Hobi berisiko", detail: "Contoh: sukan permotoran, menyelam skuba, mendaki di altitud tinggi, terjun udara. Kemungkinan hasil: pengecualian aktiviti atau caruman tambahan (loading)." },
    { label: "Sejarah keluarga", detail: "Contoh: ibu bapa atau adik-beradik yang menghidap penyakit jantung, kanser atau strok pada usia muda. Kemungkinan hasil: caruman tambahan (loading) mungkin dikenakan." },
    { label: "Jumlah tidak setara dengan kewangan", detail: "Contoh: jumlah orang kunci jauh melebihi sumbangan kepada keuntungan; beli-jual melebihi penilaian yang boleh dipertahankan. Kemungkinan hasil: penilaian risiko (underwriting) kewangan dengan akaun, penyata cukai dan asas penilaian; jumlah mungkin dikurangkan atau ditolak." },
    { label: "Tiada kepentingan boleh diinsuranskan / pemilikan tidak jelas", detail: "Contoh: pemilik sijil tidak mempunyai kepentingan kewangan terhadap nyawa yang diinsuranskan. Kemungkinan hasil: ditolak atau distruktur semula. Padankan pemilik, pembayar dan penerima dengan keperluan." },
    { label: "Tiada resolusi lembaga pengarah / dokumen syarikat", detail: "Contoh: sijil milik syarikat tanpa resolusi, borang SSM atau perlembagaan. Kemungkinan hasil: permohonan tertangguh sehingga dokumen diterima." },
    { label: "Umur di luar had", detail: "Contoh: rakan kongsi yang lebih berumur hampir umur kemasukan maksimum pelan. Kemungkinan hasil: tempoh lebih pendek atau pelan lain bagi rakan kongsi itu." },
    { label: "Dokumen / maklumat tidak lengkap", detail: "Contoh: salinan IC, penama, tandatangan, penyata kewangan. Kemungkinan hasil: permohonan tertangguh atau dibatalkan. Semak semuanya sebelum menghantar." },
  ],
  riskReasons: [
    { label: "Tidak mendedahkan maklumat", detail: "Maklumat kesihatan atau kewangan tidak diisytiharkan semasa permohonan. Sebab lazim tuntutan ditolak atau sijil dibatalkan." },
    { label: "Tempoh menunggu", detail: "Manfaat tertentu hanya terpakai selepas tempoh menunggu dari tarikh mula. [Semak PDS.]" },
    { label: "Pengecualian", detail: "Keadaan sedia ada, kecederaan yang disengajakan, dadah atau alkohol, aktiviti yang dikecualikan." },
    { label: "Sijil luput", detail: "Caruman tidak dibayar melepasi tempoh bertoleransi (grace period), selalunya apabila aliran tunai syarikat mengetat. Sediakan auto-debit." },
    { label: "Pemilikan / penerima tidak sepadan", detail: "Pemilik, pembayar dan penerima tidak sepadan dengan tujuan (contohnya bayaran orang kunci kepada waris), lalu menimbulkan pertikaian." },
    { label: "Tiada perjanjian beli-jual", detail: "Tanpa perjanjian bertulis, waris mungkin enggan menjual, atau mempertikaikan harga, walaupun selepas bayaran dibuat." },
    { label: "Tidak menepati takrifan", detail: "Manfaat TPD atau penyakit kritikal mengikut takrifan dalam sijil, bukan nama penyakit itu." },
    { label: "Dokumen tuntutan tidak lengkap", detail: "Sijil kematian, resolusi syarikat, penyata pinjaman atau borang tuntutan tiada." },
  ],
  objections: [
    { q: "Perniagaan saya kecil, saya tak perlu ini.", a: "Perniagaan kecil selalunya paling bergantung pada seorang. Bagi perusahaan, akaun dan hutang terus menjadi masalah keluarga." },
    { q: "Rakan kongsi saya boleh mengambil alih.", a: "Boleh, tetapi dari mana wang tunai untuk membeli bahagian waris? Dan siapa yang melakukan kerja dua orang semasa peralihan?" },
    { q: "Kami ada rizab tunai.", a: "Bagus, kalkulator sudah menolaknya. Jurang ialah apa yang rizab tidak dapat menampung." },
    { q: "Bank sudah ada perlindungan pinjaman.", a: "Semak jumlah dan tempohnya. Overdraf, sewa beli dan kemudahan perdagangan selalunya tidak dilindungi, tetapi mungkin masih jatuh ke atas pemilik secara peribadi." },
    { q: "Ia hanya kos perniagaan tambahan.", a: "Ia kos kecil yang diketahui berbanding kos besar yang tidak diketahui. Orang kunci mungkin boleh ditolak cukai jika memenuhi syarat; sahkan dengan ejen cukai anda." },
    { q: "Keluarga akan uruskan nanti.", a: "Tanpa perjanjian dan wang tunai, “nanti” boleh bermakna akaun dibekukan, harga saham dipertikaikan dan bank menuntut daripada harta pusaka." },
    { q: "Kami saling percaya, tak perlu perjanjian.", a: "Kepercayaan membantu hari ini. Waris seorang rakan kongsi mungkin tidak berkongsinya, itulah sebabnya perjanjian bertulis melindungi semua pihak." },
    ...COMMON_CONTENT.bm.objections.flatMap((g) => g.items),
  ],
  faq: [
    { q: "Orang kunci berbanding beli-jual?", a: "Orang kunci menggantikan kerugian syarikat apabila orang penting tiada. Beli-jual memberi rakan kongsi wang tunai untuk membeli saham pemilik yang meninggal daripada waris." },
    { q: "Siapa pemilik dan pembayar sijil?", a: "Orang kunci: syarikat. Beli-jual: rakan kongsi, syarikat, atau nyawa sendiri dengan hibah kepada rakan kongsi. Pinjaman: penghutang. Perusahaan: pemilik." },
    { q: "Adakah caruman orang kunci boleh ditolak cukai?", a: "Mungkin, jika memenuhi syarat dalam keputusan cukai yang berkaitan. Sahkan dengan ejen cukai." },
    { q: "Bagaimana jika seorang rakan kongsi keluar daripada perniagaan?", a: "Perjanjian patut meliputi pengeluaran diri; sijil boleh ditugaskan semula atau diserahkan balik mengikut terma." },
    { q: "Bolehkah saya guna hibah peribadi sedia ada?", a: "Boleh, untuk keperluan keluarga. Bagi beli-jual dan orang kunci, pemilik dan penerima mesti sepadan dengan tujuan perniagaan." },
    { q: "Bagaimana perniagaan dinilai?", a: "Biasanya gandaan untung bersih bagi PKS, aset bersih bagi perniagaan beraset tinggi, atau nilai yang dipersetujui semua rakan kongsi. Semak setiap tahun." },
    ...COMMON_CONTENT.bm.faq,
  ],
};

export const BUSINESS_CONTENT: Localised<ModuleContent> = {
  en: BUSINESS_DEFAULT_CONTENT,
  bm: BUSINESS_CONTENT_BM,
};
