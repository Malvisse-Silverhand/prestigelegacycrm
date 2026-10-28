import type { LeadDetail } from "./data";

function yesNo(v: boolean | null) {
  return v === true ? "Yes" : v === false ? "No" : null;
}

function join(parts: (string | null | undefined)[]) {
  const out = parts.filter((p) => p && p.trim()).join(", ");
  return out || null;
}

function Item({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">{label}</div>
      <div className="mt-[3px] text-[13px] font-semibold break-words text-navy">{value || "—"}</div>
    </div>
  );
}

/**
 * The application fields collected through the lead form links (or typed in by
 * the agent), grouped so the card reads as sections rather than a wall of
 * labels. Collapsed until there is something in it.
 */
export function LeadExtraDetails({ lead }: { lead: LeadDetail }) {
  const groups: { title: string; items: { label: string; value: string | null }[] }[] = [
    {
      title: "Identity",
      items: [
        { label: "NRIC number", value: lead.id_no },
        { label: "Nationality", value: lead.nationality },
      ],
    },
    {
      title: "Personal",
      items: [
        { label: "Marital status", value: lead.marital_status },
        { label: "Race", value: lead.race },
        { label: "Religion", value: lead.religion },
      ],
    },
    {
      title: "Employment",
      items: [
        { label: "Company", value: lead.employer_name },
        { label: "Work location", value: lead.employer_address },
        { label: "Monthly income", value: lead.income_range },
      ],
    },
    {
      title: "Address",
      items: [
        { label: "Residential", value: join([lead.address, lead.city, lead.postcode, lead.state]) },
      ],
    },
    {
      title: "Correspondence",
      items: [
        {
          label: "Correspondence address",
          value:
            lead.correspondence_same === true
              ? "Same as residential"
              : join([
                  lead.correspondence_address,
                  lead.correspondence_city,
                  lead.correspondence_postcode,
                  lead.correspondence_state,
                ]),
        },
      ],
    },
    {
      title: "Health",
      items: [
        { label: "Height", value: lead.height_cm != null ? `${lead.height_cm} cm` : null },
        { label: "Weight", value: lead.weight_kg != null ? `${lead.weight_kg} kg` : null },
        { label: "Medical condition", value: yesNo(lead.has_medical_condition) },
        ...(lead.has_medical_condition ? [{ label: "Condition details", value: lead.medical_condition_details }] : []),
      ],
    },
    {
      title: "Payment",
      items: [
        { label: "Bank", value: lead.bank_name },
        { label: "Account number", value: lead.bank_account_no },
        { label: "Payment frequency", value: lead.payment_frequency },
        { label: "Payment method", value: lead.payment_method },
      ],
    },
  ];

  const hasAny = groups.some((g) => g.items.some((i) => i.value));

  return (
    <details open={hasAny} className="group mt-4 border-t border-sand-3 pt-3.5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[12.5px] font-bold text-navy">
        <span>Application details</span>
        <span className="text-[11px] font-semibold text-taupe group-open:hidden">{hasAny ? "Show" : "None yet"}</span>
        <span className="hidden text-[11px] font-semibold text-taupe group-open:inline">Hide</span>
      </summary>
      <div className="mt-3 flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="text-[11px] font-bold tracking-[0.08em] text-green uppercase">{g.title}</div>
            <div className="mt-2 grid grid-cols-1 gap-x-5 gap-y-[12px] sm:grid-cols-2">
              {g.items.map((i) => (
                <Item key={i.label} label={i.label} value={i.value} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
