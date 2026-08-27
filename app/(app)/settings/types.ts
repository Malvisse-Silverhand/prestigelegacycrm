import type { Role } from "@/lib/profile-types";

export type OrgPerson = { id: string; full_name: string; email: string };
export type OrgUnit = { id: string; name: string; unitManager: OrgPerson | null; agentCount: number };
export type OrgGroupManager = { id: string; full_name: string; email: string; units: OrgUnit[] };
export type OrgTree = {
  superadmins: OrgPerson[];
  groupManagers: OrgGroupManager[];
  roleCounts: { superadmin: number; group_manager: number; unit_manager: number; agent: number };
};

export type UnitManagerOption = { id: string; full_name: string; unitName: string };
export type UnitOption = { id: string; name: string; groupManagerName: string | null };

export type TargetRow = { agentId: string; fullName: string; ancTarget: number | null; nocTarget: number | null };

export type DistributionSettings = {
  id: string | null;
  roundRobinEnabled: boolean;
  staleAfterDays: number;
  reassignRequiresApproval: boolean;
};

export type AuditEntry = {
  id: string;
  action: string;
  createdAt: string;
  actorName: string | null;
  targetName: string | null;
  metadata: Record<string, unknown> | null;
};

export type LeadSourceStat = { source: string; count: number; closedWon: number };

export type { Role };
