"use client";

import { ModalOverlay, useModalClose } from "@/components/modal-overlay";
import { LeadDetailContent } from "@/app/(app)/leads/[id]/lead-detail-content";
import type { LeadDetail, ActivityRow, ReassignOption, QuotationRow } from "@/app/(app)/leads/[id]/data";
import type { CurrentProfile } from "@/lib/profile-types";

export function LeadModalClient({
  lead,
  activity,
  quotations,
  profile,
  reassignOptions,
}: {
  lead: LeadDetail;
  activity: ActivityRow[];
  quotations: QuotationRow[];
  profile: CurrentProfile;
  reassignOptions: ReassignOption[];
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
        onClose={close}
        isModal
      />
    </ModalOverlay>
  );
}
