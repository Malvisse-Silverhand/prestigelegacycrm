import { getCurrentProfile } from "@/lib/supabase/profile";
import { getClosingScripts } from "../data";
import { ScriptsView } from "../scripts-view";

export default async function HibahFaraidScriptsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const scripts = await getClosingScripts("hibah_faraid");

  return (
    <ScriptsView
      title="Hibah & Faraid Scripts"
      subtitle={`${scripts.length} scripts for hibah and faraid conversations — family and responsibility, objections, and live situations.`}
      scripts={scripts}
      canEdit={profile.role === "superadmin"}
    />
  );
}
