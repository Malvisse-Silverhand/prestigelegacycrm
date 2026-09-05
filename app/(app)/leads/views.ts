// Saved views shared by the Dashboard's alert cards (which link into them),
// the leads filter bar (which shows the active one), and data.ts (which
// applies it). Kept out of data.ts so the client components importing it
// don't pull the server-only Supabase client into their bundle.

export const LEAD_VIEWS = {
  overdue: "Overdue follow-up",
  followup_today: "Follow up today",
  no_quotation: "No quotation yet",
} as const;

export type LeadView = keyof typeof LEAD_VIEWS;

export function isLeadView(v: string | undefined): v is LeadView {
  return !!v && v in LEAD_VIEWS;
}
