"use client";

import { getFormFields, type FormField } from "@/lib/lead-form-fields";

// The application fields the lead form links collect, editable by the agent
// too. Labels, option lists and limits come from the form definitions so the
// two never drift. Fields already in LeadFormFields (address, postcode, state,
// occupation, ...) are not repeated here.
export const EXTRA_FIELD_KEYS = [
  "marital_status",
  "id_no",
  "nationality",
  "race",
  "religion",
  "city",
  "employer_name",
  "employer_address",
  "income_range",
  "height_cm",
  "weight_kg",
  "has_medical_condition",
  "medical_condition_details",
  "correspondence_same",
  "correspondence_address",
  "correspondence_city",
  "correspondence_postcode",
  "correspondence_state",
  "bank_name",
  "bank_account_no",
  "payment_frequency",
  "payment_method",
] as const;

export type ExtraKey = (typeof EXTRA_FIELD_KEYS)[number];
export type LeadExtraDefaults = Partial<Record<ExtraKey, string | number | boolean | null>>;

const LABEL_OVERRIDE: Partial<Record<ExtraKey, string>> = {
  marital_status: "Marital status",
  has_medical_condition: "Existing medical condition",
  medical_condition_details: "Condition details",
  correspondence_same: "Correspondence same as residential",
  correspondence_address: "Correspondence address",
  correspondence_city: "Correspondence city",
  correspondence_postcode: "Correspondence postcode",
  correspondence_state: "Correspondence state",
  employer_name: "Company name",
  income_range: "Monthly income",
};

const CLS =
  "mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold";
const LBL = "text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase";

const BOOLEAN_KEYS = new Set<string>(["has_medical_condition", "correspondence_same"]);

function str(v: string | number | boolean | null | undefined) {
  return v === null || v === undefined ? "" : String(v);
}

export function LeadExtraFields({ defaults }: { defaults: LeadExtraDefaults }) {
  const byKey = new Map<string, FormField>(getFormFields(2).map((f) => [f.key, f]));
  const fields = EXTRA_FIELD_KEYS.map((k) => byKey.get(k)).filter((f): f is FormField => !!f);

  return (
    <details className="rounded-[12px] border border-sand-2 bg-cream px-3.5 py-3">
      <summary className="cursor-pointer text-[12.5px] font-bold text-navy">Application details (identity, employment, health, payment)</summary>
      {/* Tells updateLead these fields were on screen, so a form that does not
          render them (Add Lead, the Leads Manager row edit) never blanks them. */}
      <input type="hidden" name="extra_present" value="1" />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => {
          const key = f.key as ExtraKey;
          const label = LABEL_OVERRIDE[key] ?? f.label;
          const value = str(defaults[key]);
          const isBool = BOOLEAN_KEYS.has(key);
          const wide = f.type === "textarea";
          return (
            <label key={key} className={`block ${wide ? "sm:col-span-2" : ""}`}>
              <span className={LBL}>{label}</span>
              {isBool || f.type === "select" || f.type === "radio" ? (
                <select name={key} defaultValue={value} className={CLS}>
                  <option value="">{isBool ? "Unknown" : "Choose…"}</option>
                  {isBool ? (
                    <>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </>
                  ) : (
                    <>
                      {value && !f.options?.some((o) => o.value === value) && <option value={value}>{value}</option>}
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              ) : f.type === "textarea" ? (
                <textarea name={key} defaultValue={value} rows={2} maxLength={f.maxLength} className={`${CLS} resize-none`} />
              ) : (
                <input
                  name={key}
                  type={f.type === "number" ? "number" : "text"}
                  defaultValue={value}
                  maxLength={f.maxLength}
                  min={f.min}
                  max={f.max}
                  step={f.type === "number" ? "any" : undefined}
                  inputMode={f.type === "number" ? "decimal" : key.endsWith("postcode") ? "numeric" : undefined}
                  className={CLS}
                />
              )}
            </label>
          );
        })}
      </div>
    </details>
  );
}
