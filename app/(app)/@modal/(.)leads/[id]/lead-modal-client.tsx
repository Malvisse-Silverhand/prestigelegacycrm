"use client";

import { ModalOverlay, useModalClose } from "@/components/modal-overlay";
import { LeadDetailContent } from "@/app/(app)/leads/[id]/lead-detail-content";
import type { LeadDetail, ActivityRow, ReassignOption, QuotationRow } from "@/app/(app)/leads/[id]/data";
import type { CurrentProfile } from "@/lib/profile-types";
import type { AppointmentRow } from "@/app/(app)/appointments/data";
import type { WaTemplate } from "@/app/(app)/wa-flow/types";
import type { FillableLead } from "@/lib/wa-template-fill";

export function LeadModalClient({
  lead,
  activity,
  quotations,
  profile,
  reassignOptions,
  appointments,
  waTemplates,
  waLead,
}: {
  lead: LeadDetail;
  activity: ActivityRow[];
  quotations: QuotationRow[];
  profile: CurrentProfile;
  reassignOptions: ReassignOption[];
  appointments: AppointmentRow[];
  waTemplates: WaTemplate[];
  waLead: FillableLead | null;
}) {
  const close = useModalClose();

  return (
    <ModalOverlay>
      <LeadDetailContent
        lead={lead}
        activity={activity}
        quotations={quotations}
        profile={profile}
        reassignOptions={reassignOptions}
        appointments={appointments}
        waTemplates={waTemplates}
        waLead={waLead}
        onClose={close}
        isModal
      />
    </ModalOverlay>
  );
}
