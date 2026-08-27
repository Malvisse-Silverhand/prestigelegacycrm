import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getUnitManagerTeam } from "./data";
import { TeamRoster } from "./team-roster";

export default async function TeamPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (profile.role === "agent") redirect("/dashboard");

  if (profile.role === "unit_manager") {
    const { members, metrics } = await getUnitManagerTeam(profile);
    return <TeamRoster unitName={profile.unit_name} members={members} metrics={metrics} />;
  }

  // group_manager / superadmin get the drill-down league view -- next screen.
  return (
    <div className="flex items-center justify-center px-8 py-20 text-center text-[13px] text-muted">
      The Group Manager drill-down view is coming in the next screen of this batch.
    </div>
  );
}
