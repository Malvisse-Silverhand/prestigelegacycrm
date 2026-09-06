import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getLeadDetail, getLeadQuotations, getReassignableUsers } from "@/app/(app)/leads/[id]/data";
import { getLeadAppointments } from "@/app/(app)/appointments/data";
import { getTemplates, getLeadForFill } from "@/app/(app)/wa-flow/data";
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

  const [reassignOptions, quotations, appointments, waTemplates, waLead] = await Promise.all([
    getReassignableUsers(profile),
    getLeadQuotations(id),
    getLeadAppointments(id),
    getTemplates(),
    getLeadForFill(id),
  ]);

  return (
    <LeadModalClient
      lead={lead}
      activity={activity}
      quotations={quotations}
      profile={profile}
      reassignOptions={reassignOptions}
      appointments={appointments}
      waTemplates={waTemplates}
      waLead={waLead}
    />
  );
}
