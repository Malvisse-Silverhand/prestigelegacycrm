export const CATEGORIES = [
  { value: "greeting", label: "Greeting", cls: "bg-info-blue-bg text-info-blue-text" },
  { value: "follow_up", label: "Follow Up", cls: "bg-warn-gold-bg text-warn-gold-text" },
  { value: "appointment", label: "Appointment", cls: "bg-[#f0eaf6] text-[#5b3a7a]" },
  { value: "product_info", label: "Product Info", cls: "bg-success-bg text-green" },
  { value: "closing", label: "Closing", cls: "bg-success-bg text-green" },
  { value: "reminder", label: "Reminder", cls: "bg-alert-red-bg text-alert-red" },
  { value: "other", label: "Other", cls: "bg-sand-3 text-taupe-2" },
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
