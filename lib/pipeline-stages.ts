export type PipelineStage =
  | "new"
  | "contacted"
  | "follow_up"
  | "quoted"
  | "appointment"
  | "submission"
  | "closed_won"
  | "servicing"
  | "closed_lost";

export const STAGES: { value: PipelineStage; label: string; dot: string }[] = [
  { value: "new", label: "New Lead", dot: "#1c3f66" },
  { value: "contacted", label: "Contacted", dot: "#4a6a8c" },
  { value: "follow_up", label: "Follow Up", dot: "#fac748" },
  { value: "quoted", label: "Quoted", dot: "#0f4c35" },
  // A confirmed meeting in the diary sits between a quotation and a close.
  // Leads land here automatically when an appointment is saved.
  { value: "appointment", label: "Appointment", dot: "#c9552f" },
  // The case is with the operator and waiting on underwriting. Its own column
  // because that wait is work to track: submitted is not the same as still
  // being chased, and not the same as won either.
  { value: "submission", label: "Submission", dot: "#7a5bb0" },
  { value: "closed_won", label: "Closed Won/Policy Inforced", dot: "#0f2540" },
  // After the policy is inforced the job changes from selling to looking
  // after the client, so servicing gets its own column rather than leaving
  // closed business piled up in Closed Won forever.
  { value: "servicing", label: "Servicing", dot: "#2e8f68" },
  { value: "closed_lost", label: "Closed Lost", dot: "#cfc3ad" },
];

// Stages that represent business already won. Both count as a sale on the
// dashboard -- a client moved into Servicing was still closed.
export const WON_STAGES = ["closed_won", "servicing"];

export function stageLabel(value: string) {
  return STAGES.find((s) => s.value === value)?.label ?? value;
}
