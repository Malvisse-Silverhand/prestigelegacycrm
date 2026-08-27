import { createClient } from "@/lib/supabase/server";

export type QuotationRow = {
  id: string;
  product: string;
  status: string;
  created_at: string;
  lead_id: string;
  leads: { full_name: string } | null;
  profiles: { full_name: string } | null;
  quotation_plans: { sort_order: number; monthly_contribution: number | null }[];
};

export async function getQuotations() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotations")
    .select(
      "id, product, status, created_at, lead_id, leads(full_name), profiles!quotations_agent_id_fkey(full_name), quotation_plans(sort_order, monthly_contribution)",
    )
    .order("created_at", { ascending: false })
    .returns<QuotationRow[]>();
  return data ?? [];
}

export function primaryContribution(q: QuotationRow): number | null {
  if (q.quotation_plans.length === 0) return null;
  const primary = [...q.quotation_plans].sort((a, b) => a.sort_order - b.sort_order)[0];
  return primary.monthly_contribution ?? null;
}
