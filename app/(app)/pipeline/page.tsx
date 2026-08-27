import { getCurrentProfile } from "@/lib/supabase/profile";
import { getPipelineLeads, getPipelineAgents } from "./data";
import { PipelineView } from "./pipeline-view";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const [leads, agents] = await Promise.all([
    getPipelineLeads({ agent: params.agent }),
    getPipelineAgents(),
  ]);

  return (
    <PipelineView
      leads={leads}
      agents={profile.role === "agent" ? [] : agents}
      profile={profile}
      currentAgent={params.agent ?? ""}
    />
  );
}
