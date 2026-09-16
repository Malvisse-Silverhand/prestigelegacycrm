import type { Role } from "@/lib/supabase/profile";
import {
  DashboardIcon,
  LeadsIcon,
  PipelineIcon,
  TeamIcon,
  QuotationIcon,
  CalendarIcon,
  FunnelIcon,
  MySalesIcon,
  WaFlowIcon,
  StatisticsIcon,
  SettingsIcon,
} from "@/components/icons";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof DashboardIcon;
  roles?: Role[];
  // Rendered indented under the parent, and shown whenever the parent section
  // is the one you are in.
  children?: { href: string; label: string }[];
};

export const SIDEBAR_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/leads", label: "Leads Manager", icon: LeadsIcon },
  { href: "/pipeline", label: "Sales Pipeline", icon: PipelineIcon },
  // Sits directly under Sales Pipeline: a landing page is the top of that
  // same funnel, and its leads land in the pipeline's first column.
  {
    href: "/lead-generation",
    label: "Lead Generation",
    icon: FunnelIcon,
    children: [
      { href: "/lead-generation", label: "Landing Page" },
      { href: "/lead-generation/quickquote", label: "QuickQuote Form" },
    ],
  },
  { href: "/appointments", label: "Appointment", icon: CalendarIcon },
  // Sits after Appointment because that is where it falls in the work: a case
  // is filed once the meetings are done, and serviced once it is inforced.
  {
    href: "/my-sales/submit-case",
    label: "My Sales",
    icon: MySalesIcon,
    children: [
      { href: "/my-sales/submit-case", label: "Submit Case" },
      { href: "/my-sales/servicing", label: "Servicing" },
    ],
  },
  {
    href: "/team",
    label: "My Team",
    icon: TeamIcon,
    // An Aspirant Unit Manager has agents reporting to them, so they get the
    // roster too -- RLS narrows it to just their own downline.
    roles: ["superadmin", "group_manager", "unit_manager", "aspirant_unit_manager"],
    children: [
      { href: "/team", label: "Team Roster" },
      // The Dashboard is personal now; the combined figures live here.
      { href: "/team/performance", label: "Team Performance" },
    ],
  },
  { href: "/quotations", label: "Quotation", icon: QuotationIcon },
  {
    href: "/wa-flow",
    label: "WA Flow",
    icon: WaFlowIcon,
    children: [
      { href: "/wa-flow", label: "Message Templates" },
      { href: "/wa-flow/scripts", label: "Takaful Closing Scripts" },
      { href: "/wa-flow/scripts/medical", label: "Medical Card Scripts" },
      { href: "/wa-flow/scripts/hibah-faraid", label: "Hibah & Faraid Scripts" },
    ],
  },
  {
    href: "/statistics",
    label: "Statistics",
    icon: StatisticsIcon,
    // Agents included: the page now opens on their own personal performance
    // rather than team-wide charts they have no business seeing.
    roles: ["superadmin", "group_manager", "unit_manager", "aspirant_unit_manager", "agent"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
    // No role filter: Set Target is open to everyone (their own targets and
    // their downline's), and SettingsView hides the administration tabs from
    // anyone below a Unit Manager.
  },
];

// Four tabs, not five: the middle slot of the bottom bar is the Menu button,
// which opens the full desktop nav as an off-canvas drawer. Two items sit
// either side of it.
export const MOBILE_NAV_LEFT = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/leads", label: "Leads", icon: LeadsIcon },
];

export const MOBILE_NAV_RIGHT = [
  { href: "/pipeline", label: "Pipeline", icon: PipelineIcon },
  { href: "/quotations", label: "Quote", icon: QuotationIcon },
];

export function visibleNav(role: Role) {
  return SIDEBAR_NAV.filter((item) => !item.roles || item.roles.includes(role));
}
