import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getLeadDetail, getReassignableUsers } from "./data";
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

  const reassignOptions = await getReassignableUsers(profile);

  return (
    <div className="mx-auto max-w-[900px] px-5 py-8">
      <LeadDetailContent
        lead={lead}
        activity={activity}
        profile={profile}
        reassignOptions={reassignOptions}
      />
    </div>
  );
}
