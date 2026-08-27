export type Role = "superadmin" | "group_manager" | "unit_manager" | "agent";

export type CurrentProfile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  unit_id: string | null;
  unit_name: string | null;
  avatar_initials: string;
};

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: "SuperAdmin",
  group_manager: "Group Manager",
  unit_manager: "Unit Manager",
  agent: "Agent",
};
