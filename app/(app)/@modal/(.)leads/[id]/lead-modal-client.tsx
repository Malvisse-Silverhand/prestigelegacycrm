"use client";

import { ModalOverlay, useModalClose } from "@/components/modal-overlay";
import { LeadDetailContent } from "@/app/(app)/leads/[id]/lead-detail-content";
import type { LeadDetail, ActivityRow, ReassignOption } from "@/app/(app)/leads/[id]/data";
import type { CurrentProfile } from "@/lib/profile-types";

export function LeadModalClient({
  lead,
  activity,
  profile,
  reassignOptions,
}: {
  lead: LeadDetail;
  activity: ActivityRow[];
  profile: CurrentProfile;
  reassignOptions: ReassignOption[];
}) {
  const close = useModalClose();

  return (
    <ModalOverlay>
      <LeadDetailContent
        lead={lead}
        activity={activity}
        profile={profile}
        reassignOptions={reassignOptions}
        onClose={close}
        isModal
      />
    </ModalOverlay>
  );
}
