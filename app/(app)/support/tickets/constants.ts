// Shared by the server actions, the data helpers and the client views, so the
// enums and limits live in one place. They mirror the CHECK constraints in
// supabase/migrations/20261001090000_support_tickets_roadmap.sql -- change one
// and the other has to move with it.

export const TICKET_CATEGORIES = ["bug", "question", "feature_request", "data_fix", "access", "other"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const TICKET_STATUSES = ["open", "in_progress", "waiting_on_agent", "resolved", "closed"] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  bug: "Bug",
  question: "Question",
  feature_request: "Feature request",
  data_fix: "Data fix",
  access: "Access",
  other: "Other",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_on_agent: "Waiting on agent",
  resolved: "Resolved",
  closed: "Closed",
};

export const SUBJECT_MIN = 3;
export const SUBJECT_MAX = 140;
export const DESCRIPTION_MAX = 5000;
export const BODY_MAX = 5000;
export const PAGE_URL_MAX = 500;

export const MIGRATION_MESSAGE = "Run the latest database migration first.";

export type TicketRow = {
  id: string;
  ticketNo: number;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: string;
  raiserName: string;
  assignedTo: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
};

export type TicketMessage = {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorRoleLabel: string;
  body: string;
  createdAt: string;
};

export type TicketDetail = {
  ticket: TicketRow & {
    description: string;
    pageUrl: string | null;
    resolvedAt: string | null;
    raiserInitials: string;
    raiserRoleLabel: string;
  };
  messages: TicketMessage[];
};

export type StaffOption = { id: string; name: string };

export function relativeTime(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}
