"use client";

import { ModalOverlay, useModalClose } from "@/components/modal-overlay";
import { LeadDetailContent } from "@/app/(app)/leads/[id]/lead-detail-content";
import type { LeadDetail, ActivityRow } from "@/app/(app)/leads/[id]/data";
import type { CurrentProfile } from "@/lib/profile-types";

export function LeadModalClient({
  lead,
  activity,
  profile,
  reassignAgents,
}: {
  lead: LeadDetail;
  activity: ActivityRow[];
  profile: CurrentProfile;
  reassignAgents: { id: string; full_name: string }[];
}) {
  const close = useModalClose();

  return (
    <ModalOverlay>
      <LeadDetailContent
        lead={lead}
        activity={activity}
        profile={profile}
        reassignAgents={reassignAgents}
        onClose={close}
        isModal
      />
    </ModalOverlay>
  );
}
