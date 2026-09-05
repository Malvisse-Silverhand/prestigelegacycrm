import type { Role } from "@/lib/supabase/profile";
import {
  DashboardIcon,
  LeadsIcon,
  PipelineIcon,
  TeamIcon,
  QuotationIcon,
  WaFlowIcon,
  StatisticsIcon,
  SettingsIcon,
} from "@/components/icons";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof DashboardIcon;
  roles?: Role[];
};

export const SIDEBAR_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/leads", label: "Leads Manager", icon: LeadsIcon },
  { href: "/pipeline", label: "Sales Pipeline", icon: PipelineIcon },
  {
    href: "/team",
    label: "My Team",
    icon: TeamIcon,
    // An Aspirant Unit Manager has agents reporting to them, so they get the
    // roster too -- RLS narrows it to just their own downline.
    roles: ["superadmin", "group_manager", "unit_manager", "aspirant_unit_manager"],
  },
  { href: "/quotations", label: "Quotation", icon: QuotationIcon },
  { href: "/wa-flow", label: "WA Flow", icon: WaFlowIcon },
  {
    href: "/statistics",
    label: "Statistics",
    icon: StatisticsIcon,
    roles: ["superadmin", "group_manager", "unit_manager", "aspirant_unit_manager"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
    // Unit managers can now invite/assign inside their own unit.
    roles: ["superadmin", "group_manager", "unit_manager"],
  },
];

// Four tabs, not five: the middle slot of the bottom bar is the Menu button,
// which opens the full desktop nav as an off-canvas drawer. Two items sit
// either side of it.
export const MOBILE_NAV_LEFT = [
  { href: "/dashboard", label: "Home", icon: DashboardIcon },
  { href: "/leads", label: "Leads", icon: LeadsIcon },
];

export const MOBILE_NAV_RIGHT = [
  { href: "/pipeline", label: "Pipeline", icon: PipelineIcon },
  { href: "/quotations", label: "Quote", icon: QuotationIcon },
];

export function visibleNav(role: Role) {
  return SIDEBAR_NAV.filter((item) => !item.roles || item.roles.includes(role));
}
