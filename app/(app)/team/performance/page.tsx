import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getDashboardStats } from "@/app/(app)/dashboard/data";
import { getNotifications } from "@/app/(app)/notifications/actions";
import { DashboardView } from "@/app/(app)/dashboard/dashboard-view";
import { malaysiaToday } from "@/lib/malaysia-date";

/**
 * The team-wide half of what the Dashboard used to be.
 *
 * The Dashboard is now personal -- a manager's own ANC is their own closings,
 * not their downline's -- so the aggregate had to go somewhere. It goes here,
 * behind the same roles that can already see a roster, and it is built by the
 * same function with `teamWide` set rather than a second implementation that
 * could drift from it.
 *
 * What "team" means is not decided here either: RLS on `leads` already scopes
 * it to this person's downline, so a Unit Manager gets their unit and a
 * SuperAdmin gets the agency, with no role list repeated in this file.
 */
export default async function TeamPerformancePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  // An agent has no downline to aggregate, and the sidebar never offers them
  // this link -- but a typed URL should land somewhere sensible rather than
  // on an empty page.
  if (profile.role === "agent") redirect("/dashboard");

  const stats = await getDashboardStats(profile, { teamWide: true });

  return (
    <div>
      <div className="border-b border-sand bg-white px-5 py-4 lg:px-[30px] lg:py-5">
        <div className="text-[18px] font-extrabold tracking-[-0.02em] text-navy lg:text-[22px]">Team Performance</div>
        <div className="mt-[3px] text-[12.5px] font-medium text-muted lg:text-[13px]">
          Everyone reporting to you, combined. Your own Dashboard shows only your book.
        </div>
      </div>
      <DashboardView
        profile={profile}
        stats={stats}
        primaryVariant="team"
        notifications={await getNotifications()}
        today={malaysiaToday()}
      />
    </div>
  );
}
