import Link from "next/link";
import { getCurrentProfile, getProfileById, ROLE_LABEL } from "@/lib/supabase/profile";
import { getDashboardStats } from "./data";
import { getNotifications } from "@/app/(app)/notifications/actions";
import { DashboardView } from "./dashboard-view";
import { createClient } from "@/lib/supabase/server";
import { ShieldIcon } from "@/components/icons";
import { malaysiaToday } from "@/lib/malaysia-date";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const monitorId = params.monitor;

  let monitorTarget = null;
  if (monitorId && monitorId !== profile.id && profile.role !== "agent") {
    // RLS on `profiles` already scopes visibility to what this viewer is
    // allowed to see, so a null result here means "not permitted" and
    // "doesn't exist" alike -- either way, monitor mode just doesn't apply.
    monitorTarget = await getProfileById(monitorId);
  }

  // Whose "team" this profile has one of, and what kind -- a SuperAdmin or
  // Group Manager runs the whole agency/group, a Unit Manager or Aspirant UM
  // runs their downline. An agent has no team to show a card for. Only asked
  // for outside monitor mode: monitor mode already shows the monitored
  // person's own scope, and layering a second team card under it would be
  // showing the viewer's team, not the monitored person's.
  const teamKind = monitorTarget
    ? null
    : profile.role === "superadmin" || profile.role === "group_manager"
      ? "whole"
      : profile.role === "unit_manager" || profile.role === "aspirant_unit_manager"
        ? "downline"
        : null;

  const [stats, teamStats] = await Promise.all([
    getDashboardStats(
      monitorTarget ?? profile,
      monitorTarget
        ? monitorTarget.role === "agent"
          ? { agentId: monitorTarget.id }
          : { unitId: monitorTarget.unit_id ?? undefined }
        : undefined,
    ),
    teamKind
      ? getDashboardStats(profile, { teamWide: true, salesOnly: true })
      : Promise.resolve(null),
  ]);

  if (monitorTarget) {
    const supabase = await createClient();
    const { error: auditError } = await supabase.from("audit_log").insert({
      actor_id: profile.id,
      target_id: monitorTarget.id,
      action: "view_dashboard",
    });
    if (auditError) console.error("dashboard monitor-mode: audit_log insert failed", auditError);
  }

  return (
    <div>
      {monitorTarget && (
        <div className="flex items-center gap-3 border-b border-[#f0dfb4] bg-warn-gold-bg px-6 py-3">
          <ShieldIcon width={17} height={17} className="text-warn-gold-text" />
          <span className="flex-1 text-[13px] font-bold text-warn-gold-text">
            Monitor mode — you are viewing {monitorTarget.full_name}&apos;s dashboard ({ROLE_LABEL[monitorTarget.role]}, read only)
          </span>
          <Link href="/dashboard" className="rounded-[9px] bg-navy px-3.5 py-2 text-xs font-semibold text-white">
            Exit monitor mode
          </Link>
        </div>
      )}
      {/* The bell is always the signed-in user's own -- monitor mode changes
          whose figures are shown, never whose notifications. */}
      <DashboardView
        profile={monitorTarget ?? profile}
        stats={stats}
        teamSales={teamStats ? { goal: teamStats.goal, kind: teamKind as "whole" | "downline", role: profile.role } : null}
        notifications={await getNotifications()}
        today={malaysiaToday()}
      />
    </div>
  );
}
