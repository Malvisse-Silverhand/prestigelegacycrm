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
// `agent` is the digital-profile-card layout: photo, socials, products and a
// short lead form -- no calculator embed at all.
export type LandingLayout = "full" | "quickquote" | "medical" | "agent";

export type LandingBenefit = { title: string; body: string };
export type LandingTestimonial = { quote: string; name: string; meta: string };
export type LandingFaq = { q: string; a: string };
export type LandingCostRow = { label: string; amount: string };
export type LandingStat = { value: string; label: string };
export type LandingProvider = { name: string; logoUrl: string };
export type LandingAgentProduct = { name: string; badge: string; interest: string };
export type LandingAgentSocials = { tiktok: string; threads: string; instagram: string; facebook: string };

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

  // ---- agent layout only ---------------------------------------------------
  // The digital profile card: falls back to DEFAULT_CONTENT the same way the
  // medical fields do, so switching a page to this layout renders complete
  // rather than blank.
  agentTagline: string;
  agentSubTagline: string;
  agentQuote: string;
  agentCtaForm: string;
  agentCtaWhatsapp: string;
  agentWhatsappMessage: string;
  agentCtaShare: string;
  agentBadges: string[];
  agentProductsTitle: string;
  agentProductsPill: string;
  agentProducts: LandingAgentProduct[];
  agentFormEyebrow: string;
  agentFormTitle: string;
  agentFormBody: string;
  agentFormSubmit: string;
  agentFormSuccessTitle: string;
  agentFormSuccessBody: string;
  agentCallCta: string;
  agentFooterLine: string;
  agentSocials: LandingAgentSocials;
  // Page-level overrides of the agent's profile-level default images
  // (profiles.landing_logo_url etc). Blank means "use the profile default".
  agentLogoUrl: string;
  agentHeaderUrl: string;
  agentPhotoUrl: string;
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

  agentTagline: "Trusted Takaful Advisor",
  agentSubTagline: "Protecting Income. Securing Futures.",
  agentQuote:
    "Membantu Keluarga & Pemilik Perniagaan Melindungi Pendapatan Melalui Perancangan Takaful Yang Strategik.",
  agentCtaForm: "Semak Pelan Sesuai (Quotation)",
  agentCtaWhatsapp: "Sesi Santai WhatsApp",
  agentWhatsappMessage:
    "Assalamualaikum {nama}, saya berminat nak tahu lebih lanjut tentang pelan perlindungan takaful. Boleh kita aturkan sesi penerangan ringkas?",
  agentCtaShare: "Kongsi Kad Profil Pintar",
  agentBadges: ["Patuh Syariah", "Sesi Santai", "Pelan Mesra Bajet"],
  agentProductsTitle: "Produk Perlindungan",
  agentProductsPill: "Sila Pilih & Mohon",
  agentProducts: [
    { name: "Medical Card", badge: "Syor", interest: "Medical Card" },
    { name: "Hibah Takaful", badge: "Popular", interest: "Hibah" },
    { name: "Income Protection", badge: "", interest: "Income Protection" },
    { name: "Sakit Kritikal", badge: "", interest: "Critical Illness" },
  ],
  agentFormEyebrow: "Konsultasi Percuma",
  agentFormTitle: "Semak Pelan Takaful Yang Sesuai",
  agentFormBody: "Isi butiran ringkas di bawah. {nama} akan menghubungi anda secepat mungkin.",
  agentFormSubmit: "Hantar",
  agentFormSuccessTitle: "Terima kasih!",
  agentFormSuccessBody: "Maklumat anda telah diterima. {nama} akan menghubungi anda tidak lama lagi.",
  agentCallCta: "Hubungi Segera",
  agentFooterLine: "Pengantara Takaful Berdaftar dengan Great Eastern Takaful Berhad.",
  agentSocials: { tiktok: "", threads: "", instagram: "", facebook: "" },
  agentLogoUrl: "",
  agentHeaderUrl: "",
  agentPhotoUrl: "",
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

    agentTagline: str(c.agentTagline, DEFAULT_CONTENT.agentTagline),
    agentSubTagline: str(c.agentSubTagline, DEFAULT_CONTENT.agentSubTagline),
    agentQuote: str(c.agentQuote, DEFAULT_CONTENT.agentQuote),
    agentCtaForm: str(c.agentCtaForm, DEFAULT_CONTENT.agentCtaForm),
    agentCtaWhatsapp: str(c.agentCtaWhatsapp, DEFAULT_CONTENT.agentCtaWhatsapp),
    agentWhatsappMessage: str(c.agentWhatsappMessage, DEFAULT_CONTENT.agentWhatsappMessage),
    agentCtaShare: str(c.agentCtaShare, DEFAULT_CONTENT.agentCtaShare),
    agentBadges: arr<string>(c.agentBadges, DEFAULT_CONTENT.agentBadges),
    agentProductsTitle: str(c.agentProductsTitle, DEFAULT_CONTENT.agentProductsTitle),
    agentProductsPill: str(c.agentProductsPill, DEFAULT_CONTENT.agentProductsPill),
    agentProducts: arr<LandingAgentProduct>(c.agentProducts, DEFAULT_CONTENT.agentProducts),
    agentFormEyebrow: str(c.agentFormEyebrow, DEFAULT_CONTENT.agentFormEyebrow),
    agentFormTitle: str(c.agentFormTitle, DEFAULT_CONTENT.agentFormTitle),
    agentFormBody: str(c.agentFormBody, DEFAULT_CONTENT.agentFormBody),
    agentFormSubmit: str(c.agentFormSubmit, DEFAULT_CONTENT.agentFormSubmit),
    agentFormSuccessTitle: str(c.agentFormSuccessTitle, DEFAULT_CONTENT.agentFormSuccessTitle),
    agentFormSuccessBody: str(c.agentFormSuccessBody, DEFAULT_CONTENT.agentFormSuccessBody),
    agentCallCta: str(c.agentCallCta, DEFAULT_CONTENT.agentCallCta),
    agentFooterLine: str(c.agentFooterLine, DEFAULT_CONTENT.agentFooterLine),
    // Social / image URL fields: a blank is a real choice (hide the icon, use
    // the profile default), so an empty string must stay empty rather than
    // falling back -- only a non-string (missing key) gets the default "".
    agentSocials: {
      tiktok: typeof c.agentSocials?.tiktok === "string" ? c.agentSocials.tiktok : "",
      threads: typeof c.agentSocials?.threads === "string" ? c.agentSocials.threads : "",
      instagram: typeof c.agentSocials?.instagram === "string" ? c.agentSocials.instagram : "",
      facebook: typeof c.agentSocials?.facebook === "string" ? c.agentSocials.facebook : "",
    },
    agentLogoUrl: typeof c.agentLogoUrl === "string" ? c.agentLogoUrl : "",
    agentHeaderUrl: typeof c.agentHeaderUrl === "string" ? c.agentHeaderUrl : "",
    agentPhotoUrl: typeof c.agentPhotoUrl === "string" ? c.agentPhotoUrl : "",
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
