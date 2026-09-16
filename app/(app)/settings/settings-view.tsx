"use client";

import { useState } from "react";
import type {
  Role,
  OrgTree,
  UnitManagerOption,
  UnitOption,
  TargetRow,
  CampaignRow,
  DistributionSettings,
  AuditEntry,
  LeadSourceStat,
  WebhookRow,
  InviteLinkRow,
  JoinRequestRow,
  TrackingCodeSettings,
  TrackablePage,
} from "./types";
import { UsersHierarchyTab } from "./tabs/users-hierarchy-tab";
import { RolesPermissionsTab } from "./tabs/roles-permissions-tab";
import { SetTargetTab } from "./tabs/set-target-tab";
import { LeadDistributionTab } from "./tabs/lead-distribution-tab";
import { LeadSourcesTab } from "./tabs/lead-sources-tab";
import { AuditLogTab } from "./tabs/audit-log-tab";
import { WebhooksTab } from "./tabs/webhooks-tab";
import { JoinRequestsTab } from "./tabs/join-requests-tab";
import { TrackingCodeTab } from "./tabs/tracking-code-tab";
import { BenefitsTab } from "./tabs/benefits-tab";
import { MyProfileTab } from "./tabs/my-profile-tab";
import type { BenefitOption } from "@/app/(app)/my-sales/types";
import type { MyProfileDetails } from "./data";

const TABS = [
  "My Profile",
  "Users & Hierarchy",
  "Join Requests",
  "Roles & Permissions",
  "Set Target",
  "Lead Distribution",
  "Lead Sources",
  "Benefits",
  "Webhooks",
  "Tracking Code",
  "Audit Log",
] as const;
type Tab = (typeof TABS)[number];

// Grouped so the sidebar reads as sections rather than one long list. Every
// tab appears in exactly one group; anything a role can't see is dropped from
// its group, and an empty group disappears.
const GROUPS: { heading: string; tabs: readonly Tab[] }[] = [
  { heading: "Account", tabs: ["My Profile"] },
  { heading: "People", tabs: ["Users & Hierarchy", "Join Requests", "Roles & Permissions"] },
  { heading: "Performance", tabs: ["Set Target", "Lead Distribution", "Lead Sources"] },
  { heading: "Sales", tabs: ["Benefits"] },
  { heading: "Integrations", tabs: ["Webhooks", "Tracking Code"] },
  { heading: "Security", tabs: ["Audit Log"] },
];

const DESCRIPTIONS: Record<Tab, string> = {
  "My Profile": "Your own name, phone number and email",
  "Users & Hierarchy": "Who is in the organisation and who they report to",
  "Join Requests": "Agents who signed up through a shared invite link",
  "Roles & Permissions": "What each role can see and do",
  "Set Target": "Monthly ANC and NOC targets",
  "Lead Distribution": "How new leads are shared out",
  "Lead Sources": "Where your leads are coming from",
  Benefits: "The benefits agents can pick when submitting a case",
  Webhooks: "Send lead events to Pabbly Connect and other tools",
  "Tracking Code": "Meta and TikTok pixels on your landing pages",
  "Audit Log": "Every sensitive action, and who took it",
};

export function SettingsView({
  role,
  orgTree,
  assignmentOptions,
  monthDate,
  targets,
  campaign,
  distribution,
  auditLog,
  leadSources,
  webhooks,
  inviteLinks,
  joinRequests,
  trackingCode,
  trackablePages,
  benefits,
  currentUserId,
  myProfile,
}: {
  role: Role;
  orgTree: OrgTree;
  assignmentOptions: { unitManagers: UnitManagerOption[]; units: UnitOption[] };
  monthDate: string;
  targets: TargetRow[];
  campaign: CampaignRow | null;
  distribution: DistributionSettings;
  auditLog: AuditEntry[] | null;
  leadSources: LeadSourceStat[];
  webhooks: WebhookRow[];
  inviteLinks: InviteLinkRow[];
  joinRequests: JoinRequestRow[];
  trackingCode: TrackingCodeSettings;
  trackablePages: TrackablePage[];
  benefits: BenefitOption[];
  currentUserId: string;
  myProfile: MyProfileDetails;
}) {
  // Set Target is the one tab open to every role (own + downline targets);
  // everything else is hierarchy administration. Audit Log and Tracking Code
  // stay SuperAdmin-only -- tracking code runs script on the public site, so
  // it sits with the role that already has full control. Webhooks is org-wide
  // integration config, so it matches its RLS audience: superadmin + group
  // managers.
  const isManager = role === "superadmin" || role === "group_manager" || role === "unit_manager";
  const visibleTabs = !isManager
    ? (["My Profile", "Set Target"] as const as readonly Tab[])
    : role === "superadmin"
      ? TABS
      : role === "group_manager"
        ? TABS.filter((t) => t !== "Audit Log" && t !== "Tracking Code")
        : TABS.filter(
          (t) => t !== "Audit Log" && t !== "Tracking Code" && t !== "Webhooks" && t !== "Benefits",
        );
  const [tab, setTab] = useState<Tab>(visibleTabs[0]);

  const groups = GROUPS.map((g) => ({ ...g, tabs: g.tabs.filter((t) => visibleTabs.includes(t)) })).filter(
    (g) => g.tabs.length > 0,
  );

  const pendingJoinCount = joinRequests.filter((r) => r.status === "pending").length;
  // Who an agent from a shared link may be filed under. Same rule the Add User
  // form applies: a Unit Manager can't park someone under a Group Manager, and
  // a Group Manager can only use themselves as a direct supervisor.
  const supervisorOptions = assignmentOptions.unitManagers.filter((o) => {
    if (o.role !== "group_manager") return true;
    if (role === "unit_manager") return false;
    if (role === "group_manager") return o.id === currentUserId;
    return true;
  });

  function badgeFor(t: Tab) {
    if (t !== "Join Requests" || pendingJoinCount === 0) return null;
    return (
      <span className="ml-auto rounded-full bg-alert-red px-1.5 py-[1px] text-[10px] font-bold text-white">
        {pendingJoinCount}
      </span>
    );
  }

  return (
    <div>
      <div className="border-b border-sand bg-white px-5 lg:px-[30px] py-5">
        <div className="text-[22px] font-extrabold tracking-[-0.02em] text-navy">System Settings</div>
        <div className="mt-[3px] text-[13px] font-medium text-muted">
          Organisation structure, roles, and lead distribution rules
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start">
        {/* Below lg the sidebar becomes a single scrolling strip -- a vertical
            list would push the actual settings off the first screen on a
            phone. */}
        <nav
          aria-label="Settings sections"
          className="flex-none border-b border-sand bg-white px-5 py-3 lg:sticky lg:top-0 lg:w-[236px] lg:border-r lg:border-b-0 lg:px-4 lg:py-[18px]"
        >
          <div className="flex gap-1.5 overflow-x-auto lg:flex-col lg:gap-0 lg:overflow-visible">
            {groups.map((group, groupIndex) => (
              <div key={group.heading} className="contents lg:block">
                <div
                  className={`hidden px-[10px] pb-1.5 text-[10px] font-bold tracking-[0.1em] text-taupe-2 uppercase lg:block ${
                    groupIndex > 0 ? "pt-4" : ""
                  }`}
                >
                  {group.heading}
                </div>
                {group.tabs.map((t) => {
                  const active = tab === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      aria-current={active ? "page" : undefined}
                      className={`flex flex-none items-center gap-2 whitespace-nowrap rounded-[10px] px-[11px] py-2 text-left text-[13px] transition-colors lg:w-full ${
                        active
                          ? "bg-navy font-bold text-white"
                          : "font-semibold text-muted hover:bg-cream hover:text-navy"
                      }`}
                    >
                      <span className="truncate">{t}</span>
                      {badgeFor(t)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1 px-5 lg:px-[30px] py-6">
          <div className="mb-5 hidden lg:block">
            <div className="text-[17px] font-extrabold tracking-[-0.02em] text-navy">{tab}</div>
            <div className="mt-[2px] text-[12.5px] font-medium text-muted">{DESCRIPTIONS[tab]}</div>
          </div>

          {tab === "My Profile" && <MyProfileTab details={myProfile} />}
          {tab === "Users & Hierarchy" && (
            <UsersHierarchyTab
              role={role}
              orgTree={orgTree}
              assignmentOptions={assignmentOptions}
              onInviteViaLink={() => setTab("Join Requests")}
            />
          )}
          {tab === "Join Requests" && (
            <JoinRequestsTab
              inviteLinks={inviteLinks}
              joinRequests={joinRequests}
              supervisorOptions={supervisorOptions}
              currentUserId={currentUserId}
            />
          )}
          {tab === "Roles & Permissions" && <RolesPermissionsTab />}
          {tab === "Set Target" && (
            <SetTargetTab monthDate={monthDate} initialTargets={targets} campaign={campaign} />
          )}
          {tab === "Lead Distribution" && <LeadDistributionTab initial={distribution} />}
          {tab === "Lead Sources" && <LeadSourcesTab stats={leadSources} />}
          {tab === "Benefits" && (
            <BenefitsTab
              benefits={benefits}
              canManage={role === "superadmin" || role === "group_manager"}
            />
          )}
          {tab === "Webhooks" && <WebhooksTab webhooks={webhooks} />}
          {tab === "Tracking Code" && role === "superadmin" && (
            <TrackingCodeTab initial={trackingCode} pages={trackablePages} />
          )}
          {tab === "Audit Log" && role === "superadmin" && <AuditLogTab entries={auditLog ?? []} />}
        </div>
      </div>
    </div>
  );
}
