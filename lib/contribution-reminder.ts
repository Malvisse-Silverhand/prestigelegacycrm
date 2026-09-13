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
