import { getCurrentProfile } from "@/lib/supabase/profile";
import { getTakafulScripts } from "./data";
import { ScriptsView } from "./scripts-view";

export default async function TakafulScriptsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const scripts = await getTakafulScripts();

  return <ScriptsView scripts={scripts} canEdit={profile.role === "superadmin"} />;
}
