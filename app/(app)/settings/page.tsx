import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import {
  getOrgTree,
  getAssignmentOptions,
  getTargetsForMonth,
  getDistributionSettings,
  getAuditLog,
  getLeadSourceStats,
} from "./data";
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
  const [orgTree, assignmentOptions, targets, distribution, auditLog, leadSources] = await Promise.all([
    isManager ? getOrgTree(profile) : Promise.resolve(EMPTY_ORG_TREE),
    isManager ? getAssignmentOptions(profile) : Promise.resolve({ unitManagers: [], units: [] }),
    getTargetsForMonth(profile, monthDate),
    isManager ? getDistributionSettings() : Promise.resolve(EMPTY_DISTRIBUTION),
    // Audit Log is SuperAdmin-only -- don't even fetch it for a Group Manager.
    profile.role === "superadmin" ? getAuditLog(profile) : Promise.resolve(null),
    isManager ? getLeadSourceStats(profile) : Promise.resolve([]),
  ]);

  return (
    <SettingsView
      role={profile.role}
      orgTree={orgTree}
      assignmentOptions={assignmentOptions}
      monthDate={monthDate}
      targets={targets}
      distribution={distribution}
      auditLog={auditLog}
      leadSources={leadSources}
    />
  );
}
