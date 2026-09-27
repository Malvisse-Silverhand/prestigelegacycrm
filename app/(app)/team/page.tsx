import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getUnitManagerTeam, getOrgLeague, getUnitManagerTargets, currentMonthDate, getStaleAfterDays } from "./data";
import { TeamRoster } from "./team-roster";
import { TeamLeague } from "./team-league";
import { OrgChartToggle } from "./org-chart";

export default async function TeamPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (profile.role === "agent") redirect("/dashboard");

  // An Aspirant Unit Manager gets the same roster view; the profiles/leads RLS
  // policies narrow it from "the whole unit" to "my own downline" for them.
  if (profile.role === "unit_manager" || profile.role === "aspirant_unit_manager") {
    const monthDate = currentMonthDate();
    const [{ members, metrics }, targets] = await Promise.all([
      getUnitManagerTeam(profile),
      getUnitManagerTargets(profile, monthDate),
    ]);
    return (
      <TeamRoster unitName={profile.unit_name} members={members} metrics={metrics} monthDate={monthDate} targets={targets} />
    );
  }

  const [{ roots, leads, activities }, staleAfterDays] = await Promise.all([
    getOrgLeague(profile),
    getStaleAfterDays(),
  ]);
  const isSuperadmin = profile.role === "superadmin";
  const groupLabel = isSuperadmin ? "Whole organisation" : `Group ${profile.full_name}`;
  const heading = isSuperadmin ? "Everyone, by who they report to" : "Your units and direct reports";
  return (
    <OrgChartToggle
      roots={roots}
      currentUserId={profile.id}
      groupLabel={groupLabel}
      heading={heading}
      table={
        <TeamLeague
          groupLabel={groupLabel}
          heading={heading}
          roots={roots}
          leads={leads}
          activities={activities}
          staleAfterDays={staleAfterDays}
        />
      }
    />
  );
}
