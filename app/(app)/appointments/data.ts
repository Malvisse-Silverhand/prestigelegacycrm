import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/lib/appointments";

export type AppointmentRow = {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string | null;
  agentId: string;
  agentName: string | null;
  scheduledAt: string;
  location: string | null;
  remarks: string | null;
  status: AppointmentStatus;
};

export type LeadOption = { id: string; fullName: string; phone: string | null };

// How far back the workspace calendar can be paged. Matches the dashboard
// calendar's window so the two never disagree about what exists.
const HISTORY_MONTHS = 6;

// RLS on appointments is inherited from leads, so this needs no scope logic of
// its own: an agent gets their own, a unit manager their unit's, and so on.
export async function getAppointments(): Promise<AppointmentRow[]> {
  const supabase = await createClient();
  const from = new Date();
  from.setMonth(from.getMonth() - HISTORY_MONTHS);

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, lead_id, agent_id, scheduled_at, location, remarks, status, leads(full_name, phone), profiles!appointments_agent_id_fkey(full_name)",
    )
    .gte("scheduled_at", from.toISOString())
    .order("scheduled_at", { ascending: true });

  return (data ?? []).map((a) => {
    const lead = a.leads as unknown as { full_name: string; phone: string | null } | null;
    const agent = a.profiles as unknown as { full_name: string } | null;
    return {
      id: a.id as string,
      leadId: a.lead_id as string,
      leadName: lead?.full_name ?? "Unknown lead",
      leadPhone: lead?.phone ?? null,
      agentId: a.agent_id as string,
      agentName: agent?.full_name ?? null,
      scheduledAt: a.scheduled_at as string,
      location: (a.location as string | null) ?? null,
      remarks: (a.remarks as string | null) ?? null,
      status: a.status as AppointmentStatus,
    };
  });
}

// Every lead the caller can see, for the "Lead" picker. Closed-lost leads are
// dropped -- there is no meeting to book with them.
export async function getLeadOptions(): Promise<LeadOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("id, full_name, phone, pipeline_stage")
    .neq("pipeline_stage", "closed_lost")
    .order("full_name")
    .limit(1000);

  return (data ?? []).map((l) => ({
    id: l.id as string,
    fullName: l.full_name as string,
    phone: (l.phone as string | null) ?? null,
  }));
}

export async function getLeadBaseCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("leads").select("id", { count: "exact", head: true });
  return count ?? 0;
}

// Appointments for one lead, newest first -- the Lead Detail box.
export async function getLeadAppointments(leadId: string): Promise<AppointmentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("id, lead_id, agent_id, scheduled_at, location, remarks, status, leads(full_name, phone), profiles!appointments_agent_id_fkey(full_name)")
    .eq("lead_id", leadId)
    .order("scheduled_at", { ascending: false });

  return (data ?? []).map((a) => {
    const lead = a.leads as unknown as { full_name: string; phone: string | null } | null;
    const agent = a.profiles as unknown as { full_name: string } | null;
    return {
      id: a.id as string,
      leadId: a.lead_id as string,
      leadName: lead?.full_name ?? "Unknown lead",
      leadPhone: lead?.phone ?? null,
      agentId: a.agent_id as string,
      agentName: agent?.full_name ?? null,
      scheduledAt: a.scheduled_at as string,
      location: (a.location as string | null) ?? null,
      remarks: (a.remarks as string | null) ?? null,
      status: a.status as AppointmentStatus,
    };
  });
}
