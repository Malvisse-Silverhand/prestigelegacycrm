// The contribution checklist behind the Servicing screen.
//
// Six years of dues from the certificate's commencement date, spaced by the
// frequency the client actually pays on -- so a yearly payer gets six rows,
// not seventy-two that mean nothing to them.
//
// Pure over YYYY-MM-DD strings, like lib/waiting-periods: the caller says what
// today is, nothing here reads a clock.

export type PaymentFrequency = "monthly" | "quarterly" | "half_yearly" | "yearly";

export const PAYMENT_FREQUENCIES: { value: PaymentFrequency; label: string; months: number }[] = [
  { value: "monthly", label: "Monthly", months: 1 },
  { value: "quarterly", label: "Quarterly", months: 3 },
  { value: "half_yearly", label: "Half-yearly", months: 6 },
  { value: "yearly", label: "Yearly", months: 12 },
];

/** How long an agent is expected to keep watch over a new client's payments. */
export const SCHEDULE_YEARS = 6;

export function monthsPerPayment(frequency: PaymentFrequency): number {
  return PAYMENT_FREQUENCIES.find((f) => f.value === frequency)?.months ?? 1;
}

export function frequencyLabel(frequency: PaymentFrequency): string {
  return PAYMENT_FREQUENCIES.find((f) => f.value === frequency)?.label ?? frequency;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * YYYY-MM-DD plus N months, clamping the day to the end of the target month.
 * A certificate commencing on the 31st is due on the 28th/29th in February
 * rather than rolling into March, which is how the operator bills it.
 */
export function addMonths(dateKey: string, months: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const ty = target.getUTCFullYear();
  const tm = target.getUTCMonth();
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return `${ty}-${pad(tm + 1)}-${pad(Math.min(d, lastDay))}`;
}

export type ScheduleRow = { seq: number; dueDate: string };

/**
 * Every due date for the six-year window, starting at commencement itself --
 * the first contribution is taken on the day cover starts, which is what the
 * certificate's "Last paid date = commencement date" reflects.
 */
export function buildSchedule(commencementDate: string, frequency: PaymentFrequency): ScheduleRow[] {
  const step = monthsPerPayment(frequency);
  const count = (SCHEDULE_YEARS * 12) / step;
  return Array.from({ length: count }, (_, i) => ({
    seq: i + 1,
    dueDate: addMonths(commencementDate, i * step),
  }));
}

export type ScheduleStatus = "paid" | "due" | "overdue" | "upcoming";

/**
 * What a row should read as today. "due" is the one currently owed, "overdue"
 * is one whose date has passed unticked -- the distinction an agent chases on.
 */
export function rowStatus(row: { dueDate: string; paid: boolean }, today: string): ScheduleStatus {
  if (row.paid) return "paid";
  if (row.dueDate < today) return "overdue";
  if (row.dueDate === today) return "due";
  return "upcoming";
}

export type ScheduleSummary = {
  total: number;
  paid: number;
  overdue: number;
  /** The next unpaid due date, or null once every row is ticked. */
  nextDue: string | null;
  paidPct: number;
};

export function summariseSchedule(
  rows: { dueDate: string; paid: boolean }[],
  today: string,
): ScheduleSummary {
  const paid = rows.filter((r) => r.paid).length;
  const overdue = rows.filter((r) => !r.paid && r.dueDate < today).length;
  const next = rows.filter((r) => !r.paid).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return {
    total: rows.length,
    paid,
    overdue,
    nextDue: next?.dueDate ?? null,
    paidPct: rows.length > 0 ? Math.round((paid / rows.length) * 100) : 0,
  };
}
