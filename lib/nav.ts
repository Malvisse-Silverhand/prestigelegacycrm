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
  MeIcon,
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
    roles: ["superadmin", "group_manager", "unit_manager"],
  },
  { href: "/quotation", label: "Quotation", icon: QuotationIcon },
  { href: "/wa-flow", label: "WA Flow", icon: WaFlowIcon },
  {
    href: "/statistics",
    label: "Statistics",
    icon: StatisticsIcon,
    roles: ["superadmin", "group_manager", "unit_manager"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
    roles: ["superadmin", "group_manager"],
  },
];

export const MOBILE_NAV = [
  { href: "/dashboard", label: "Home", icon: DashboardIcon },
  { href: "/leads", label: "Leads", icon: LeadsIcon },
  { href: "/pipeline", label: "Pipeline", icon: PipelineIcon },
  { href: "/quotation", label: "Quote", icon: QuotationIcon },
  { href: "/me", label: "Me", icon: MeIcon },
];

export function visibleNav(role: Role) {
  return SIDEBAR_NAV.filter((item) => !item.roles || item.roles.includes(role));
}
