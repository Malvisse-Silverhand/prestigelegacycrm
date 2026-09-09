import { getCurrentProfile } from "@/lib/supabase/profile";
import { getClosingScripts } from "./data";
import { ScriptsView } from "./scripts-view";

export default async function TakafulScriptsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const scripts = await getClosingScripts("takaful");

  return (
    <ScriptsView
      title="Takaful Closing Scripts"
      subtitle={`${scripts.length} scripts for the conversations that actually decide a case — objections, follow-ups and closing.`}
      scripts={scripts}
      canEdit={profile.role === "superadmin"}
    />
  );
}
