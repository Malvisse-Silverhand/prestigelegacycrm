import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getLeadDetail, getLeadQuotations, getReassignableUsers } from "@/app/(app)/leads/[id]/data";
import { LeadModalClient } from "./lead-modal-client";

export default async function LeadDetailModalRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const { lead, activity } = await getLeadDetail(id);
  if (!lead) notFound();

  const [reassignOptions, quotations] = await Promise.all([
    getReassignableUsers(profile),
    getLeadQuotations(id),
  ]);

  return (
    <LeadModalClient
      lead={lead}
      activity={activity}
      quotations={quotations}
      profile={profile}
      reassignOptions={reassignOptions}
    />
  );
}
