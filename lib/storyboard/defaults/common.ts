// Shared shapes and content for the module defaults.
//
import { t } from "../i18n";
import type { Lang, Localised } from "./localised";

// Everything here is an editable default, not a fact. Scripts use bracketed
// placeholders ([statistic + source]) wherever a number would otherwise be
// invented. Wording is Great Eastern only, with no guarantees and no promise of
// acceptance, claim payment or returns.

export type ScriptStep = {
  title: string;
  text: string;
  /** Optional section (Business: keyman / buysell / loan / enterprise). */
  group?: string;
};
/**
 * `key` is a language-neutral id for a default item: the English label / question.
 * Ticks (riskChecked) and the raised log are stored by key, so switching language
 * keeps them. It is absent in English (label / q is the key) and for items an agent added.
 */
export type RiskItem = { label: string; detail: string; key?: string };
export type Objection = { q: string; a: string; key?: string };
export type ObjectionGroup = { name: string; items: Objection[] };

export type ModuleContent = {
  script: ScriptStep[];
  riskItems: RiskItem[];
  /** Why a claim or application can fail, shown under the checklist. */
  riskReasons: RiskItem[];
  objections: Objection[];
  faq: Objection[];
};

/** Tokens a script may use. Filled at render time, never stored filled in. */
export const SCRIPT_TOKENS = [
  "{name}", "{need}", "{have}", "{gap}", "{base}",
  "{bill}", "{level}", "{scenario}", "{reason}", "{company}",
  "{commits}", "{dep}", "{recEarly}", "{gapEarly}", "{recLate}", "{gapLate}", "{runEarly}", "{runLate}",
  "{keyman}", "{buysell}", "{loan}", "{frozen}", "{cash}",
] as const;

export const DEFAULT_PLAN_NAMES = {
  hibah: "[GE hibah plan]",
  medical: "[GE medical plan]",
  ci: "[GE critical illness plan]",
  business: "[GE business protection plan]",
  mrtt: "[GE MRTT plan]",
  mltt: "[GE MLTT plan]",
} as const;

const COMMON_RISK_REASONS_EN: RiskItem[] = [
  { label: "Non-disclosure", detail: "Health or lifestyle facts not declared at application can affect a claim when they come to light." },
  { label: "Waiting period", detail: "Certain benefits only apply after a waiting period from the start date. Explain it clearly at sign-up." },
  { label: "Exclusions", detail: "Conditions or activities excluded in the certificate or by underwriting are not paid." },
  { label: "Certificate lapsed", detail: "Unpaid contributions past the grace period can end the cover. Set up auto-debit." },
  { label: "Doesn’t meet the definition", detail: "Benefits are paid only when the event meets the certificate’s exact definition." },
  { label: "Incomplete claim documents", detail: "Missing forms, reports or proof of relationship delay a claim. Keep a document checklist for the family." },
];

const COMMON_OBJECTIONS_EN: ObjectionGroup[] = [
  {
    name: "Money",
    items: [
      { q: "No money / tight budget.", a: "Understood. We don’t need everything now. Cover the biggest risk first with an amount that feels comfortable, then add when the budget allows." },
      { q: "More expensive than other companies.", a: "Let’s compare like for like: amount covered, benefits, term and exclusions. The lowest price is not always the plan that suits the need." },
      { q: "Afraid I can’t keep paying later.", a: "Choose a contribution that is sustainable for you and set up auto-debit. We can review together if your situation changes." },
      { q: "When my salary goes up.", a: "Fair. Can we start small now and increase it when the raise comes? The risk doesn’t wait for a raise." },
    ],
  },
  {
    name: "Delay",
    items: [
      { q: "Let me think about it first.", a: "Of course. Which part would you like to think about: the amount, the budget, or the plan itself? I’ll send a short summary." },
      { q: "Need to discuss with my wife / husband.", a: "That’s the right call for a family decision. Can we set 20 minutes this week so you both see the same numbers?" },
      { q: "I’ll contact you later.", a: "Sure. To make it easy, may I follow up on a day that suits you? I’ll put it in my calendar." },
      { q: "Maybe next month.", a: "No problem. Shall we prepare the illustration now so it’s ready, and start whenever you decide?" },
    ],
  },
  {
    name: "Trust",
    items: [
      { q: "Takaful claims are difficult.", a: "Most claim problems come from non-disclosure or missing documents. We’ll declare everything properly now, and I’ll guide the family when the time comes. [statistic + source, if you use one]" },
      { q: "Agents disappear after the sale.", a: "You’ll get my contact and the operator’s hotline. Servicing is part of my job, not an extra." },
      { q: "My friend got rejected.", a: "Sorry to hear that. Do you know why? Usually it is a waiting period, an exclusion or something not declared. That is what we check in Step 3." },
    ],
  },
  {
    name: "Perception & religion",
    items: [
      { q: "Takaful means not accepting fate (takdir).", a: "Takaful is planning and effort (ikhtiar), then we leave the outcome to Allah. Like locking the house before travelling." },
      { q: "It’s like gambling / riba.", a: "Takaful is built on mutual help (ta’awun) and donation (tabarru’), and products are reviewed by the operator’s Shariah committee. I can show you the Shariah concept in the PDS." },
      { q: "Afraid that buying it will make it happen.", a: "Planning doesn’t invite misfortune. It simply means the family is prepared, whatever happens." },
    ],
  },
  {
    name: "Feels covered enough",
    items: [
      { q: "I’m healthy, I don’t need it.", a: "Being healthy is when applications are usually easier, since terms depend on health today. The family’s needs already exist." },
      { q: "I’m already covered.", a: "Good, let’s count it. Step 1 already deducts existing cover; the gap is what is still left." },
      { q: "I want to compare other products first.", a: "Please do. Here is a checklist to compare: amount, benefits, term, exclusions and contribution." },
    ],
  },
];

const COMMON_FAQ_EN: Objection[] = [
  { q: "How much is the monthly contribution?", a: "It depends on age, gender, smoking status, occupation and the amount of cover. I’ll prepare an official illustration with the exact figure." },
  { q: "What if I already have health problems?", a: "Declare everything. The underwriter may accept on standard terms, add a loading, exclude a condition or postpone. See Step 3." },
  { q: "Are contributions and cash values guaranteed?", a: "Contributions can be revised under the certificate terms. Investment-linked cash values are not guaranteed. Check the PDS." },
  { q: "How does the family make a claim?", a: "Notify the operator or agent, then submit the claim form and the documents the certificate asks for. I will help the family through it." },
];

// ---------------------------------------------------------------------------
// Bahasa Malaysia. Parallel to the English lists above: same length, same
// order. A test enforces it, because ticks and the raised log are stored by
// the English label / question (the item `key`). Compliance-sensitive items
// are listed in design/financial-storyboard/BM-REVIEW.md.
// ---------------------------------------------------------------------------

const COMMON_RISK_REASONS_BM: RiskItem[] = [
  { label: "Tidak mendedahkan maklumat", detail: "Fakta kesihatan atau gaya hidup yang tidak diisytiharkan semasa permohonan boleh menjejaskan tuntutan apabila ia terbongkar." },
  { label: "Tempoh menunggu", detail: "Manfaat tertentu hanya terpakai selepas tempoh menunggu dari tarikh mula. Terangkan dengan jelas semasa pendaftaran." },
  { label: "Pengecualian", detail: "Keadaan atau aktiviti yang dikecualikan dalam sijil atau oleh penilaian risiko (underwriting) tidak dibayar." },
  { label: "Sijil luput", detail: "Caruman yang tidak dibayar melepasi tempoh bertoleransi (grace period) boleh menamatkan perlindungan. Sediakan auto-debit." },
  { label: "Tidak menepati takrifan", detail: "Manfaat hanya dibayar apabila kejadian menepati takrifan tepat dalam sijil." },
  { label: "Dokumen tuntutan tidak lengkap", detail: "Borang, laporan atau bukti hubungan yang tiada melewatkan tuntutan. Sediakan senarai semak dokumen untuk keluarga." },
];

const COMMON_OBJECTIONS_BM: ObjectionGroup[] = [
  {
    name: "Wang",
    items: [
      { q: "Tiada duit / bajet ketat.", a: "Saya faham. Kita tidak perlu ambil semuanya sekarang. Lindungi risiko terbesar dahulu dengan jumlah yang anda selesa, kemudian tambah apabila bajet mengizinkan." },
      { q: "Lebih mahal daripada syarikat lain.", a: "Mari kita bandingkan dengan adil: jumlah perlindungan, manfaat, tempoh dan pengecualian. Harga paling rendah belum tentu pelan yang paling sesuai dengan keperluan." },
      { q: "Takut tidak mampu terus membayar nanti.", a: "Pilih caruman yang mampu anda kekalkan dan sediakan auto-debit. Kita boleh menyemak semula bersama jika keadaan anda berubah." },
      { q: "Nanti bila gaji naik.", a: "Betul juga. Boleh kita mulakan dengan jumlah kecil sekarang dan tingkatkan apabila gaji naik? Risiko tidak menunggu kenaikan gaji." },
    ],
  },
  {
    name: "Menunda",
    items: [
      { q: "Biar saya fikir dahulu.", a: "Tentu sekali. Bahagian mana yang ingin anda fikirkan: jumlahnya, bajetnya, atau pelan itu sendiri? Saya akan hantar ringkasan pendek." },
      { q: "Perlu berbincang dengan isteri / suami dahulu.", a: "Itu langkah yang tepat untuk keputusan keluarga. Boleh kita tetapkan 20 minit minggu ini supaya anda berdua melihat angka yang sama?" },
      { q: "Nanti saya hubungi balik.", a: "Baik. Supaya mudah, boleh saya menghubungi anda semula pada hari yang sesuai? Saya akan catatkan dalam kalendar saya." },
      { q: "Mungkin bulan depan.", a: "Tiada masalah. Boleh kita sediakan ilustrasi sekarang supaya sedia, dan mula apabila anda sudah membuat keputusan?" },
    ],
  },
  {
    name: "Kepercayaan",
    items: [
      { q: "Tuntutan takaful susah.", a: "Kebanyakan masalah tuntutan berpunca daripada maklumat yang tidak didedahkan atau dokumen yang tidak lengkap. Kita akan isytiharkan semuanya dengan betul sekarang, dan saya akan membimbing keluarga apabila tiba masanya. [statistik + sumber, jika anda menggunakannya]" },
      { q: "Ejen hilang selepas jualan.", a: "Anda akan mendapat nombor saya dan talian hotline pengendali. Khidmat selepas jualan adalah sebahagian daripada tugas saya, bukan tambahan." },
      { q: "Kawan saya pernah ditolak.", a: "Maaf mendengarnya. Adakah anda tahu sebabnya? Biasanya kerana tempoh menunggu, pengecualian atau sesuatu yang tidak didedahkan. Itulah yang kita semak dalam Langkah 3." },
    ],
  },
  {
    name: "Persepsi & agama",
    items: [
      { q: "Takaful bermakna tidak reda dengan takdir.", a: "Takaful ialah perancangan dan usaha (ikhtiar), kemudian kita bertawakal kepada Allah. Seperti mengunci rumah sebelum bermusafir." },
      { q: "Takaful sama seperti judi / riba.", a: "Takaful dibina atas dasar tolong-menolong (ta’awun) dan derma (tabarru’), dan produknya disemak oleh jawatankuasa Syariah pengendali. Saya boleh tunjukkan konsep Syariahnya dalam PDS." },
      { q: "Takut kalau beli nanti perkara itu benar-benar berlaku.", a: "Merancang tidak mengundang malang. Ia hanya bermakna keluarga bersedia, apa pun yang berlaku." },
    ],
  },
  {
    name: "Rasa sudah cukup terlindung",
    items: [
      { q: "Saya sihat, tak perlu.", a: "Ketika sihat biasanya permohonan lebih mudah, kerana terma bergantung kepada kesihatan hari ini. Keperluan keluarga sudah pun wujud." },
      { q: "Saya sudah ada perlindungan.", a: "Bagus, mari kita kira. Langkah 1 sudah menolak perlindungan sedia ada; jurang ialah apa yang masih berbaki." },
      { q: "Saya mahu bandingkan produk lain dahulu.", a: "Silakan. Ini senarai semak untuk perbandingan: jumlah, manfaat, tempoh, pengecualian dan caruman." },
    ],
  },
];

const COMMON_FAQ_BM: Objection[] = [
  { q: "Berapakah caruman bulanan?", a: "Ia bergantung pada umur, jantina, status merokok, pekerjaan dan jumlah perlindungan. Saya akan menyediakan ilustrasi rasmi dengan angka yang tepat." },
  { q: "Bagaimana jika saya sudah ada masalah kesihatan?", a: "Dedahkan semuanya. Penilai risiko (underwriter) mungkin menerima dengan terma standard, menambah caruman tambahan (loading), mengecualikan sesuatu keadaan atau menangguhkan. Lihat Langkah 3." },
  { q: "Adakah caruman dan nilai tunai dijamin?", a: "Caruman boleh disemak semula mengikut terma sijil. Nilai tunai berkaitan pelaburan tidak dijamin. Semak PDS." },
  { q: "Bagaimana keluarga membuat tuntutan?", a: "Maklumkan kepada pengendali atau ejen, kemudian serahkan borang tuntutan dan dokumen yang diminta oleh sijil. Saya akan membantu keluarga sepanjang prosesnya." },
];

/** The content every module shares: why claims fail, the general objections and the common FAQ. */
export type CommonContent = { riskReasons: RiskItem[]; objections: ObjectionGroup[]; faq: Objection[] };

export const COMMON_CONTENT: Localised<CommonContent> = {
  en: { riskReasons: COMMON_RISK_REASONS_EN, objections: COMMON_OBJECTIONS_EN, faq: COMMON_FAQ_EN },
  bm: { riskReasons: COMMON_RISK_REASONS_BM, objections: COMMON_OBJECTIONS_BM, faq: COMMON_FAQ_BM },
};

// English exports kept for the module defaults files and existing callers.
export const COMMON_RISK_REASONS: RiskItem[] = COMMON_CONTENT.en.riskReasons;
export const COMMON_OBJECTIONS: ObjectionGroup[] = COMMON_CONTENT.en.objections;
export const COMMON_FAQ: Objection[] = COMMON_CONTENT.en.faq;

/** A module's built-in content in both languages. */
export type LocalisedContent = Localised<ModuleContent>;

/** Plan-name placeholder in the chosen language. */
export function defaultPlanName(key: keyof typeof DEFAULT_PLAN_NAMES, lang: Lang): string {
  return t(`plan.default.${key}` as const, lang);
}
