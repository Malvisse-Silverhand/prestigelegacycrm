"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

const MAX_BODY = 8000;

// SuperAdmin only, checked here as well as in RLS. These are the words the
// whole agency puts in front of clients, so a wording change is an org-wide
// decision rather than a personal note -- an agent who wants their own
// variation writes a WA template instead.
export async function updateScript(
  id: string,
  input: { situation: string; body: string; why: string; chapter: string; isActive: boolean },
) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") {
    return { error: "Only a SuperAdmin can edit the closing scripts." };
  }

  const situation = input.situation.trim();
  const body = input.body.trim();
  const chapter = input.chapter.trim();
  if (!situation || !body) return { error: "The situation and the script itself are both required." };
  if (body.length > MAX_BODY) return { error: `Keep the script under ${MAX_BODY.toLocaleString()} characters.` };
  if (!chapter) return { error: "A script has to belong to a section." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("takaful_scripts")
    .update({
      situation,
      body,
      why: input.why.trim() || null,
      chapter,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't save this script. Please try again." };

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: profile.id,
    action: "takaful_script_updated",
    metadata: { script_id: id, situation, chars: body.length, active: input.isActive },
  });
  if (auditError) console.error("updateScript: audit_log insert failed", auditError);

  revalidatePath("/wa-flow/scripts");
  return { error: null };
}
