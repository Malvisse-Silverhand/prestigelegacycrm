// The page-builder document. Stored as jsonb on landing_pages.content, edited
// section by section in the builder, and read straight back out by the public
// page. Every field is optional on read -- a page created before a section
// existed falls back to DEFAULT_CONTENT rather than rendering an empty band.

export type LandingProduct = "medical" | "hibah" | "both";

// How much page wraps the calculators. A QuickQuote form is the same
// funnel with the marketing removed -- same ownership, capture, counters
// and RLS -- so it is a layout rather than a second system.
// `medical` is the long-form consultative funnel: the cost-of-treatment
// case, benefits, why-this-adviser, an adviser profile, social proof and the
// panel of operators, ending at the same calculators as every other layout.
export type LandingLayout = "full" | "quickquote" | "medical";

export type LandingBenefit = { title: string; body: string };
export type LandingTestimonial = { quote: string; name: string; meta: string };
export type LandingFaq = { q: string; a: string };
export type LandingCostRow = { label: string; amount: string };
export type LandingStat = { value: string; label: string };
export type LandingProvider = { name: string; logoUrl: string };

export type LandingContent = {
  heroEyebrow: string;
  heroHeadline: string;
  heroHighlight: string;
  heroBody: string;
  heroCta: string;
  heroPoints: string[];
  benefitsTitle: string;
  benefits: LandingBenefit[];
  testimonialsTitle: string;
  testimonials: LandingTestimonial[];
  faqTitle: string;
  faqs: LandingFaq[];
  closingTitle: string;
  closingBody: string;

  // ---- medical layout only -------------------------------------------------
  // Every one of these falls back to the default below, so switching an
  // existing page to the medical layout renders a complete page immediately
  // rather than a run of empty bands.
  problemEyebrow: string;
  problemTitle: string;
  problemBody: string;
  costRows: LandingCostRow[];
  costNote: string;
  newsHeadlines: string[];
  whyTitle: string;
  whyPoints: LandingBenefit[];
  advisorName: string;
  advisorTitle: string;
  advisorPhotoUrl: string;
  advisorBio: string;
  advisorStats: LandingStat[];
  providersTitle: string;
  providers: LandingProvider[];
};

// Written as a real first draft, not lorem ipsum: a new page is publishable
// as-is, and the agent edits the parts that don't sound like them.
export const DEFAULT_CONTENT: LandingContent = {
  heroEyebrow: "Medical Card & Hibah",
  heroHeadline: "Tak suka kena push ejen?",
  heroHighlight: "Kira sendiri dulu.",
  heroBody:
    "Semak anggaran caruman anda dalam 60 saat — tanpa panggilan, tanpa tekanan. Bila anda dah selesa dengan angka tu, barulah kita berbual.",
  heroCta: "Kira Anggaran Saya",
  heroPoints: ["Tiada panggilan automatik", "Anggaran serta-merta", "Ejen berdaftar, bukan call centre"],
  benefitsTitle: "Yang orang paling risau, kami jawab dulu",
  benefits: [
    {
      title: "Anda yang kawal",
      body: "Kira sendiri, baca sendiri, putuskan sendiri. Kami hanya hubungi bila anda minta.",
    },
    {
      title: "Angka sebenar, bukan anggaran kasar",
      body: "Kalkulator ini guna jadual kadar yang sama dengan quotation rasmi yang anda akan terima.",
    },
    {
      title: "Ejen berdaftar",
      body: "Berdaftar dengan Great Eastern Takaful Berhad. Bukan broker, bukan call centre.",
    },
  ],
  testimonialsTitle: "Klien yang mula dengan kalkulator ini",
  testimonials: [
    {
      quote: "Saya suka sebab boleh tengok anggaran dulu sebelum decide. Tak rasa terdesak langsung.",
      name: "Syaliza A.",
      meta: "Medical Card",
    },
    {
      quote: "Isi sendiri malam-malam lepas anak tidur. Esoknya baru ejen follow up. Itu yang saya nak.",
      name: "Aiman M.",
      meta: "Medical Card",
    },
    {
      quote: "Dah lama tangguh sebab malas layan ejen. Kalkulator ni buat saya settle dalam satu petang.",
      name: "Fathul G.",
      meta: "Hibah",
    },
  ],
  faqTitle: "Sebelum anda isi apa-apa",
  faqs: [
    {
      q: "Harga yang keluar tu muktamad ke?",
      a: "Tidak. Itu anggaran berdasarkan umur, jantina dan status merokok sahaja. Sumbangan sebenar ditentukan selepas underwriting.",
    },
    {
      q: "Perlu upload IC di halaman ini?",
      a: "Tidak perlu. Halaman ini hanya untuk anggaran. Pengesahan identiti dibuat kemudian melalui saluran rasmi pengendali takaful.",
    },
    {
      q: "Lepas saya isi, apa jadi?",
      a: "Anggaran penuh dibuka serta-merta. Ejen akan hubungi hanya bila anda nak teruskan.",
    },
  ],
  closingTitle: "Ambil 60 saat. Lepas tu terpulang.",
  closingBody: "Tiada obligasi, tiada bayaran di halaman ini.",

  problemEyebrow: "Fakta yang ramai tak sedar",
  problemTitle: "Realiti kos perubatan di Malaysia hari ini",
  problemBody:
    "Inflasi perubatan di Malaysia antara yang tertinggi di Asia Tenggara — dalam lingkungan 12% hingga 15% setiap tahun. Bil yang mampu dibayar hari ini belum tentu mampu dibayar lima tahun lagi.",
  costRows: [
    { label: "Pembedahan bypass jantung", amount: "RM 60,000+" },
    { label: "Rawatan kanser (kemoterapi / radioterapi)", amount: "RM 150,000+" },
    { label: "Pembedahan ortopedik (slip disc / ACL)", amount: "RM 25,000+" },
    { label: "Demam denggi (wad 3–5 hari)", amount: "RM 4,000+" },
  ],
  costNote: "Kos adalah anggaran purata dan berbeza mengikut kes, hospital dan bandar.",
  newsHeadlines: [
    "Kadar inflasi perubatan Malaysia antara tertinggi global, dijangka cecah 12%",
    "Pesakit terpaksa gadai harta, berhabis simpanan demi bayar bil hospital",
    "Kesesakan hospital awam berterusan, waktu menunggu pakar sehingga 6 bulan",
  ],
  whyTitle: "Saya di pihak anda",
  whyPoints: [
    {
      title: "Cadangan ikut keperluan",
      body: "Saya susun pelan ikut bajet dan keadaan kesihatan anda, bukan ikut kuota bulanan sesiapa.",
    },
    {
      title: "Tiada caj tersembunyi",
      body: "Khidmat nasihat dan sebut harga adalah percuma. Anda bayar caruman kepada pengendali takaful sahaja.",
    },
    {
      title: "Proses ringkas",
      body: "Jawab beberapa soalan, lihat anggaran serta-merta. Tiada pembentangan panjang sebelum anda bersedia.",
    },
    {
      title: "Maklum balas pantas",
      body: "Saya hubungi anda dalam masa 24 jam selepas borang dihantar — pada waktu yang anda pilih.",
    },
    {
      title: "Patuh Syariah",
      body: "Semua pelan yang saya cadangkan adalah produk takaful yang diselia panel Syariah bertauliah.",
    },
    {
      title: "Anda yang putuskan",
      body: "Tiada tekanan untuk sign hari ini. Ambil masa, bincang dengan pasangan, baru beritahu saya.",
    },
  ],
  advisorName: "",
  advisorTitle: "Perunding Takaful Berdaftar",
  advisorPhotoUrl: "",
  advisorBio:
    "Assalamualaikum dan salam sejahtera. Misi saya mudah: bantu lebih ramai keluarga Malaysia dapat perlindungan yang komprehensif, patuh Syariah, dan paling penting — muat dalam bajet bulanan mereka.",
  advisorStats: [
    { value: "24 jam", label: "Maklum balas" },
    { value: "100%", label: "Patuh Syariah" },
    { value: "Percuma", label: "Sebut harga" },
  ],
  providersTitle: "Saya bandingkan pelan daripada pengendali takaful utama",
  providers: [
    { name: "Great Eastern Takaful", logoUrl: "" },
    { name: "Etiqa Takaful", logoUrl: "" },
    { name: "Takaful Ikhlas", logoUrl: "" },
    { name: "Prudential BSN Takaful", logoUrl: "" },
    { name: "AIA Public Takaful", logoUrl: "" },
    { name: "Takaful Malaysia", logoUrl: "" },
  ],
};

// Merges a stored document over the defaults one key at a time, so a page
// saved before a field existed still renders and an agent who blanked a
// heading doesn't get an empty band. Arrays replace wholesale (an agent who
// deleted two of three benefits meant it); an empty array falls back, since
// that is always a section they didn't fill rather than one they emptied.
export function withDefaults(raw: unknown): LandingContent {
  const c = (raw ?? {}) as Partial<LandingContent>;
  const str = (v: unknown, fallback: string) =>
    typeof v === "string" && v.trim() ? v : fallback;
  const arr = <T,>(v: unknown, fallback: T[]) =>
    Array.isArray(v) && v.length > 0 ? (v as T[]) : fallback;

  return {
    heroEyebrow: str(c.heroEyebrow, DEFAULT_CONTENT.heroEyebrow),
    heroHeadline: str(c.heroHeadline, DEFAULT_CONTENT.heroHeadline),
    heroHighlight: str(c.heroHighlight, DEFAULT_CONTENT.heroHighlight),
    heroBody: str(c.heroBody, DEFAULT_CONTENT.heroBody),
    heroCta: str(c.heroCta, DEFAULT_CONTENT.heroCta),
    heroPoints: arr<string>(c.heroPoints, DEFAULT_CONTENT.heroPoints),
    benefitsTitle: str(c.benefitsTitle, DEFAULT_CONTENT.benefitsTitle),
    benefits: arr<LandingBenefit>(c.benefits, DEFAULT_CONTENT.benefits),
    testimonialsTitle: str(c.testimonialsTitle, DEFAULT_CONTENT.testimonialsTitle),
    testimonials: arr<LandingTestimonial>(c.testimonials, DEFAULT_CONTENT.testimonials),
    faqTitle: str(c.faqTitle, DEFAULT_CONTENT.faqTitle),
    faqs: arr<LandingFaq>(c.faqs, DEFAULT_CONTENT.faqs),
    closingTitle: str(c.closingTitle, DEFAULT_CONTENT.closingTitle),
    closingBody: str(c.closingBody, DEFAULT_CONTENT.closingBody),

    problemEyebrow: str(c.problemEyebrow, DEFAULT_CONTENT.problemEyebrow),
    problemTitle: str(c.problemTitle, DEFAULT_CONTENT.problemTitle),
    problemBody: str(c.problemBody, DEFAULT_CONTENT.problemBody),
    costRows: arr<LandingCostRow>(c.costRows, DEFAULT_CONTENT.costRows),
    costNote: str(c.costNote, DEFAULT_CONTENT.costNote),
    newsHeadlines: arr<string>(c.newsHeadlines, DEFAULT_CONTENT.newsHeadlines),
    whyTitle: str(c.whyTitle, DEFAULT_CONTENT.whyTitle),
    whyPoints: arr<LandingBenefit>(c.whyPoints, DEFAULT_CONTENT.whyPoints),
    // The adviser's own name and photo are the two fields with no sensible
    // default -- the page falls back to the owning agent's name at render
    // time rather than inventing one here.
    advisorName: typeof c.advisorName === "string" ? c.advisorName : "",
    advisorTitle: str(c.advisorTitle, DEFAULT_CONTENT.advisorTitle),
    advisorPhotoUrl: typeof c.advisorPhotoUrl === "string" ? c.advisorPhotoUrl : "",
    advisorBio: str(c.advisorBio, DEFAULT_CONTENT.advisorBio),
    advisorStats: arr<LandingStat>(c.advisorStats, DEFAULT_CONTENT.advisorStats),
    providersTitle: str(c.providersTitle, DEFAULT_CONTENT.providersTitle),
    providers: arr<LandingProvider>(c.providers, DEFAULT_CONTENT.providers),
  };
}

// A slug is the public URL, so it has to survive being typed, pasted into
// WhatsApp and read aloud: lowercase, ASCII, no double dashes.
export function slugify(raw: string) {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const PRODUCT_LABEL: Record<LandingProduct, string> = {
  medical: "Medical Card",
  hibah: "Hibah",
  both: "Medical Card + Hibah",
};

// Which calculator tabs a page shows, in order.
export function tabsFor(product: LandingProduct) {
  const medical = { key: "medical" as const, label: "Medical Card", tool: "imedi-evolusi-quote.html" };
  const hibah = { key: "hibah" as const, label: "Hibah", tool: "quickquote-hibah-life-takaful.html" };
  if (product === "medical") return [medical];
  if (product === "hibah") return [hibah];
  return [medical, hibah];
}
