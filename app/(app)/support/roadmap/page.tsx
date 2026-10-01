import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getRoadmapItems } from "./data";
import { RoadmapView } from "./roadmap-view";

export default async function RoadmapPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const result = await getRoadmapItems();
  if (!result.setup) {
    return (
      <div className="px-5 py-10 lg:px-[30px]">
        <div className="mx-auto max-w-md rounded-2xl border border-sand bg-white p-6 text-center">
          <div className="text-[15px] font-bold text-navy">Roadmap isn&apos;t set up yet</div>
          <p className="mt-1.5 text-[12.5px] font-medium text-muted">
            The database migration for the roadmap needs to be run before this page can work. Ask your SuperAdmin to
            apply the latest migration, then reload.
          </p>
        </div>
      </div>
    );
  }

  return <RoadmapView items={result.items} isAdmin={profile.role === "superadmin"} />;
}
