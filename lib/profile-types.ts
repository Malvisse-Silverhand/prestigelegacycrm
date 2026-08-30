export type Role =
  | "superadmin"
  | "group_manager"
  | "unit_manager"
  | "aspirant_unit_manager"
  | "agent";

// Highest first. Used wherever "at or below the viewer's level" has to be
// decided -- a lower index outranks a higher one.
export const ROLE_RANK: Record<Role, number> = {
  superadmin: 0,
  group_manager: 1,
  unit_manager: 2,
  aspirant_unit_manager: 3,
  agent: 4,
};

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
  aspirant_unit_manager: "Aspirant Unit Manager",
  agent: "Agent",
};
