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
