"use client";

import { useState } from "react";
import type { Role, OrgTree, UnitManagerOption, UnitOption, TargetRow, DistributionSettings, AuditEntry, LeadSourceStat, WebhookRow } from "./types";
import { UsersHierarchyTab } from "./tabs/users-hierarchy-tab";
import { RolesPermissionsTab } from "./tabs/roles-permissions-tab";
import { SetTargetTab } from "./tabs/set-target-tab";
import { LeadDistributionTab } from "./tabs/lead-distribution-tab";
import { LeadSourcesTab } from "./tabs/lead-sources-tab";
import { AuditLogTab } from "./tabs/audit-log-tab";
import { WebhooksTab } from "./tabs/webhooks-tab";

const TABS = [
  "Users & Hierarchy",
  "Roles & Permissions",
  "Set Target",
  "Lead Distribution",
  "Lead Sources",
  "Webhooks",
  "Audit Log",
] as const;
type Tab = (typeof TABS)[number];

export function SettingsView({
  role,
  orgTree,
  assignmentOptions,
  monthDate,
  targets,
  distribution,
  auditLog,
  leadSources,
  webhooks,
}: {
  role: Role;
  orgTree: OrgTree;
  assignmentOptions: { unitManagers: UnitManagerOption[]; units: UnitOption[] };
  monthDate: string;
  targets: TargetRow[];
  distribution: DistributionSettings;
  auditLog: AuditEntry[] | null;
  leadSources: LeadSourceStat[];
  webhooks: WebhookRow[];
}) {
  // Set Target is the one tab open to every role (own + downline targets);
  // everything else is hierarchy administration. Audit Log stays
  // SuperAdmin-only, and Webhooks is org-wide integration config, so it
  // matches its RLS audience: superadmin + group managers.
  const isManager = role === "superadmin" || role === "group_manager" || role === "unit_manager";
  const visibleTabs = !isManager
    ? (["Set Target"] as const as readonly Tab[])
    : role === "superadmin"
      ? TABS
      : role === "group_manager"
        ? TABS.filter((t) => t !== "Audit Log")
        : TABS.filter((t) => t !== "Audit Log" && t !== "Webhooks");
  const [tab, setTab] = useState<Tab>(visibleTabs[0]);

  return (
    <div>
      <div className="border-b border-sand bg-white px-5 lg:px-[30px] pt-5">
        <div className="text-[22px] font-extrabold tracking-[-0.02em] text-navy">System Settings</div>
        <div className="mt-[3px] text-[13px] font-medium text-muted">
          Organisation structure, roles, and lead distribution rules
        </div>
        <div className="mt-[18px] flex gap-[22px] overflow-x-auto">
          {visibleTabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-none whitespace-nowrap pb-3 text-[13.5px] font-bold transition-colors ${
                tab === t ? "border-b-[2.5px] border-gold text-navy" : "border-b-[2.5px] border-transparent font-medium text-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 lg:px-[30px] py-6">
        {tab === "Users & Hierarchy" && (
          <UsersHierarchyTab role={role} orgTree={orgTree} assignmentOptions={assignmentOptions} />
        )}
        {tab === "Roles & Permissions" && <RolesPermissionsTab />}
        {tab === "Set Target" && <SetTargetTab monthDate={monthDate} initialTargets={targets} />}
        {tab === "Lead Distribution" && <LeadDistributionTab initial={distribution} />}
        {tab === "Lead Sources" && <LeadSourcesTab stats={leadSources} />}
        {tab === "Webhooks" && <WebhooksTab webhooks={webhooks} />}
        {tab === "Audit Log" && role === "superadmin" && <AuditLogTab entries={auditLog ?? []} />}
      </div>
    </div>
  );
}
