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

function currentMonthDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  // Section 3 permission matrix: only superadmin/group_manager reach Settings.
  // The sidebar already hides this link for other roles -- this is the actual
  // enforcement, since a direct URL visit would otherwise bypass hidden nav.
  if (profile.role !== "superadmin" && profile.role !== "group_manager") redirect("/dashboard");

  const monthDate = currentMonthDate();
  const [orgTree, assignmentOptions, targets, distribution, auditLog, leadSources] = await Promise.all([
    getOrgTree(profile),
    getAssignmentOptions(profile),
    getTargetsForMonth(profile, monthDate),
    getDistributionSettings(),
    getAuditLog(profile),
    getLeadSourceStats(profile),
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
