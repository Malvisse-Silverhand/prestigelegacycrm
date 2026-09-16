import type { PortalLang } from "@/lib/portal-copy";

/**
 * The two client guides, as structured content rather than a link out.
 *
 * Both are condensed from the agency's own guide pages -- the medical card
 * portal and the hibah portal at takaful4us.com -- and they keep the numbers
 * that actually decide what a client pays or loses: 5% at a panel clinic, 20%
 * outside The Great Journey, 180 days to submit a claim, five years of
 * contestability. Everything else is a link to the full page rather than a
 * wall of text on a phone.
 *
 * Bilingual throughout, and deliberately free of any client's own data: the
 * page resolves the one date that IS personal -- the end of the contestable
 * period -- against the certificate it is rendering.
 */

export type Bilingual = { bm: string; en: string };

export type GuideStep = { title: Bilingual; body: Bilingual };

export type GuideCallout = { tone: "info" | "warn" | "good"; text: Bilingual };

export type GuideLink = { label: Bilingual; url: string };

export type GuideSection = {
  id: string;
  title: Bilingual;
  intro?: Bilingual;
  steps?: GuideStep[];
  bullets?: Bilingual[];
  callout?: GuideCallout;
  links?: GuideLink[];
};

export const PANEL_LOCATOR_URL = "https://takaful4us.com/getb-panel-locator/";
export const MEDICAL_GUIDE_URL = "https://takaful4us.com/medical-card-client-portal/";
export const HIBAH_GUIDE_URL = "https://takaful4us.com/hibah-client-portal/";
export const IGIT_LOGIN_URL = "https://igetintouch.greateasterntakaful.com/econnect-new/#/login";
export const GETCARE_ANDROID_URL = "https://play.google.com/store/apps/details?id=com.micaresvc.getCare";
export const GETCARE_IOS_URL = "https://apps.apple.com/my/app/getcare/id1496705893";

/** How long a life/hibah certificate stays contestable, from commencement. */
export const CONTESTABLE_YEARS = 5;

export const MEDICAL_GUIDE: GuideSection[] = [
  {
    id: "great-journey",
    title: { bm: "The Great Journey", en: "The Great Journey" },
    intro: {
      bm: "Laluan rawatan yang menentukan berapa anda bayar. Ikut laluan panel — kos paling rendah. Keluar dari laluan — 20% co-takaful dikenakan.",
      en: "The treatment path that decides what you pay. Stay on the panel route and you pay the least; step outside it and a 20% co-takaful applies.",
    },
    bullets: [
      {
        bm: "Klinik panel (Great Clinic) untuk 12 kondisi yang layak — anda bayar 5% sahaja, tanpa borang.",
        en: "A panel clinic (Great Clinic) for the 12 eligible conditions — you pay 5%, with no forms.",
      },
      {
        bm: "Hospital panel (Great Hospital) — Guarantee Letter disediakan, deposit diwaiver, anda bayar deductible sahaja.",
        en: "A panel hospital (Great Hospital) — a Guarantee Letter is arranged, the deposit is waived, and you pay only the deductible.",
      },
      {
        bm: "Luar panel — deductible ditambah 20% co-takaful, maksimum RM20,000, dan tiada Guarantee Letter.",
        en: "Outside the panel — the deductible plus a 20% co-takaful, capped at RM20,000, and no Guarantee Letter.",
      },
      {
        bm: "Kecemasan sebenar yang disahkan doktor — deductible dan co-takaful kedua-duanya diwaiver, walaupun di hospital bukan panel.",
        en: "A genuine emergency confirmed by a doctor — both the deductible and the co-takaful are waived, even at a non-panel hospital.",
      },
    ],
    callout: {
      tone: "good",
      text: {
        bm: "Had outpatient di Great Clinic: co-takaful 5%, sehingga RM500 setahun bagi setiap sijil.",
        en: "Outpatient limit at a Great Clinic: 5% co-takaful, up to RM500 a year per certificate.",
      },
    },
  },
  {
    id: "outpatient",
    title: { bm: "Rawatan Pesakit Luar (Klinik)", en: "Outpatient (Clinic)" },
    steps: [
      {
        title: { bm: "Cari Great Clinic berdekatan", en: "Find a Great Clinic near you" },
        body: {
          bm: "Guna panel locator atau app GETCare untuk cari klinik panel terdekat sebelum pergi.",
          en: "Use the panel locator or the GETCare app to find the nearest panel clinic before you set off.",
        },
      },
      {
        title: { bm: "Tunjuk MyKad", en: "Show your MyKad" },
        body: {
          bm: "Beritahu kaunter anda klien Great Eastern Takaful. Kad medikal GET adalah digital sepenuhnya — klinik boleh sahkan terus guna MyKad.",
          en: "Tell the counter you are a Great Eastern Takaful client. The GET medical card is fully digital — the clinic verifies you straight from your MyKad.",
        },
      },
      {
        title: { bm: "Bayar 5% sahaja", en: "Pay just 5%" },
        body: {
          bm: "Untuk 12 kondisi yang layak, 95% ditanggung terus oleh plan. Tiada borang untuk dihantar.",
          en: "For the 12 eligible conditions the plan covers 95% directly. There is no form to submit.",
        },
      },
    ],
    callout: {
      tone: "warn",
      text: {
        bm: "Klinik bukan panel: anda bayar penuh dahulu. Bil itu hanya boleh dituntut sebagai manfaat Pre-Hospitalisation jika anda dimasukkan ke wad selepas itu.",
        en: "At a non-panel clinic you pay in full first. That bill is only claimable as a Pre-Hospitalisation benefit if you are admitted to hospital afterwards.",
      },
    },
  },
  {
    id: "inpatient",
    title: { bm: "Kemasukan Wad (Inpatient)", en: "Hospital Admission" },
    steps: [
      {
        title: { bm: "Pilih hospital panel", en: "Choose a panel hospital" },
        body: {
          bm: "Pastikan hospital ada dalam senarai Great Journey untuk mengelak 20% co-takaful tambahan.",
          en: "Check the hospital is on the Great Journey list to avoid the extra 20% co-takaful.",
        },
      },
      {
        title: { bm: "Daftar di kaunter admission", en: "Register at the admission counter" },
        body: {
          bm: "Bawa MyKad asal dan surat rujukan klinik. Untuk anak — bawa MyKid atau sijil lahir.",
          en: "Bring your original MyKad and the clinic's referral letter. For a child, bring their MyKid or birth certificate.",
        },
      },
      {
        title: { bm: "Hospital mohon Guarantee Letter", en: "The hospital applies for a Guarantee Letter" },
        body: {
          bm: "Hospital menghantar maklumat ke GET. Kelulusan biasanya mengambil 30 minit hingga 2 jam.",
          en: "The hospital sends your details to GET. Approval usually takes 30 minutes to 2 hours.",
        },
      },
      {
        title: { bm: "Discaj — bayar deductible sahaja", en: "At discharge, pay only the deductible" },
        body: {
          bm: "Bil utama diselesaikan terus dengan GET. Anda bayar deductible dan caj yang tidak ditanggung sahaja.",
          en: "The main bill settles directly with GET. You pay the deductible and any charges not covered.",
        },
      },
    ],
  },
  {
    id: "claim",
    title: { bm: "Cara Membuat Tuntutan", en: "Making a Claim" },
    intro: {
      bm: "Untuk hospital bukan panel, anda bayar dahulu dan tuntut semula. Simpan semua resit asal.",
      en: "At a non-panel hospital you pay first and claim back. Keep every original receipt.",
    },
    bullets: [
      { bm: "Penyata Penuntut (Claimant Statement) yang lengkap", en: "A completed Claimant Statement" },
      { bm: "Penyata Doktor (Attending Physician Statement)", en: "The Attending Physician Statement" },
      { bm: "Borang Direct Credit Facility untuk bayaran masuk akaun", en: "A Direct Credit Facility form so payment reaches your account" },
      { bm: "Discharge Summary dan semua resit asal hospital, farmasi dan makmal", en: "The discharge summary and all original hospital, pharmacy and laboratory receipts" },
      { bm: "Salinan MyKad pemilik sijil", en: "A copy of the certificate holder's MyKad" },
    ],
    callout: {
      tone: "warn",
      text: {
        bm: "Had masa 180 hari. Tuntutan yang dihantar lebih 180 hari selepas tarikh discaj tidak akan diterima — hantar seawal mungkin.",
        en: "There is a 180-day limit. A claim submitted more than 180 days after the discharge date will not be accepted — send it as early as you can.",
      },
    },
    links: [
      { label: { bm: "Jejak status tuntutan di iGetInTouch", en: "Track your claim on iGetInTouch" }, url: IGIT_LOGIN_URL },
    ],
  },
  {
    id: "emergency",
    title: { bm: "Kecemasan", en: "In an Emergency" },
    bullets: [
      {
        bm: "Pergi terus ke jabatan kecemasan hospital terdekat — tidak kira panel atau bukan.",
        en: "Go straight to the nearest hospital emergency department — panel or not.",
      },
      {
        bm: "Setelah stabil, minta keluarga hubungi Careline GET atau ejen anda.",
        en: "Once stable, have your family call the GET Careline or your agent.",
      },
      {
        bm: "Untuk kecemasan yang sah, tiada co-takaful dikenakan walaupun di hospital bukan panel.",
        en: "For a genuine emergency, no co-takaful applies even at a non-panel hospital.",
      },
      {
        bm: "Selepas stabil, anda boleh dipindahkan ke Great Hospital untuk meneruskan rawatan.",
        en: "Once stable you can be transferred to a Great Hospital to continue treatment.",
      },
    ],
  },
  {
    id: "panel",
    title: { bm: "Cari Klinik & Hospital Panel", en: "Find a Panel Clinic or Hospital" },
    intro: {
      bm: "Lebih 85 hospital dan ratusan klinik panel di seluruh Malaysia. Guna yang betul untuk mengelak 20% co-takaful.",
      en: "More than 85 hospitals and hundreds of panel clinics across Malaysia. Using the right one is what avoids the 20% co-takaful.",
    },
    links: [
      { label: { bm: "Panel Locator", en: "Panel Locator" }, url: PANEL_LOCATOR_URL },
      { label: { bm: "App GETCare (Android)", en: "GETCare app (Android)" }, url: GETCARE_ANDROID_URL },
      { label: { bm: "App GETCare (iPhone)", en: "GETCare app (iPhone)" }, url: GETCARE_IOS_URL },
    ],
  },
  {
    id: "hospital-bag",
    title: { bm: "Beg Hospital", en: "Hospital Bag" },
    intro: {
      bm: "Sediakan lebih awal supaya tiada yang tertinggal ketika tergesa-gesa.",
      en: "Pack it in advance, so nothing is forgotten in a rush.",
    },
    bullets: [
      { bm: "MyKad asal — dan MyKid atau sijil lahir untuk anak", en: "Your original MyKad — plus MyKid or a birth certificate for a child" },
      { bm: "Surat rujukan klinik dan senarai ubat atau alahan", en: "The clinic referral letter and a list of medications or allergies" },
      { bm: "Pakaian ganti, telekung atau kain pelikat, dan barangan mandian", en: "A change of clothes, prayer garments, and toiletries" },
      { bm: "Telefon, pengecas dan power bank", en: "Phone, charger and a power bank" },
    ],
  },
];

export const HIBAH_GUIDE: GuideSection[] = [
  {
    id: "after-inforce",
    title: { bm: "Selepas Sijil Aktif", en: "Once Your Certificate Is Active" },
    intro: {
      bm: "Enam perkara yang patut diselesaikan awal — sekali sahaja, dan keluarga anda tidak perlu meneka kemudian.",
      en: "Six things worth settling early — once, so your family never has to guess later.",
    },
    bullets: [
      { bm: "Daftar portal rasmi iGetInTouch (iGIT)", en: "Register on the official iGetInTouch (iGIT) portal" },
      { bm: "Lantik penama hibah anda", en: "Appoint your hibah nominee" },
      { bm: "Muat turun app GETCare", en: "Download the GETCare app" },
      { bm: "Simpan sijil asal di tempat yang selamat dan diketahui keluarga", en: "Keep the original certificate somewhere safe that your family knows about" },
      { bm: "Tetapkan auto-debit supaya sumbangan tidak terlepas", en: "Set up auto-debit so a contribution is never missed" },
      { bm: "Beritahu keluarga — penama yang tidak tahu tidak boleh menuntut", en: "Tell your family — a nominee who does not know cannot claim" },
    ],
  },
  {
    id: "wasi-vs-hibah",
    title: { bm: "Wasi atau Hibah Bersyarat?", en: "Executor or Conditional Hibah?" },
    intro: {
      bm: "Dua jenis pelantikan, dan perbezaannya menentukan siapa benar-benar memiliki manfaat itu.",
      en: "Two kinds of appointment, and the difference decides who actually owns the benefit.",
    },
    steps: [
      {
        title: { bm: "Wasi (pemegang amanah)", en: "Wasi (executor)" },
        body: {
          bm: "Penama menerima manfaat sebagai pemegang amanah sahaja. Manfaat itu perlu diagihkan mengikut faraid. Penama mesti berumur 18 tahun ke atas.",
          en: "The nominee receives the benefit only as a trustee. It must then be distributed according to faraid. The nominee must be 18 or over.",
        },
      },
      {
        title: { bm: "Hibah bersyarat (penerima mutlak)", en: "Conditional hibah (absolute beneficiary)" },
        body: {
          bm: "Penama memiliki 100% manfaat itu sebagai hak peribadi, tidak terikat dengan faraid, dan tiada had umur. Proses tuntutan juga lebih pantas.",
          en: "The nominee owns 100% of the benefit outright, is not bound by faraid, and there is no age limit. The claim also moves faster.",
        },
      },
    ],
    callout: {
      tone: "info",
      text: {
        bm: "Hibah perlu diisytiharkan secara bertulis — semasa permohonan atau melalui borang tambahan. Tanpa pengisytiharan itu, penama anda adalah wasi.",
        en: "Hibah has to be declared in writing — at application or on a supplementary form. Without that declaration, your nominee is an executor.",
      },
    },
  },
  {
    id: "appoint",
    title: { bm: "Cara Melantik Penama Hibah", en: "How to Appoint a Hibah Nominee" },
    steps: [
      {
        title: { bm: "Log masuk iGetInTouch", en: "Log in to iGetInTouch" },
        body: { bm: "Guna portal rasmi Great Eastern Takaful.", en: "Use Great Eastern Takaful's own portal." },
      },
      {
        title: { bm: "Buka 'My Form Submission'", en: "Open 'My Form Submission'" },
        body: { bm: "Pilih 'Pelantikan Penama Hibah'.", en: "Choose 'Pelantikan Penama Hibah'." },
      },
      {
        title: { bm: "Isi maklumat penama", en: "Enter the nominee's details" },
        body: {
          bm: "Nama penuh, nombor pengenalan, hubungan dan peratusan bahagian. Jumlah semua bahagian mesti 100%.",
          en: "Full name, ID number, relationship and percentage share. The shares must add up to 100%.",
        },
      },
      {
        title: { bm: "Hantar bersama maklumat saksi", en: "Submit with the witness details" },
        body: { bm: "Pemprosesan mengambil masa 7 hingga 14 hari bekerja.", en: "Processing takes 7 to 14 working days." },
      },
    ],
    links: [{ label: { bm: "Buka iGetInTouch", en: "Open iGetInTouch" }, url: IGIT_LOGIN_URL }],
  },
  {
    id: "update",
    title: { bm: "Mengemas Kini Penama", en: "Updating Your Nominees" },
    intro: {
      bm: "Boleh diubah bila-bila masa selagi sijil aktif. Perkara yang selalunya memerlukan kemas kini:",
      en: "Can be changed at any time while the certificate is active. What usually calls for an update:",
    },
    bullets: [
      { bm: "Perkahwinan atau perceraian", en: "A marriage or a divorce" },
      { bm: "Kelahiran anak", en: "The birth of a child" },
      { bm: "Kematian penama", en: "The death of a nominee" },
    ],
    callout: {
      tone: "info",
      text: {
        bm: "Bagi hibah mutlak, persetujuan penerima sedia ada diperlukan sebelum pertukaran boleh dibuat.",
        en: "For an absolute hibah, the existing beneficiary has to consent before a change can be made.",
      },
    },
  },
  {
    id: "claim",
    title: { bm: "Proses Tuntutan", en: "The Claim Process" },
    intro: {
      bm: "Langkah untuk waris, mengikut urutan.",
      en: "The steps for your heirs, in order.",
    },
    steps: [
      {
        title: { bm: "Hubungi Careline GET", en: "Call the GET Careline" },
        body: { bm: "Maklumkan secepat mungkin dan minta borang tuntutan kematian.", en: "Notify them as soon as possible and ask for the death claim form." },
      },
      {
        title: { bm: "Kumpul dokumen sokongan", en: "Gather the supporting documents" },
        body: {
          bm: "Sijil kematian, MyKad si mati dan penama, sijil takaful asal, laporan perubatan, permit pengebumian, dan surat pelantikan hibah.",
          en: "The death certificate, the deceased's and nominee's MyKad, the original takaful certificate, the medical report, the burial permit, and the hibah appointment letter.",
        },
      },
      {
        title: { bm: "Hantar tuntutan", en: "Submit the claim" },
        body: { bm: "Melalui cawangan, pos berdaftar, atau muat naik ke iGetInTouch.", en: "Through a branch, by registered post, or uploaded to iGetInTouch." },
      },
      {
        title: { bm: "Terima bayaran", en: "Receive the payment" },
        body: {
          bm: "Bayaran masuk terus ke akaun bank penama. Kes yang lengkap dan di luar tempoh penyiasatan biasanya selesai dalam 14 hingga 30 hari bekerja.",
          en: "Payment goes straight into the nominee's bank account. A complete claim outside the investigation period usually settles in 14 to 30 working days.",
        },
      },
    ],
  },
];

/** Where a certificate sits against the five-year contestable window. */
export type ContestableStatus = {
  /** The day the window closes. */
  endsOn: string;
  /** True once the certificate is past it. */
  passed: boolean;
  daysRemaining: number;
};

/**
 * The one piece of this guide that is personal: when THIS certificate stops
 * being contestable. Pure, and takes `today` rather than reading a clock, for
 * the same reason every other date in this portal does.
 */
export function contestableStatus(commencementDate: string, today: string): ContestableStatus {
  const [y, m, d] = commencementDate.split("-").map(Number);
  const end = new Date(Date.UTC(y + CONTESTABLE_YEARS, m - 1, d));
  const pad = (n: number) => String(n).padStart(2, "0");
  const endsOn = `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`;
  const passed = today >= endsOn;
  const daysRemaining = passed
    ? 0
    : Math.ceil((Date.parse(endsOn) - Date.parse(today)) / 86400000);
  return { endsOn, passed, daysRemaining };
}

export function pick(value: Bilingual, lang: PortalLang): string {
  return value[lang];
}
