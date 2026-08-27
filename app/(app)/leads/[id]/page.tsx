import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getLeadDetail, getReassignableAgents } from "./data";
import { LeadDetailContent } from "./lead-detail-content";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const { lead, activity } = await getLeadDetail(id);
  if (!lead) notFound();

  const reassignAgents = await getReassignableAgents(profile.unit_id);

  return (
    <div className="mx-auto max-w-[820px] px-5 py-8">
      <LeadDetailContent
        lead={lead}
        activity={activity}
        profile={profile}
        reassignAgents={reassignAgents}
      />
    </div>
  );
}
