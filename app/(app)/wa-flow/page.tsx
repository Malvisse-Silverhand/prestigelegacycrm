import { getCurrentProfile } from "@/lib/supabase/profile";
import { getTemplates, getLeadForFill } from "./data";
import { WaFlowView } from "./wa-flow-view";

export default async function WaFlowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const [templates, lead] = await Promise.all([
    getTemplates(),
    params.lead_id ? getLeadForFill(params.lead_id) : Promise.resolve(null),
  ]);

  return <WaFlowView templates={templates} profile={profile} lead={lead} />;
}
