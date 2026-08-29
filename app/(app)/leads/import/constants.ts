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
  address: "Address",
  postcode: "Postcode",
  state: "State",
  lead_source: "Lead Source",
  interest: "Product/Plan Interest",
  is_smoker: "Smoker",
  agent_remark: "Agent Remark",
  best_time_to_reach: "Best Time to Reach",
  budget_indicated: "Monthly Budget",
};

export type ColumnMapping = Partial<Record<TargetField, string>>;
