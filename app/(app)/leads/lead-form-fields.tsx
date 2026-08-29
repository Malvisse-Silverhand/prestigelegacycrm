"use client";

import { useState } from "react";
import { INTEREST_OPTIONS } from "@/lib/product-interest";
import { MALAYSIAN_STATES, LEAD_SOURCES } from "@/lib/lead-constants";
import { ageNextBirthday } from "@/lib/age";

export type LeadFormDefaults = {
  full_name?: string;
  phone?: string;
  email?: string | null;
  date_of_birth?: string | null;
  gender?: "male" | "female" | null;
  is_smoker?: boolean | null;
  occupation?: string | null;
  interest?: string | null;
  address?: string | null;
  postcode?: string | null;
  state?: string | null;
  lead_source?: string | null;
  status?: string | null;
  agent_remark?: string | null;
};

const STATUS_OPTIONS = ["hot", "warm", "cold"] as const;

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Full editable field set shared by Add Lead and Edit Lead -- both forms are
// plain FormData submits, so this renders uncontrolled named inputs (no
// per-field state) except Date of Birth, which needs local state to drive
// the read-only ANB display next to it.
export function LeadFormFields({ defaults }: { defaults: LeadFormDefaults }) {
  const [dob, setDob] = useState(defaults.date_of_birth ?? "");
  const anb = dob ? ageNextBirthday(dob) : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full Name" name="full_name" defaultValue={defaults.full_name} required />
        <Field label="Phone Number" name="phone" defaultValue={defaults.phone} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" name="email" type="email" defaultValue={defaults.email ?? ""} />
        <label className="block">
          <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Product/Plan Interest</span>
          <select
            name="interest"
            defaultValue={defaults.interest ?? ""}
            className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy"
          >
            <option value="">Choose…</option>
            {INTEREST_OPTIONS.map((o) => (
              <option key={o.label} value={o.label}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of Birth" name="date_of_birth" type="date" defaultValue={defaults.date_of_birth ?? ""} onChange={setDob} />
        <div>
          <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Current Age (ANB)</span>
          <div className="mt-1.5 flex h-[42px] items-center rounded-[10px] border border-sand-2 bg-cream px-3 text-[13px] font-medium text-taupe-2">
            {anb !== null ? `${anb} years` : "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Gender</span>
          <select
            name="gender"
            defaultValue={defaults.gender ?? ""}
            className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy"
          >
            <option value="">Unknown</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Smoker</span>
          <select
            name="is_smoker"
            defaultValue={defaults.is_smoker === null || defaults.is_smoker === undefined ? "" : String(defaults.is_smoker)}
            className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy"
          >
            <option value="">Unknown</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Occupation" name="occupation" defaultValue={defaults.occupation ?? ""} />
        <label className="block">
          <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Status</span>
          <select
            name="status"
            defaultValue={defaults.status ?? "warm"}
            className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{cap(s)}</option>
            ))}
            {defaults.status && !(STATUS_OPTIONS as readonly string[]).includes(defaults.status) && (
              <option value={defaults.status}>{cap(defaults.status)}</option>
            )}
          </select>
        </label>
      </div>

      <Field label="Address" name="address" defaultValue={defaults.address ?? ""} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Postcode" name="postcode" defaultValue={defaults.postcode ?? ""} pattern="\d{5}" maxLength={5} inputMode="numeric" placeholder="e.g. 50450" />
        <label className="block">
          <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">State</span>
          <select
            name="state"
            defaultValue={defaults.state ?? ""}
            className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy"
          >
            <option value="">Choose…</option>
            {MALAYSIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Lead Source</span>
        <select
          name="lead_source"
          defaultValue={defaults.lead_source ?? ""}
          className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy"
        >
          <option value="">Choose…</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Agent Remark</span>
        <textarea
          name="agent_remark"
          defaultValue={defaults.agent_remark ?? ""}
          rows={2}
          placeholder="A persistent note about this lead, shown directly on Lead Details (not the activity timeline)"
          className="mt-1.5 w-full resize-none rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
        />
      </label>
    </>
  );
}

function Field({
  label, name, required, type = "text", defaultValue, onChange, pattern, maxLength, inputMode, placeholder,
}: {
  label: string; name: string; required?: boolean; type?: string; defaultValue?: string;
  onChange?: (value: string) => void; pattern?: string; maxLength?: number;
  inputMode?: "numeric" | "text" | "email" | "tel"; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        pattern={pattern}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
      />
    </label>
  );
}
