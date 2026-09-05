export type PipelineStage =
  | "new"
  | "contacted"
  | "follow_up"
  | "quoted"
  | "appointment"
  | "closed_won"
  | "closed_lost";

export const STAGES: { value: PipelineStage; label: string; dot: string }[] = [
  { value: "new", label: "New Lead", dot: "#1c3f66" },
  { value: "contacted", label: "Contacted", dot: "#4a6a8c" },
  { value: "follow_up", label: "Follow Up", dot: "#fac748" },
  { value: "quoted", label: "Quoted", dot: "#0f4c35" },
  // A confirmed meeting in the diary sits between a quotation and a close.
  // Leads land here automatically when an appointment is saved.
  { value: "appointment", label: "Appointment", dot: "#c9552f" },
  { value: "closed_won", label: "Closed Won", dot: "#0f2540" },
  { value: "closed_lost", label: "Closed Lost", dot: "#cfc3ad" },
];

export function stageLabel(value: string) {
  return STAGES.find((s) => s.value === value)?.label ?? value;
}
