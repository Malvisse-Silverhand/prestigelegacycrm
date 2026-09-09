import { createClient } from "@/lib/supabase/server";

export type TakafulScript = {
  id: string;
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

// Every script, in the order the library is written. RLS lets any signed-in
// person read them and only a SuperAdmin write, so nothing is scoped here.
export async function getTakafulScripts(): Promise<TakafulScript[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("takaful_scripts")
    .select("id, script_no, chapter, chapter_order, situation, body, why, tags, sort_order, is_active")
    .order("chapter_order", { ascending: true })
    .order("sort_order", { ascending: true })
    .returns<TakafulScript[]>();

  return data ?? [];
}
