"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { csvToObjects } from "@/lib/csv-parse";
import { MALAYSIAN_STATES, LEAD_SOURCES } from "@/lib/lead-constants";
import { INTEREST_OPTIONS } from "@/lib/product-interest";
import { pickState, pickLeadSource, pickInterest, pickStatus, pickGender } from "@/lib/lead-field-validation";
import { TARGET_FIELDS, type TargetField, type ColumnMapping } from "./constants";

// Keyword hints for auto-suggesting a column mapping (English + Bahasa
// Malaysia, since a real agent's sheet -- like the one this was tested
// against -- is very often in BM). First matching header wins.
const AUTO_MATCH: Record<TargetField, string[]> = {
  full_name: ["full name", "nama", "name"],
  full_name_suffix: ["last name", "surname"],
  phone: ["phone", "telefon", "mobile", "hp", "whatsapp"],
  email: ["email", "emel"],
  date_of_birth: ["date of birth", "dob", "tarikh lahir", "birthday"],
  gender: ["gender", "jantina", "sex"],
  occupation: ["occupation", "job", "pekerjaan", "position"],
  address: ["address", "alamat"],
  postcode: ["postcode", "poskod", "zip"],
  state: ["state", "negeri"],
  lead_source: ["lead source", "source", "sumber"],
  interest: ["interest", "plan", "pelan", "produk", "product"],
  is_smoker: ["smoker", "merokok", "smoking"],
  agent_remark: ["agent remark", "remark", "note", "catatan"],
  best_time_to_reach: ["best time", "waktu sesuai", "time to reach"],
  budget_indicated: ["budget", "bajet"],
};

function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const field of TARGET_FIELDS) {
    const hints = AUTO_MATCH[field];
    const match = headers.find((h) => hints.some((hint) => h.toLowerCase().includes(hint)));
    if (match) mapping[field] = match;
  }
  return mapping;
}

// Only Google's own published-CSV domain is allowed -- this fetches an
// arbitrary user-supplied URL server-side, so keeping it scoped to the one
// intended source (rather than any URL) limits what this endpoint can be
// used to probe.
function isAllowedSheetUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname === "docs.google.com" && u.pathname.includes("/pub");
  } catch {
    return false;
  }
}

const MAX_ROWS = 2000;

async function fetchAndParse(url: string) {
  if (!isAllowedSheetUrl(url)) {
    throw new Error("That doesn't look like a published Google Sheets CSV link.");
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Couldn't fetch that sheet (HTTP ${res.status}). Check the link is published and set to CSV.`);
  const text = await res.text();
  const { headers, rows } = csvToObjects(text);
  if (headers.length === 0) throw new Error("That sheet appears to be empty.");
  return { headers, rows: rows.slice(0, MAX_ROWS), truncated: rows.length > MAX_ROWS, totalRows: rows.length };
}

export async function previewSheet(url: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  try {
    const { headers, rows, truncated, totalRows } = await fetchAndParse(url);
    return {
      error: null,
      headers,
      sampleRows: rows.slice(0, 8),
      totalRows,
      truncated,
      autoMapping: autoDetectMapping(headers),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't read that sheet." };
  }
}

// -- Raw-text normalizers ---------------------------------------------------
// A spreadsheet cell is free-typed human text (often BM), not a controlled
// form value -- these turn it into the same canonical values the manual
// Add/Edit Lead form would submit, before handing off to the shared
// pick*() validators in lib/lead-field-validation.ts.

function normalizeGender(v: string): string {
  const s = v.trim().toLowerCase();
  if (["male", "lelaki", "l", "m"].includes(s)) return "male";
  if (["female", "wanita", "perempuan", "p", "f"].includes(s)) return "female";
  return "";
}

function normalizeSmoker(v: string): string {
  const s = v.trim().toLowerCase();
  if (["yes", "ya", "true", "y"].includes(s)) return "true";
  if (["no", "tidak", "false", "t"].includes(s)) return "false";
  return "";
}

function normalizeAgainstList(v: string, list: readonly string[]): string {
  const match = list.find((item) => item.toLowerCase() === v.trim().toLowerCase());
  return match ?? v;
}

function normalizeDob(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  // Already ISO.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD-Mon-YYYY or DD/Mon/YYYY, e.g. "17-Feb-1987" (Google Sheets' own
  // default date export format).
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const monByName = s.match(/^(\d{1,2})[-/]([A-Za-z]{3,})[-/](\d{4})$/);
  if (monByName) {
    const idx = monthNames.indexOf(monByName[2].slice(0, 3).toLowerCase());
    if (idx >= 0) return `${monByName[3]}-${String(idx + 1).padStart(2, "0")}-${monByName[1].padStart(2, "0")}`;
  }
  // DD/MM/YYYY (Malaysian convention, day first).
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]), month = Number(dmy[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${dmy[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function normalizePhone(v: string) {
  return v.replace(/\D/g, "").replace(/^60/, "").replace(/^0/, "");
}

type ImportRow = {
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

function buildRow(raw: Record<string, string>, mapping: ColumnMapping): { row: ImportRow | null; reason?: string } {
  const get = (field: TargetField) => {
    const col = mapping[field];
    return col ? (raw[col] ?? "").trim() : "";
  };

  const nameSuffix = get("full_name_suffix");
  const full_name = [get("full_name"), nameSuffix].filter(Boolean).join(" ").trim();
  const phone = get("phone").trim();
  if (!full_name || !phone) {
    return { row: null, reason: !full_name && !phone ? "missing name and phone" : !full_name ? "missing name" : "missing phone" };
  }

  const postcodeRaw = get("postcode");
  const postcode = /^\d{5}$/.test(postcodeRaw) ? postcodeRaw : null;

  return {
    row: {
      full_name,
      phone,
      email: get("email") || null,
      date_of_birth: normalizeDob(get("date_of_birth")),
      gender: pickGender(normalizeGender(get("gender"))),
      is_smoker: normalizeSmoker(get("is_smoker")) === "" ? null : normalizeSmoker(get("is_smoker")) === "true",
      occupation: get("occupation") || null,
      address: get("address") || null,
      postcode,
      state: pickState(normalizeAgainstList(get("state"), MALAYSIAN_STATES)),
      lead_source: pickLeadSource(normalizeAgainstList(get("lead_source"), LEAD_SOURCES)),
      interest: pickInterest(normalizeAgainstList(get("interest"), INTEREST_OPTIONS.map((o) => o.label))),
      agent_remark: get("agent_remark") || null,
      best_time_to_reach: get("best_time_to_reach") || null,
      budget_indicated: get("budget_indicated") || null,
    },
  };
}
export type ImportSummary = {
  imported: number;
  skippedDuplicates: number;
  failed: { row: number; reason: string }[];
};

export async function confirmImport(url: string, mapping: ColumnMapping): Promise<{ error: string | null; summary?: ImportSummary }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  if (!mapping.full_name || !mapping.phone) {
    return { error: "Full Name and Phone Number must be mapped to a column before importing." };
  }

  let parsed;
  try {
    parsed = await fetchAndParse(url);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't read that sheet." };
  }

  const supabase = await createClient();
  const { data: existingLeads } = await supabase.from("leads").select("phone");
  const existingPhones = new Set((existingLeads ?? []).map((l) => normalizePhone(l.phone)));
  const seenThisBatch = new Set<string>();

  const summary: ImportSummary = { imported: 0, skippedDuplicates: 0, failed: [] };
  const toInsert: Record<string, unknown>[] = [];

  parsed.rows.forEach((raw, i) => {
    const { row, reason } = buildRow(raw, mapping);
    if (!row) {
      summary.failed.push({ row: i + 2, reason: reason ?? "invalid row" }); // +2: header row + 1-index
      return;
    }
    const normPhone = normalizePhone(row.phone);
    if (!normPhone || existingPhones.has(normPhone) || seenThisBatch.has(normPhone)) {
      summary.skippedDuplicates++;
      return;
    }
    seenThisBatch.add(normPhone);
    toInsert.push({
      ...row,
      status: pickStatus("", "warm"),
      unit_id: profile.unit_id,
      agent_id: profile.id,
    });
  });

  if (toInsert.length > 0) {
    const { error, count } = await supabase.from("leads").insert(toInsert, { count: "exact" });
    if (error) {
      return { error: "Import failed while saving to the database. Nothing was imported -- please try again." };
    }
    summary.imported = count ?? toInsert.length;
  }

  revalidatePath("/leads");
  return { error: null, summary };
}
