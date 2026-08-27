import { getCurrentProfile } from "@/lib/supabase/profile";
import { getDashboardStats } from "./data";
import { DashboardView } from "./dashboard-view";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const stats = await getDashboardStats(profile);

  return <DashboardView profile={profile} stats={stats} />;
}
