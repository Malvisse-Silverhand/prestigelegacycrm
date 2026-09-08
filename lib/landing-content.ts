// The page-builder document. Stored as jsonb on landing_pages.content, edited
// section by section in the builder, and read straight back out by the public
// page. Every field is optional on read -- a page created before a section
// existed falls back to DEFAULT_CONTENT rather than rendering an empty band.

export type LandingProduct = "medical" | "hibah" | "both";

// How much page wraps the calculators. A QuickQuote form is the same
// funnel with the marketing removed -- same ownership, capture, counters
// and RLS -- so it is a layout rather than a second system.
export type LandingLayout = "full" | "quickquote";

export type LandingBenefit = { title: string; body: string };
export type LandingTestimonial = { quote: string; name: string; meta: string };
export type LandingFaq = { q: string; a: string };

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
