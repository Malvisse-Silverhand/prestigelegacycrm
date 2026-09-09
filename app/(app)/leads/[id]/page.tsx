import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getLeadDetail, getLeadQuotations, getReassignableUsers, getLeadFamily } from "./data";
import { getLeadAppointments } from "@/app/(app)/appointments/data";
import { getTemplates, getLeadForFill } from "@/app/(app)/wa-flow/data";
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

  const [reassignOptions, quotations, appointments, waTemplates, waLead, family] = await Promise.all([
    getReassignableUsers(profile),
    getLeadQuotations(id),
    getLeadAppointments(id),
    getTemplates(),
    getLeadForFill(id),
    getLeadFamily(lead),
  ]);

  return (
    <div className="mx-auto max-w-[900px] px-5 py-8">
      <LeadDetailContent
        lead={lead}
        activity={activity}
        quotations={quotations}
        profile={profile}
        reassignOptions={reassignOptions}
        appointments={appointments}
        waTemplates={waTemplates}
        waLead={waLead}
        family={family}
      />
    </div>
  );
}
