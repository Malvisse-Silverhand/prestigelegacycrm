import { getCurrentProfile } from "@/lib/supabase/profile";
import { getPipelineLeads, getPipelineAgents, getStaleAfterDays } from "./data";
import { PipelineView } from "./pipeline-view";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const [leads, agents, staleAfterDays] = await Promise.all([
    getPipelineLeads({ agent: params.agent, interest: params.interest }),
    getPipelineAgents(),
    getStaleAfterDays(),
  ]);

  return (
    <PipelineView
      leads={leads}
      agents={profile.role === "agent" ? [] : agents}
      profile={profile}
      currentAgent={params.agent ?? ""}
      currentInterest={params.interest ?? ""}
      staleAfterDays={staleAfterDays}
    />
  );
}
