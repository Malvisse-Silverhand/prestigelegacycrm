import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { hydrateInputs, hydrateProfile, MODULE_QUOTE_TOOL, MODULE_SCRIPT_SET } from "@/lib/storyboard/modules";
import { getClosingScripts } from "@/app/(app)/wa-flow/scripts/data";
import { getLeadOptions } from "@/app/(app)/appointments/data";
import { getAgentContact, getQuoteHandoff, getSession } from "../data";
import { StoryboardWorkspace } from "./workspace";

export default async function StoryboardSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const session = await getSession(id);
  // RLS lets a leader read a downline session, but this page edits it, so only
  // the owner opens the workspace. Leaders see team figures in Leader Insights.
  if (!session || session.agent_id !== profile.id) notFound();

  const [scripts, agent, leadOptions] = await Promise.all([
    getClosingScripts(MODULE_SCRIPT_SET[session.module]),
    getAgentContact(profile.id),
    session.lead ? Promise.resolve([]) : getLeadOptions(),
  ]);
  const quote = session.lead
    ? await getQuoteHandoff(session.lead.id, session.created_at, MODULE_QUOTE_TOOL[session.module], agent)
    : null;

  return (
    <StoryboardWorkspace
      session={{
        id: session.id,
        module: session.module,
        lang: session.lang,
        profile: hydrateProfile(session.profile),
        inputs: hydrateInputs(session.module, session.inputs),
        riskFlags: session.risk_flags ?? [],
        notes: session.notes ?? "",
        status: session.status,
        presentedAt: session.presented_at,
        lead: session.lead,
      }}
      scripts={scripts.filter((s) => s.is_active)}
      agent={agent}
      quote={quote}
      leadOptions={leadOptions.map((l) => ({ id: l.id, fullName: l.fullName }))}
    />
  );
}
