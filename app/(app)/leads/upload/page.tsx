import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getAssignableTeam, getMyBatches } from "./data";
import { UploadWizard } from "./upload-wizard";

// Staging + creating thousands of leads happens in server-action chunks.
export const maxDuration = 60;

export default async function UploadLeadsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const isManager = profile.role !== "agent";
  const [team, batches] = await Promise.all([
    isManager ? getAssignableTeam(profile, { withLoad: true }) : Promise.resolve([]),
    getMyBatches(profile),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-sand bg-white px-4 py-3.5 dark:border-white/10 dark:bg-[#12283f] lg:px-[30px] lg:py-5">
        <div className="min-w-0">
          <div className="text-[18px] font-extrabold tracking-[-0.02em] text-navy dark:text-[#eef3f8] lg:text-[22px]">
            Upload leads
          </div>
          <div className="mt-[3px] text-[12.5px] font-medium text-muted dark:text-[#7f93aa] lg:text-[13px]">
            {isManager
              ? "Upload a lead database, then assign it to your team."
              : "Upload your own leads. They go straight to you, with no emails."}
          </div>
        </div>
        <Link
          href="/leads"
          className="press flex-none rounded-[11px] border border-sand-2 bg-white px-3 py-2 text-[12.5px] font-semibold text-navy dark:border-white/10 dark:bg-[#0b1a2b] dark:text-[#eef3f8]"
        >
          Back to leads
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-4 lg:px-[30px] lg:py-6">
        <UploadWizard isManager={isManager} team={team} batches={batches} />
      </div>
    </div>
  );
}
