// The WhatsApp reminder an agent sends a client about their contribution.
//
// Pure and parameterised so it can be checked without a browser, and so the
// wording lives in one place rather than being retyped differently by every
// agent. It lands in WhatsApp's compose box, not in a send queue -- the agent
// reads it and can change anything before it goes.

import type { PaymentFrequency } from "@/lib/contribution-schedule";

// The message is Malay, so the cadence has to be too -- the English label off
// the frequency dropdown read "Sumbangan yearly yang seterusnya".
const FREQUENCY_MS: Record<PaymentFrequency, string> = {
  monthly: "bulanan",
  quarterly: "suku tahunan",
  half_yearly: "setengah tahunan",
  yearly: "tahunan",
};

/** YYYY-MM-DD -> DD/MM/YYYY, the way every other date in this app prints. */
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtAmount(n: number | null): string | null {
  if (n == null) return null;
  return `RM${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type ReminderInput = {
  clientName: string;
  planName: string;
  certificateNo: string | null;
  /** The contribution amount per payment, if the case records one. */
  amount: number | null;
  /** How often they pay. Rendered in Malay, like the rest of the message. */
  frequency: PaymentFrequency;
  /** The next contribution that isn't ticked, or null once all are. */
  nextDue: string | null;
  /** How many dues have passed unticked. */
  overdue: number;
  /** Religion as recorded on the case, used only to pick the greeting. */
  religion: string | null;
  agentName: string | null;
};

/**
 * Malay, because that is the language these clients are actually written to
 * in, and deliberately soft: a contribution reminder goes to someone who has
 * very likely already paid, so it asks them to check rather than telling them
 * they are late, and says outright to ignore it if payment is done.
 */
export function contributionReminder(input: ReminderInput): string {
  const muslim = /islam|muslim/i.test(input.religion ?? "");
  const greeting = muslim ? "Assalamualaikum" : "Salam sejahtera";
  const name = input.clientName.trim() || "encik/puan";

  const certificate = input.certificateNo ? ` (No. sijil ${input.certificateNo})` : "";
  const amount = fmtAmount(input.amount);

  const lines = [
    `${greeting} ${name},`,
    "",
    `Semoga encik/puan sihat sentiasa. Ini peringatan mesra daripada saya berkenaan sijil takaful ${input.planName}${certificate}.`,
    "",
  ];

  if (input.overdue > 0 && input.nextDue) {
    lines.push(
      `Rekod saya menunjukkan sumbangan bertarikh ${fmtDate(input.nextDue)}${
        amount ? ` berjumlah ${amount}` : ""
      } masih belum ditanda sebagai dibayar.`,
    );
  } else if (input.nextDue) {
    lines.push(
      `Sumbangan ${FREQUENCY_MS[input.frequency] ?? "berkala"} yang seterusnya${
        amount ? ` berjumlah ${amount}` : ""
      } jatuh pada ${fmtDate(input.nextDue)}.`,
    );
  } else {
    lines.push("Semua sumbangan dalam rekod saya sudah lengkap ditanda — terima kasih atas komitmen encik/puan.");
  }

  if (input.nextDue) {
    lines.push(
      "",
      "Mohon encik/puan semak pembayaran sumbangan ini supaya perlindungan kekal aktif. Sekiranya pembayaran sudah dibuat, mohon abaikan mesej ini.",
    );
  }

  lines.push("", "Sebarang pertanyaan, boleh terus hubungi saya. Terima kasih.");
  if (input.agentName) lines.push("", input.agentName);

  return lines.join("\n");
}

const JOMPAY_BILLER_CODE = "16899";
const JOMPAY_BILLER_NAME = "GREAT EASTERN TAKAFUL-FAMILY";
const JOMPAY_GUIDE_URL = "https://takaful4us.com/go/jompay-guideline";

export type JompayReminderInput = {
  clientName: string;
  /** Bare number, no RM prefix -- typed straight into a bank app's amount field. */
  certificateNo: string;
  phone: string;
  /** The registration/contribution amount, formatted bare for the same reason. */
  amount: number;
};

/**
 * The JomPay payment instructions sent the moment a case comes back from
 * underwriting -- this is the registration payment that actually activates
 * the policy, which is why it only shows up on the certificate's first year.
 *
 * The certificate number and amount are printed bare, without an "RM" prefix
 * or thousands separators: JomPay's own Ref-1/Ref-2/Amount fields expect the
 * plain values, not a formatted string, so this hands the client something
 * they can copy straight in rather than something they have to first clean up.
 */
export function jompayReminder(input: JompayReminderInput): string {
  const name = input.clientName.trim() || "encik/puan";
  const amount = input.amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return [
    "Tahniah. Polisi anda lulus proses underwriting!",
    "",
    "Untuk aktifkan polisi anda, sila lakukan pembayaran pendaftaran polisi.",
    "",
    "Cara Pembayaran",
    "1. Buka aplikasi bank anda dan cari JomPAY di bawah 'Pay/Pembayaran'",
    `2. Masukkan Biller Code ${JOMPAY_BILLER_CODE} untuk ${JOMPAY_BILLER_NAME}`,
    "3. Masukkan 10 digit 'Certificate Number' di bahagian 'Ref-1'",
    "4. Masukkan nombor telefon bimbit di 'Ref-2'",
    "5. Letak jumlah 'Contribution Amount'",
    "6. Jadikan Biller sebagai \"Favourite\"",
    "",
    `Untuk certificate ${name};`,
    `Biller code : ${JOMPAY_BILLER_CODE}`,
    `Ref 1 : ${input.certificateNo}`,
    `Ref 2: ${input.phone}`,
    `Amount: ${amount}`,
    "",
    "Info",
    `Guideline cara pembayaran JomPAY(sama seperti di atas): ${JOMPAY_GUIDE_URL}`,
  ].join("\n");
}
