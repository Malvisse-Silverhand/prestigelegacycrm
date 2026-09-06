// Ordered as the conversation actually runs, which is also the left-to-right
// order of the kanban columns: say hello, explain the product, chase, meet,
// close, remind, then look after the client once the policy is inforced.
//
// "Other" stays on the end because templates already carry it -- dropping it
// would strand those rows in a column nothing renders.
export const CATEGORIES = [
  { value: "greeting", label: "Greeting", cls: "bg-info-blue-bg text-info-blue-text", dot: "#1c3f66" },
  { value: "product_info", label: "Product Info", cls: "bg-success-bg text-green", dot: "#0f4c35" },
  { value: "follow_up", label: "Follow Up", cls: "bg-warn-gold-bg text-warn-gold-text", dot: "#fac748" },
  { value: "appointment", label: "Appointment", cls: "bg-[#f0eaf6] text-[#5b3a7a]", dot: "#5b3a7a" },
  { value: "closing", label: "Closing", cls: "bg-success-bg text-green", dot: "#2e8f68" },
  { value: "reminder", label: "Reminder", cls: "bg-alert-red-bg text-alert-red", dot: "#9b2c22" },
  { value: "servicing", label: "Servicing", cls: "bg-[#e6f0ef] text-[#0f4c35]", dot: "#2e8f68" },
  { value: "other", label: "Other", cls: "bg-sand-3 text-taupe-2", dot: "#a29883" },
] as const;

export type WaTemplate = {
  id: string;
  title: string;
  category: string;
  language: string;
  body: string;
  usage_count: number;
  unit_id: string | null;
};

export type LeadForFill = {
  id: string;
  full_name: string;
  phone: string;
  quotations: { product: string; quotation_plans: { sort_order: number; monthly_contribution: number | null; coverage_detail: Record<string, unknown> }[] }[];
};
