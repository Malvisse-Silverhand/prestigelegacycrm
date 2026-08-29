import { daysSinceLastActivity } from "@/lib/staleness";

export type MinimalLead = {
  id: string;
  agent_id: string | null;
  unit_id?: string | null;
  pipeline_stage: string;
  created_at: string;
};

export type MinimalActivity = {
  lead_id: string;
  activity_type: string;
  created_at: string;
};

export type AgentMetrics = {
  leadCount: number;
  convRate: number;
  staleCount: number;
  avgResponseHours: number | null;
};

export function computeAgentMetrics(
  leads: MinimalLead[],
  activities: MinimalActivity[],
  staleAfterDays: number,
): Map<string, AgentMetrics> {
  const firstActivityByLead = new Map<string, string>();
  const timestampsByLead = new Map<string, string[]>();
  for (const a of activities) {
    if (a.activity_type !== "created") {
      const existing = firstActivityByLead.get(a.lead_id);
      if (!existing || a.created_at < existing) firstActivityByLead.set(a.lead_id, a.created_at);
    }
    (timestampsByLead.get(a.lead_id) ?? timestampsByLead.set(a.lead_id, []).get(a.lead_id)!).push(a.created_at);
  }

  const byAgent = new Map<string, MinimalLead[]>();
  for (const lead of leads) {
    if (!lead.agent_id) continue;
    (byAgent.get(lead.agent_id) ?? byAgent.set(lead.agent_id, []).get(lead.agent_id)!).push(lead);
  }

  const result = new Map<string, AgentMetrics>();
  for (const [agentId, agentLeads] of byAgent) {
    const closedWon = agentLeads.filter((l) => l.pipeline_stage === "closed_won").length;
    const responseTimes: number[] = [];
    for (const lead of agentLeads) {
      const first = firstActivityByLead.get(lead.id);
      if (first) {
        const hours = (new Date(first).getTime() - new Date(lead.created_at).getTime()) / 3600000;
        if (hours >= 0) responseTimes.push(hours);
      }
    }
    result.set(agentId, {
      leadCount: agentLeads.length,
      convRate: agentLeads.length > 0 ? Math.round((closedWon / agentLeads.length) * 1000) / 10 : 0,
      staleCount: agentLeads.filter(
        (l) => daysSinceLastActivity(l.created_at, timestampsByLead.get(l.id) ?? []) >= staleAfterDays,
      ).length,
      avgResponseHours:
        responseTimes.length > 0
          ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
          : null,
    });
  }
  return result;
}

export function emptyMetrics(): AgentMetrics {
  return { leadCount: 0, convRate: 0, staleCount: 0, avgResponseHours: null };
}
