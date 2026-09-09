import { createClient } from "@/lib/supabase/server";

// Three libraries share this one table (see the migration that added
// script_set) -- Takaful, Medical Card, and Hibah & Faraid.
export const SCRIPT_SETS = ["takaful", "medical", "hibah_faraid"] as const;
export type ScriptSet = (typeof SCRIPT_SETS)[number];

export type ClosingScript = {
  id: string;
  script_set: ScriptSet;
  script_no: number;
  chapter: string;
  chapter_order: number;
  situation: string;
  body: string;
  why: string | null;
  tags: string[];
  sort_order: number;
  is_active: boolean;
};

// Every script in one library, in the order it's written. RLS lets any
// signed-in person read them and only a SuperAdmin write, so nothing needs
// scoping here beyond the set itself.
export async function getClosingScripts(scriptSet: ScriptSet): Promise<ClosingScript[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("takaful_scripts")
    .select("id, script_set, script_no, chapter, chapter_order, situation, body, why, tags, sort_order, is_active")
    .eq("script_set", scriptSet)
    .order("chapter_order", { ascending: true })
    .order("sort_order", { ascending: true })
    .returns<ClosingScript[]>();

  return data ?? [];
}

// All three libraries at once, keyed by set -- what the Lead Detail WhatsApp
// Flow card needs, since its three tabs are visible together rather than one
// route per set. Inactive rows are dropped here (unlike getClosingScripts):
// nothing on that card lets an agent toggle visibility, so a script a
// SuperAdmin hid should simply not be an option to send.
export async function getAllClosingScripts(): Promise<Record<ScriptSet, ClosingScript[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("takaful_scripts")
    .select("id, script_set, script_no, chapter, chapter_order, situation, body, why, tags, sort_order, is_active")
    .eq("is_active", true)
    .order("chapter_order", { ascending: true })
    .order("sort_order", { ascending: true })
    .returns<ClosingScript[]>();

  const bySet: Record<ScriptSet, ClosingScript[]> = { takaful: [], medical: [], hibah_faraid: [] };
  for (const row of data ?? []) bySet[row.script_set].push(row);
  return bySet;
}
