import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import {
  getOrgTree,
  getAssignmentOptions,
  getTargetsForMonth,
  getMyCampaign,
  getDistributionSettings,
  getAuditLog,
  getLeadSourceStats,
  getWebhooks,
  getInviteLinks,
  getJoinRequests,
  getTrackingCode,
  getTrackablePages,
  getMyProfileDetails,
} from "./data";
import { getBenefitOptions } from "@/app/(app)/my-sales/data";
import { SettingsView } from "./settings-view";

const EMPTY_ORG_TREE = {
  superadmins: [],
  groupManagers: [],
  roleCounts: { superadmin: 0, group_manager: 0, unit_manager: 0, aspirant_unit_manager: 0, agent: 0 },
};
const EMPTY_DISTRIBUTION = {
  id: null,
  roundRobinEnabled: false,
  staleAfterDays: 0,
  reassignRequiresApproval: false,
};

function currentMonthDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  // Every role reaches Settings now, because Set Target is open to everyone
  // (for themselves and their downline) -- SettingsView decides which tabs
  // each role actually sees. Previously this redirected anyone below a Group
  // Manager, which contradicted the sidebar: it lists Settings for Unit
  // Managers, so clicking it bounced them straight back to the dashboard.
  if (!profile.role) redirect("/dashboard");

  const monthDate = currentMonthDate();
  // Anyone below a Unit Manager only gets the Set Target tab, so skip the
  // queries backing the tabs they can't open.
  const isManager =
    profile.role === "superadmin" || profile.role === "group_manager" || profile.role === "unit_manager";
  // Same audience as Webhooks: org-wide configuration, written by the roles
  // that own it. Skip the query entirely for anyone who can't open the tab.
  const canManageBenefitCatalogue = profile.role === "superadmin" || profile.role === "group_manager";
  const [
    orgTree,
    assignmentOptions,
    targets,
    campaign,
    distribution,
    auditLog,
    leadSources,
    webhooks,
    inviteLinks,
    joinRequests,
    trackingCode,
    trackablePages,
    benefits,
    myProfile,
  ] = await Promise.all([
      isManager ? getOrgTree(profile) : Promise.resolve(EMPTY_ORG_TREE),
      isManager ? getAssignmentOptions(profile) : Promise.resolve({ unitManagers: [], units: [] }),
      getTargetsForMonth(profile, monthDate),
      getMyCampaign(profile),
      isManager ? getDistributionSettings() : Promise.resolve(EMPTY_DISTRIBUTION),
      // Audit Log is SuperAdmin-only -- don't even fetch it for a Group Manager.
      profile.role === "superadmin" ? getAuditLog(profile) : Promise.resolve(null),
      isManager ? getLeadSourceStats(profile) : Promise.resolve([]),
      getWebhooks(profile),
      getInviteLinks(profile),
      getJoinRequests(profile),
      // Tracking code is SuperAdmin-only, like the audit log -- both getters
      // return an empty shape for anyone else, so skip the round trip.
      getTrackingCode(profile),
      getTrackablePages(profile),
      // Everything, not just what is on offer, so a retired benefit can be
      // brought back rather than retyped.
      canManageBenefitCatalogue ? getBenefitOptions(false) : Promise.resolve([]),
      getMyProfileDetails(profile),
    ]);

  return (
    <SettingsView
      role={profile.role}
      orgTree={orgTree}
      assignmentOptions={assignmentOptions}
      monthDate={monthDate}
      targets={targets}
      campaign={campaign}
      distribution={distribution}
      auditLog={auditLog}
      leadSources={leadSources}
      webhooks={webhooks}
      inviteLinks={inviteLinks}
      joinRequests={joinRequests}
      trackingCode={trackingCode}
      trackablePages={trackablePages}
      benefits={benefits}
      currentUserId={profile.id}
      myProfile={myProfile}
    />
  );
}
