import { getCurrentProfile } from "@/lib/supabase/profile";
import { getClosingScripts } from "../data";
import { ScriptsView } from "../scripts-view";

export default async function MedicalScriptsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const scripts = await getClosingScripts("medical");

  return (
    <ScriptsView
      title="Medical Card Closing Scripts"
      subtitle={`${scripts.length} scripts for medical card conversations — checking existing cover, budget, waiting periods and closing.`}
      scripts={scripts}
      canEdit={profile.role === "superadmin"}
    />
  );
}
