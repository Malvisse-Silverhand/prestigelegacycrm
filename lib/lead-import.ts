// Shared, side-effect-free logic for uploading a lead database: auto-mapping a
// spreadsheet's columns to CRM fields and turning each raw row into a clean
// lead. No server imports on purpose -- the upload wizard runs the same code in
// the browser to preview the mapping, and the server runs it again to stage
// the rows, so what the manager sees is what gets saved.

import { MALAYSIAN_STATES, LEAD_SOURCES } from "@/lib/lead-constants";
import { INTEREST_OPTIONS } from "@/lib/product-interest";
import { pickState, pickLeadSource, pickInterest, pickGender } from "@/lib/lead-field-validation";

export const TARGET_FIELDS = [
  "full_name",
  "full_name_suffix",
  "phone",
  "email",
  "date_of_birth",
  "gender",
  "occupation",
  "address",
  "postcode",
  "state",
  "lead_source",
  "interest",
  "is_smoker",
  "agent_remark",
  "best_time_to_reach",
  "budget_indicated",
] as const;
export type TargetField = (typeof TARGET_FIELDS)[number];

export const TARGET_FIELD_LABELS: Record<TargetField, string> = {
  full_name: "Full Name",
  full_name_suffix: "Full Name — extra part (optional, appended after Full Name)",
  phone: "Phone Number",
  email: "Email",
  date_of_birth: "Date of Birth",
  gender: "Gender",
  occupation: "Occupation",
  address: "Address / City",
  postcode: "Postcode",
  state: "State",
  lead_source: "Lead Source",
  interest: "Product/Plan Interest",
  is_smoker: "Smoker",
  agent_remark: "Agent Remark",
  best_time_to_reach: "Best Time to Reach",
  budget_indicated: "Monthly Budget",
};

export type ImportMapping = {
  // CRM field -> the spreadsheet column that feeds it.
  fields: Partial<Record<TargetField, string>>;
  // Extra columns folded into the remark as "Column: value" lines.
  notes: string[];
};

export const MAX_UPLOAD_ROWS = 5000;

// -- Auto-mapping -----------------------------------------------------------

// "tarikh_lahir_(31/12/2025)" -> "tarikh lahir", "merokok?" -> "merokok".
export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/[_\-?.:/\\]+/g, " ")
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// English + Bahasa Malaysia hints, matched against the normalised header.
const AUTO_MATCH: Record<TargetField, string[]> = {
  full_name: ["full name", "nama penuh", "nama", "name"],
  full_name_suffix: ["last name", "surname", "nama akhir"],
  phone: ["phone number", "phone", "telefon", "tel", "mobile", "hp", "no hp", "whatsapp", "contact number"],
  email: ["email", "e mel", "emel"],
  date_of_birth: ["date of birth", "tarikh lahir", "birth date", "birthday", "dob", "lahir", "birth"],
  gender: ["gender", "jantina", "sex"],
  occupation: ["occupation", "job title", "pekerjaan", "job", "kerja", "position"],
  address: ["address", "alamat", "city", "bandar", "town"],
  postcode: ["postcode", "poskod", "postal", "zip"],
  state: ["state", "negeri"],
  lead_source: ["lead source", "sumber", "source", "platform"],
  interest: ["product interest", "interest", "produk", "product", "pelan", "plan"],
  is_smoker: ["smoker", "merokok", "smoking"],
  agent_remark: ["agent remark", "remarks", "remark", "notes", "note", "catatan"],
  best_time_to_reach: ["best time", "waktu sesuai", "time to reach"],
  budget_indicated: ["budget", "bajet"],
};

// A column called "form_name" or "campaign name" is the ad/form's name, never
// the person's -- without this, a sheet with no real name column would put the
// campaign in the Full Name field.
const AVOID_WORDS: Partial<Record<TargetField, string[]>> = {
  full_name: ["form", "campaign", "ad", "adset", "page", "file", "company", "platform"],
  full_name_suffix: ["form", "campaign", "ad", "adset", "page", "file", "company"],
  phone: ["form"],
};

function scoreHeader(header: string, hint: string): number {
  if (header === hint) return 100 + hint.length;
  const words = header.split(" ");
  if (header.startsWith(hint + " ")) return 70 + hint.length;
  if (words.includes(hint)) return 50 + hint.length;
  // Plain substring only for longer hints: "hp"/"tel"/"sex" inside other words
  // ("whatsapp", "hotel", "sextet") would be false positives.
  if (hint.length >= 5 && header.includes(hint)) return 10 + hint.length;
  return 0;
}

// Words in a column name that make it informative enough to keep as a remark by
// default. Everything else (ids, timestamps, platform flags) stays unticked.
const NOTE_HINTS = ["sejarah", "sakit", "medical", "health", "kesihatan", "form", "campaign", "komen", "comment", "question", "soalan"];

export function autoMap(headers: string[]): ImportMapping {
  const norm = headers.map(normalizeHeader);
  const candidates: { field: TargetField; col: number; score: number }[] = [];
  for (const field of TARGET_FIELDS) {
    for (let col = 0; col < headers.length; col++) {
      const words = norm[col].split(" ");
      if (AVOID_WORDS[field]?.some((w) => words.includes(w))) continue;
      let best = 0;
      for (const hint of AUTO_MATCH[field]) best = Math.max(best, scoreHeader(norm[col], hint));
      if (best > 0) candidates.push({ field, col, score: best });
    }
  }
  // Best matches first; each field and each column is used at most once.
  candidates.sort((a, b) => b.score - a.score || a.col - b.col);
  const fields: ImportMapping["fields"] = {};
  const usedCols = new Set<number>();
  for (const c of candidates) {
    if (fields[c.field] !== undefined || usedCols.has(c.col)) continue;
    fields[c.field] = headers[c.col];
    usedCols.add(c.col);
  }
  const notes = headers.filter((h, i) => !usedCols.has(i) && NOTE_HINTS.some((n) => norm[i].includes(n)));
  return { fields, notes };
}

// -- Value normalisers ------------------------------------------------------
// A spreadsheet cell is free-typed human text (often BM), not a controlled form
// value; these turn it into what the manual Add Lead form would have saved.

export function normalizeGender(v: string): string {
  const s = v.trim().toLowerCase();
  if (["male", "lelaki", "l", "m", "man"].includes(s)) return "male";
  if (["female", "wanita", "perempuan", "p", "f", "woman"].includes(s)) return "female";
  return "";
}

export function normalizeSmoker(v: string): "true" | "false" | "" {
  const s = v.trim().toLowerCase();
  if (["yes", "ya", "true", "y", "merokok", "smoker"].includes(s)) return "true";
  if (["no", "tidak", "tak", "false", "t", "n", "bukan perokok", "non smoker", "non-smoker"].includes(s)) return "false";
  return "";
}

function normalizeAgainstList(v: string, list: readonly string[]): string {
  const match = list.find((item) => item.toLowerCase() === v.trim().toLowerCase());
  return match ?? v;
}

const SOURCE_ALIASES: Record<string, string> = {
  fb: "Meta Ads",
  facebook: "Meta Ads",
  ig: "Meta Ads",
  instagram: "Meta Ads",
  meta: "Meta Ads",
  "meta ads": "Meta Ads",
  google: "Google Ads",
  "google ads": "Google Ads",
  wa: "WhatsApp",
  whatsapp: "WhatsApp",
  threads: "Threads",
  referral: "Referral",
  rujukan: "Referral",
};

export function normalizeSource(v: string): string {
  const s = v.trim().toLowerCase();
  return SOURCE_ALIASES[s] ?? normalizeAgainstList(v, LEAD_SOURCES);
}

export function normalizeDob(v: string, now: Date = new Date()): string | null {
  const s = v.trim();
  if (!s) return null;
  let iso: string | null = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) iso = s;
  if (!iso) {
    // DD-Mon-YYYY, e.g. "17-Feb-1987" (Google Sheets' own export format).
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monByName = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{4})$/);
    if (monByName) {
      const idx = monthNames.indexOf(monByName[2].slice(0, 3).toLowerCase());
      if (idx >= 0) iso = `${monByName[3]}-${String(idx + 1).padStart(2, "0")}-${monByName[1].padStart(2, "0")}`;
    }
  }
  if (!iso) {
    // DD/MM/YYYY -- Malaysian convention, day first.
    const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmy) {
      const day = Number(dmy[1]);
      const month = Number(dmy[2]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        iso = `${dmy[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }
  if (!iso) return null;
  // Real calendar date, born between 1900 and today.
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return null;
  if (d.getUTCFullYear() < 1900 || d.getTime() > now.getTime()) return null;
  return iso;
}

// "p:+60125771988" / "+60 12-577 1988" / "0125771988" / "125771988"
//   -> "0125771988". Returns null when it can't be a phone number.
export function cleanPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  if (digits.startsWith("60") && digits.length >= 11) return `0${digits.slice(2)}`;
  if (digits.startsWith("0")) return digits;
  // Malaysian mobile typed without the leading zero (spreadsheets drop it).
  if (digits.length <= 10 && /^1\d{8,9}$/.test(digits)) return `0${digits}`;
  return digits;
}

// What two phone numbers are compared on: digits only, with the country code
// and trunk zero removed, so +6012..., 6012... and 012... are the same person.
export function phoneKey(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^60/, "").replace(/^0+/, "");
}

// -- Row building -----------------------------------------------------------

export type StagedRow = {
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | null;
  is_smoker: boolean | null;
  occupation: string | null;
  address: string | null;
  postcode: string | null;
  state: string | null;
  lead_source: string | null;
  interest: string | null;
  agent_remark: string | null;
  best_time_to_reach: string | null;
  budget_indicated: string | null;
};

export type RowDefaults = { interest?: string | null; leadSource?: string | null };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cap(v: string, n: number): string {
  return v.length > n ? v.slice(0, n) : v;
}

export function buildImportRow(
  raw: Record<string, string>,
  mapping: ImportMapping,
  defaults: RowDefaults = {},
): { row: StagedRow | null; reason?: string } {
  const get = (field: TargetField) => {
    const col = mapping.fields[field];
    return col ? (raw[col] ?? "").trim() : "";
  };

  const full_name = cap([get("full_name"), get("full_name_suffix")].filter(Boolean).join(" ").trim(), 120);
  const phoneRaw = get("phone");
  if (!full_name || !phoneRaw) {
    return {
      row: null,
      reason: !full_name && !phoneRaw ? "missing name and phone" : !full_name ? "missing name" : "missing phone",
    };
  }
  const phone = cleanPhone(phoneRaw);
  if (!phone) return { row: null, reason: "invalid phone number" };

  const postcodeRaw = get("postcode");
  const emailRaw = get("email").toLowerCase();
  const smoker = normalizeSmoker(get("is_smoker"));

  // The mapped remark first, then each ticked extra column as "Label: value".
  const remarkParts: string[] = [];
  const mappedRemark = get("agent_remark");
  if (mappedRemark) remarkParts.push(mappedRemark);
  for (const col of mapping.notes) {
    const value = (raw[col] ?? "").trim();
    if (value) {
      const label = normalizeHeader(col) || col;
      remarkParts.push(`${label.charAt(0).toUpperCase()}${label.slice(1)}: ${value}`);
    }
  }

  const sourceRaw = get("lead_source");
  const interestRaw = get("interest");

  return {
    row: {
      full_name,
      phone,
      email: emailRaw && EMAIL_RE.test(emailRaw) ? cap(emailRaw, 160) : null,
      date_of_birth: normalizeDob(get("date_of_birth")),
      gender: pickGender(normalizeGender(get("gender"))),
      is_smoker: smoker === "" ? null : smoker === "true",
      occupation: cap(get("occupation"), 120) || null,
      address: cap(get("address"), 300) || null,
      postcode: /^\d{5}$/.test(postcodeRaw) ? postcodeRaw : null,
      state: pickState(normalizeAgainstList(get("state"), MALAYSIAN_STATES)),
      lead_source:
        (sourceRaw ? pickLeadSource(normalizeSource(sourceRaw)) : null) ?? defaults.leadSource ?? null,
      interest:
        (interestRaw
          ? pickInterest(normalizeAgainstList(interestRaw, INTEREST_OPTIONS.map((o) => o.label)))
          : null) ?? defaults.interest ?? null,
      agent_remark: cap(remarkParts.join(" · "), 1000) || null,
      best_time_to_reach: cap(get("best_time_to_reach"), 120) || null,
      budget_indicated: cap(get("budget_indicated"), 60) || null,
    },
  };
}
