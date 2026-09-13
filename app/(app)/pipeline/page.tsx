import { getCurrentProfile } from "@/lib/supabase/profile";
import { getPipelineLeads, getPipelineAgents, getStaleAfterDays, getCaseAncRows } from "./data";
import { PipelineView } from "./pipeline-view";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const [leads, agents, staleAfterDays, caseRows] = await Promise.all([
    getPipelineLeads({ agent: params.agent, interest: params.interest }),
    getPipelineAgents(),
    getStaleAfterDays(),
    getCaseAncRows(),
  ]);

  return (
    <PipelineView
      leads={leads}
      agents={profile.role === "agent" ? [] : agents}
      profile={profile}
      currentAgent={params.agent ?? ""}
      currentInterest={params.interest ?? ""}
      staleAfterDays={staleAfterDays}
      caseRows={caseRows}
    />
  );
}
