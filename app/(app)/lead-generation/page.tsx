import { getCurrentProfile } from "@/lib/supabase/profile";
import { getLandingPages, getLandingStats, getPageOwnerOptions } from "./data";
import { LeadGenerationView } from "./lead-generation-view";

export default async function LeadGenerationPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const pages = await getLandingPages();
  const [stats, owners] = await Promise.all([getLandingStats(pages), getPageOwnerOptions(profile)]);

  return (
    <LeadGenerationView
      pages={pages}
      stats={stats}
      owners={owners}
      currentUserId={profile.id}
      canChooseOwner={profile.role !== "agent"}
    />
  );
}
