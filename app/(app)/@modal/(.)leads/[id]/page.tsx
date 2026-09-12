import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getLeadDetail, getLeadQuotations, getReassignableUsers, getLeadFamily } from "@/app/(app)/leads/[id]/data";
import { getLeadAppointments } from "@/app/(app)/appointments/data";
import { getTemplates, getLeadForFill } from "@/app/(app)/wa-flow/data";
import { getAllClosingScripts } from "@/app/(app)/wa-flow/scripts/data";
import { getCasesForLead } from "@/app/(app)/my-sales/data";
import { malaysiaToday } from "@/lib/malaysia-date";
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

  const [reassignOptions, quotations, appointments, waTemplates, waLead, family, closingScripts, cases] =
    await Promise.all([
      getReassignableUsers(profile),
      getLeadQuotations(id),
      getLeadAppointments(id),
      getTemplates(),
      getLeadForFill(id),
      getLeadFamily(lead),
      getAllClosingScripts(),
      getCasesForLead(id),
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
      family={family}
      closingScripts={closingScripts}
      cases={cases}
      today={malaysiaToday()}
    />
  );
}
