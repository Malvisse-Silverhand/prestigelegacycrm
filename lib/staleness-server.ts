import { createClient } from "@/lib/supabase/server";

// Same source Settings > Lead Distribution reads/writes (global row, unit_id
// is null). `leads.is_stale` is never actually updated anywhere in the app
// (stuck at its `default false`), so every screen that needs staleness
// computes it live from lead_activity (see lib/staleness.ts) instead of
// trusting that column.
export async function getStaleAfterDays() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("distribution_settings")
    .select("stale_after_days")
    .is("unit_id", null)
    .maybeSingle();
  return data?.stale_after_days ?? 3;
}
