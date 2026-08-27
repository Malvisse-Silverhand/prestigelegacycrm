import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getUnitManagerTeam, getGroupManagerLeague } from "./data";
import { TeamRoster } from "./team-roster";
import { TeamLeague } from "./team-league";

export default async function TeamPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (profile.role === "agent") redirect("/dashboard");

  if (profile.role === "unit_manager") {
    const { members, metrics } = await getUnitManagerTeam(profile);
    return <TeamRoster unitName={profile.unit_name} members={members} metrics={metrics} />;
  }

  const { leagues, leads, activities } = await getGroupManagerLeague(profile);
  return (
    <TeamLeague
      groupLabel={profile.role === "superadmin" ? "All units" : `Group ${profile.full_name}`}
      leagues={leagues}
      leads={leads}
      activities={activities}
    />
  );
}
