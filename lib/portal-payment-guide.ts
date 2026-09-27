import type { PortalLang } from "@/lib/portal-copy";

/**
 * Copy for the portal's "How to Pay" guide, lifted verbatim from Kamal's
 * WordPress page (`scratchpad/upgrades/portal-payment-copy.md`), with the one
 * typo already fixed in the source ("mengunnakan" -> "menggunakan").
 *
 * The body stays in Malay no matter which language the portal is set to --
 * only the surrounding UI (button, modal title, accordion headings, the
 * "Copy"/"Copied" labels and the Ref 2 placeholder) switches with the toggle.
 * That is why `PAYMENT_HELP_UI` is the only bilingual piece here; everything
 * else below it is a single Malay string.
 */

export const JOMPAY_BILLER_CODE = "16899";
export const JOMPAY_GUIDE_URL = "https://takaful4us.com/go/jompay-guideline";
export const CARELINE = "1300-13-8338";

// Re-exported so `payment-help.tsx` has one place to import the guide's
// external links from.
export { IGIT_LOGIN_URL } from "@/lib/portal-guides";

export type PaymentGuideStep = { title: string; body: string };
export type PaymentFeatureCard = { title: string; body: string };

export const JOMPAY_GUIDE = {
  intro: "Untuk buat caruman polisi anda secara manual, sila lakukan pembayaran menggunakan JomPAY.",
  stepsTitle: "Cara Pembayaran",
  steps: [
    "Buka aplikasi bank anda dan cari JomPAY di bawah 'Pay/Pembayaran'",
    "Masukkan Biller Code 16899 untuk GREAT EASTERN TAKAFUL-FAMILY",
    "Masukkan 10 digit 'Certificate Number' di bahagian 'Ref-1'",
    "Masukkan nombor telefon bimbit di 'Ref-2'",
    "Letak jumlah 'Contribution Amount'",
    'Jadikan Biller sebagai "Favourite"',
  ],
  exampleTitle: "Contoh;",
  infoLabel: "Guideline cara pembayaran JomPAY (sama seperti di atas)",
} as const;

export const EASIPAY_GUIDE: {
  title: string;
  intro: string;
  features: PaymentFeatureCard[];
  steps: PaymentGuideStep[];
  doneTitle: string;
  doneBody: string;
  note: string;
} = {
  title: "Tukar kaedah caruman ke kad kredit / debit",
  intro:
    "Mahu setup auto-debit caruman supaya sijil tidak lapse? Ikut panduan ini untuk tukar kaedah pembayaran ke Kad Kredit / Debit (Easi-Pay) melalui portal iGIT — semua boleh dibuat sendiri dalam talian.",
  features: [
    {
      title: "Easi-Pay (Kad Kredit/Debit)",
      body: "Auto-debit melalui kad Visa / Mastercard. Caruman didebitkan terus dari kad anda mengikut tarikh matang.",
    },
    {
      title: "Pantas & Online",
      body: "Tiada borang fizikal. Daftar terus melalui portal iGIT — diluluskan dalam masa 2–5 hari bekerja.",
    },
    {
      title: "Selamat & Pasti",
      body: "Pemilik kad mestilah peserta sendiri ATAU pasangan, anak, ibu bapa, atau adik-beradik. Tidak boleh guna kad orang luar keluarga.",
    },
  ],
  steps: [
    {
      title: "Log Masuk ke i-Get In Touch (iGIT)",
      body: 'Layari igetintouch.greateasterntakaful.com dan log masuk dengan Great ID. Jika belum daftar, klik "Daftar Sekarang" dan ikut pengesahan menggunakan No. IC.',
    },
    {
      title: 'Pergi ke "My Service Request"',
      body: 'Klik menu "My Service Request" di sidebar. Pilih "Change Contribution Method" dari senarai perkhidmatan.',
    },
    {
      title: "Pilih Sijil & Kaedah Baru",
      body: 'Pilih sijil takaful yang mahu dikemaskini. Kemudian pilih "Credit Card" sebagai kaedah caruman baru.',
    },
    {
      title: "Lengkapkan Maklumat Kad",
      body: "Sahkan maklumat hubungan, kemudian masukkan butiran kad: nombor kad, tarikh luput, CVV, nama pemegang, dan hubungan pemegang kad dengan peserta.",
    },
    {
      title: "Pengesahan 3D Secure (OTP)",
      body: "Sistem akan minta pengesahan 3D Secure dari bank. Masukkan OTP yang dihantar melalui SMS/e-mel untuk sahkan transaksi.",
    },
  ],
  doneTitle: "Selesai — Auto-Debit Aktif!",
  doneBody:
    "Diproses dalam 2–5 hari bekerja. Anda akan terima notifikasi apabila kaedah baru diluluskan. Caruman didebitkan automatik mengikut jadual matang sijil.",
  // Rendered with the phone number split out into a `tel:` link -- the
  // wording itself is unchanged from Kamal's copy.
  note:
    "Nota: Hanya kad Visa/Mastercard diterima. Kad antarabangsa mesti ada 3D Secure. Pendaftaran DDA baharu ditangguhkan sementara — guna kad kredit/debit sebagai alternatif.",
};

export const PAYMENT_HELP_UI: Record<
  PortalLang,
  {
    button: string;
    modalTitle: string;
    accordionJompay: string;
    accordionEasipay: string;
    needHelp: string;
    copy: string;
    copied: string;
    ref2Placeholder: string;
    note?: string;
  }
> = {
  bm: {
    button: "Cara Bayar Caruman",
    modalTitle: "Cara Bayar Caruman",
    accordionJompay: "Bayar secara manual (JomPAY)",
    accordionEasipay: "Tukar kaedah caruman ke kad kredit / debit",
    needHelp: "Perlukan bantuan?",
    copy: "Salin",
    copied: "Disalin",
    ref2Placeholder: "No. telefon anda",
  },
  en: {
    button: "How to Pay",
    modalTitle: "How to Pay Your Contribution",
    accordionJompay: "Pay manually (JomPAY)",
    accordionEasipay: "Switch to credit / debit card (Easi-Pay)",
    needHelp: "Need help?",
    copy: "Copy",
    copied: "Copied",
    ref2Placeholder: "Your phone number",
    note: "Guide available in Bahasa Melayu.",
  },
};
