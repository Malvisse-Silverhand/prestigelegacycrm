export const MALAYSIAN_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Wilayah Persekutuan Kuala Lumpur",
  "Wilayah Persekutuan Labuan",
  "Wilayah Persekutuan Putrajaya",
] as const;
export type MalaysianState = (typeof MALAYSIAN_STATES)[number];

export const LEAD_SOURCES = ["Meta Ads", "Google Ads", "Threads", "Referral", "Direct Approach", "WhatsApp", "Other"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

// Takaful risk-rating band for the lead's job -- same scale and wording the
// standalone calculators already use (mq-occ in imedi-evolusi-quote.html),
// so an agent reads the same classes in both places.
export const OCCUPATION_CLASSES = [
  { value: "1", label: "Class 1 — Professional (accountant, teacher, executive)" },
  { value: "2", label: "Class 2 — Semi-manual (nurse, supervisor)" },
  { value: "3", label: "Class 3 — Manual (mechanic, driver)" },
  { value: "4", label: "Class 4 — High risk (offshore, construction)" },
] as const;
export type OccupationClass = (typeof OCCUPATION_CLASSES)[number]["value"];
export const OCCUPATION_DIRECTORY_URL = "https://velvety-peony-7d44ec.netlify.app/";
