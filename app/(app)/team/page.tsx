import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getUnitManagerTeam, getGroupManagerLeague, getUnitManagerTargets, currentMonthDate, getStaleAfterDays } from "./data";
import { TeamRoster } from "./team-roster";
import { TeamLeague } from "./team-league";

export default async function TeamPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (profile.role === "agent") redirect("/dashboard");

  if (profile.role === "unit_manager") {
    const monthDate = currentMonthDate();
    const [{ members, metrics }, targets] = await Promise.all([
      getUnitManagerTeam(profile),
      getUnitManagerTargets(profile, monthDate),
    ]);
    return (
      <TeamRoster unitName={profile.unit_name} members={members} metrics={metrics} monthDate={monthDate} targets={targets} />
    );
  }

  const [{ leagues, leads, activities }, staleAfterDays] = await Promise.all([
    getGroupManagerLeague(profile),
    getStaleAfterDays(),
  ]);
  return (
    <TeamLeague
      groupLabel={profile.role === "superadmin" ? "All units" : `Group ${profile.full_name}`}
      leagues={leagues}
      leads={leads}
      activities={activities}
      staleAfterDays={staleAfterDays}
    />
  );
}
