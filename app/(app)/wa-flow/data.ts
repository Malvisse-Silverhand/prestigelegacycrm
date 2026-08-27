import { createClient } from "@/lib/supabase/server";
import type { WaTemplate, LeadForFill } from "./types";

export { CATEGORIES } from "./types";
export type { WaTemplate, LeadForFill } from "./types";

export async function getTemplates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wa_templates")
    .select("id, title, category, language, body, usage_count, unit_id")
    .order("title")
    .returns<WaTemplate[]>();
  return data ?? [];
}

export async function getLeadForFill(leadId: string): Promise<LeadForFill | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("id, full_name, phone, quotations(product, quotation_plans(sort_order, monthly_contribution, coverage_detail))")
    .eq("id", leadId)
    .single<LeadForFill>();
  return data ?? null;
}
