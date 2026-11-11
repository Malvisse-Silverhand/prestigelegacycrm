import { getCurrentProfile } from "@/lib/supabase/profile";
import { getLeadOptions } from "@/app/(app)/appointments/data";
import { getLeadPrefill, getMySessions } from "./data";
import { StoryboardHub } from "./storyboard-hub";

// The hub: start a session (optionally for a lead, e.g. arriving from Lead
// Detail with ?lead=), and pick up a recent one.
export default async function StoryboardPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const { lead: leadId } = await searchParams;

  const [sessions, leadOptions, preselected] = await Promise.all([
    getMySessions(profile.id),
    getLeadOptions(),
    leadId ? getLeadPrefill(leadId) : Promise.resolve(null),
  ]);

  return (
    <StoryboardHub
      sessions={sessions}
      leadOptions={leadOptions.map((l) => ({ id: l.id, fullName: l.fullName }))}
      preselected={preselected ? { id: preselected.id, fullName: preselected.full_name } : null}
    />
  );
}
