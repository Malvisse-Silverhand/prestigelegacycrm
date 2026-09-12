// Medical card waiting periods, as Great Eastern Takaful sets them out.
//
// Every date here is derived from one input -- the certificate's risk
// commencement date -- so an agent never has to work out "is this claimable
// yet" in their head while a client is on the phone.
//
// Pure functions over YYYY-MM-DD strings on purpose: no clock reads, no
// timezone, nothing that can render differently on the server than in the
// browser. The caller decides what "today" is and passes it in.

export type WaitingPeriodKey = "immediate" | "general" | "specified" | "pre_existing";

export type WaitingPeriod = {
  key: WaitingPeriodKey;
  label: string;
  /** Days after commencement before cover starts. 0 = the moment it inforces. */
  days: number;
  /** What the wait buys you, in one line. */
  summary: string;
  conditions: string[];
};

// Ordered shortest wait first, which is also the order an agent reads them:
// what is covered right now, then what comes later.
export const WAITING_PERIODS: WaitingPeriod[] = [
  {
    key: "immediate",
    label: "Immediate",
    days: 0,
    summary: "Accidents are covered the moment the certificate is inforced.",
    conditions: [
      "Road accidents",
      "Workplace injuries",
      "Falls, impacts, burns",
      "Fractures from accidents",
      "Sports injuries",
      "Domestic accidents",
    ],
  },
  {
    key: "general",
    label: "30 days",
    days: 30,
    summary: "General illness, once 30 days have passed since commencement.",
    conditions: [
      "Dengue fever",
      "Tuberculosis",
      "Typhoid",
      "Malaria",
      "Pneumonia",
      "Acute gastroenteritis",
      "Acute asthma",
      "Urinary tract infections",
      "Appendicitis",
      "Viral and bacterial infections",
      "Minor injuries (non-accident)",
      "New diabetes complications",
    ],
  },
  {
    key: "specified",
    label: "120 days",
    days: 120,
    summary: "The twelve specified illness categories.",
    conditions: [
      "Hypertension, diabetes and heart disease",
      "Tumours, cancer, cysts and polyps",
      "Kidney stones and gallstones",
      "ENT conditions including sinusitis",
      "Hernia, haemorrhoids and fistula",
      "Hydrocele and varicose veins",
      "Endometriosis and reproductive system conditions",
      "Spinal disease (slipped disc)",
      "Knee conditions and internal derangement",
      "Tonsillectomy and adenoidectomy",
      "Surgery for congenital conditions",
      "Cataracts",
    ],
  },
  {
    key: "pre_existing",
    label: "2 years",
    days: 730,
    summary: "Pre-existing conditions, and only if they were declared at application.",
    conditions: [
      "Existing diabetes",
      "Pre-existing hypertension",
      "Pre-existing heart disease",
      "Chronic asthma",
      "Kidney disease",
      "Other previously diagnosed conditions",
    ],
  },
];

// Rules that apply regardless of how long the client has been covered. Kept
// alongside the periods because an agent answering "am I covered yet" is
// usually asked "and how much will I pay" in the same breath.
export const COVER_NOTES = [
  "Outpatient co-payment of 5% at Great Clinic panel locations, capped at RM500 a year.",
  "20% co-takaful applies at non-panel hospitals.",
  "Deductible and co-takaful are both waived for confirmed emergencies.",
  "Deductible is waived at government hospitals.",
  "Claims must be submitted within 180 days of the discharge date.",
];

export const GREAT_JOURNEY_GUIDE_URL =
  "https://takaful4us.com/panduan-the-great-journey-medical-card-great-eastern/";
export const CLIENT_PORTAL_URL = "https://takaful4us.com/medical-card-client-portal/";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** YYYY-MM-DD plus N days, done in UTC so no timezone can shift the day. */
export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const out = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
  return `${out.getUTCFullYear()}-${pad(out.getUTCMonth() + 1)}-${pad(out.getUTCDate())}`;
}

export type WaitingPeriodStatus = WaitingPeriod & {
  /** The day cover under this period begins. */
  startsOn: string;
  /** True once `today` has reached it. */
  active: boolean;
  /** Days still to wait, 0 once active. */
  daysRemaining: number;
};

/**
 * Each waiting period resolved against a certificate's commencement date.
 * `today` is passed in rather than read here so the result is a pure function
 * of its inputs -- the same reason lib/birthdays takes a todayKey.
 */
export function waitingPeriodsFor(commencementDate: string, today: string): WaitingPeriodStatus[] {
  return WAITING_PERIODS.map((period) => {
    const startsOn = addDays(commencementDate, period.days);
    const active = today >= startsOn;
    const daysRemaining = active
      ? 0
      : Math.ceil((new Date(startsOn).getTime() - new Date(today).getTime()) / 86400000);
    return { ...period, startsOn, active, daysRemaining };
  });
}
