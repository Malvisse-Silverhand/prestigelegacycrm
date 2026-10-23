// "Leader Assigned": a manager uploaded this lead in a list and assigned it to
// its agent. Shown in the Leads list, the lead profile and wherever else a lead's
// chips appear. Renders nothing for a lead the agent added or uploaded
// themselves (assigned_by is null), and nothing before the lead-batches
// migration has run (the field is absent).
export function LeaderAssignedChip({
  lead,
  className = "",
}: {
  lead: {
    assigned_by?: string | null;
    assigned_at?: string | null;
    assigned_by_profile?: { full_name: string } | null;
  };
  className?: string;
}) {
  if (!lead.assigned_by) return null;

  const who = lead.assigned_by_profile?.full_name;
  const when = lead.assigned_at
    ? new Date(lead.assigned_at).toLocaleDateString("en-GB", { timeZone: "Asia/Kuala_Lumpur" })
    : null;
  const title = ["Assigned by", who ?? "your leader", when ? `on ${when}` : null].filter(Boolean).join(" ");

  return (
    <span
      title={title}
      className={`inline-flex flex-none items-center rounded-[6px] bg-warn-gold-bg px-2 py-[3px] text-[10px] font-bold tracking-[0.02em] whitespace-nowrap text-warn-gold-text ${className}`}
    >
      LEADER ASSIGNED
    </span>
  );
}
