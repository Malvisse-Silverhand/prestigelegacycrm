"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { LeagueNode, TeamMember } from "./data";

function initialsOf(name: string, given: string | null | undefined) {
  return given || name.split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

function formatRole(role: string) {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// A SuperAdmin oversees the whole organisation but isn't a "manager" in the
// sales-reporting sense, so they never appear as a node here. In practice
// getOrgLeague() already never hands back a superadmin as a node's manager --
// they're excluded from the query that builds LeagueNode in the first place
// (see MANAGED_ROLES in data.ts) -- so this is a belt-and-braces guard against
// that assumption ever changing, not something that fires today.
function excludeSuperadmins(nodes: LeagueNode[]): LeagueNode[] {
  return nodes
    .filter((n) => n.manager?.role !== "superadmin")
    .map((n) => ({ ...n, children: excludeSuperadmins(n.children) }));
}

function NodeCard({
  name,
  role,
  initials,
  isCurrentUser,
  placeholder,
}: {
  name: string;
  role: string;
  initials?: string | null;
  isCurrentUser?: boolean;
  placeholder?: boolean;
}) {
  return (
    <div
      className={`w-[152px] flex-none rounded-[14px] border bg-white px-2.5 py-2.5 text-center ${
        isCurrentUser
          ? "border-gold ring-2 ring-gold/40"
          : placeholder
            ? "border-dashed border-sand-2"
            : "border-sand"
      }`}
    >
      <div
        className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold ${
          placeholder ? "bg-cream text-taupe" : "bg-brand text-gold"
        }`}
      >
        {placeholder ? "—" : initialsOf(name, initials)}
      </div>
      <div className="mt-1.5 truncate text-[12px] font-bold text-navy">{name}</div>
      <div className="truncate text-[10px] font-medium text-taupe">{role}</div>
    </div>
  );
}

type ChildItem = { key: string; node: LeagueNode } | { key: string; agent: TeamMember };

function Branch({ node, currentUserId }: { node: LeagueNode; currentUserId?: string }) {
  const kids: ChildItem[] = [
    ...node.children.map((c) => ({ key: c.key, node: c }) as ChildItem),
    ...node.agents.map((a) => ({ key: a.id, agent: a }) as ChildItem),
  ];

  return (
    <div className="flex flex-col items-center">
      <NodeCard
        name={node.manager?.full_name ?? node.title}
        role={node.subtitle}
        initials={node.manager?.avatar_initials}
        isCurrentUser={!!node.manager && node.manager.id === currentUserId}
        placeholder={!node.manager}
      />

      {kids.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="h-5 w-px bg-sand-2" />
          <div className="flex items-start">
            {kids.map((kid, i) => (
              <div key={kid.key} className="flex flex-col items-center px-3">
                {kids.length > 1 ? (
                  <div className="relative h-5 w-full">
                    <div
                      className="absolute top-0 h-px bg-sand-2"
                      style={{ left: i === 0 ? "50%" : 0, right: i === kids.length - 1 ? "50%" : 0 }}
                    />
                    <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-sand-2" />
                  </div>
                ) : (
                  <div className="h-5 w-px bg-sand-2" />
                )}
                {"node" in kid ? (
                  <Branch node={kid.node} currentUserId={currentUserId} />
                ) : (
                  <NodeCard
                    name={kid.agent.full_name}
                    role={formatRole(kid.agent.role)}
                    initials={kid.agent.avatar_initials}
                    isCurrentUser={kid.agent.id === currentUserId}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// The tree itself -- CSS-only, no charting library. Each branch is a column
// (node, then a stem down to a shared bar, then its children laid out in a
// row); recursing that gives the classic org-chart shape. Wrapped in
// overflow-x-auto by the caller since a chart this wide can't reflow to one
// column on mobile and still look like a chart -- same pattern wide tables
// elsewhere in the app already use.
export function OrgChart({ roots, currentUserId }: { roots: LeagueNode[]; currentUserId?: string }) {
  const cleanRoots = excludeSuperadmins(roots);

  if (cleanRoots.length === 0) {
    return (
      <div className="rounded-2xl border border-sand bg-white p-8 text-center text-[13px] font-medium text-muted">
        Nobody to show in the org chart yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-sand bg-white p-5">
      <div className="flex w-max items-start gap-10 px-2 py-2">
        {cleanRoots.map((root) => (
          <Branch key={root.key} node={root} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  );
}

// Small Table / Org Chart switcher used on the Team Roster page. `table` is
// whatever view was already there (untouched) -- this just decides which of
// the two gets shown.
export function OrgChartToggle({
  roots,
  currentUserId,
  table,
  groupLabel,
  heading,
}: {
  roots: LeagueNode[];
  currentUserId?: string;
  table: ReactNode;
  groupLabel?: string;
  heading?: string;
}) {
  const [view, setView] = useState<"table" | "chart">("table");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-sand bg-white px-5 py-3 lg:px-[30px]">
        <button
          type="button"
          onClick={() => setView("table")}
          className={`rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold ${
            view === "table" ? "bg-brand text-white" : "border border-sand-2 bg-cream text-navy"
          }`}
        >
          Table
        </button>
        <button
          type="button"
          onClick={() => setView("chart")}
          className={`rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold ${
            view === "chart" ? "bg-brand text-white" : "border border-sand-2 bg-cream text-navy"
          }`}
        >
          Org Chart
        </button>
      </div>

      {view === "table" ? (
        table
      ) : (
        <div className="px-5 py-[22px] lg:px-[30px]">
          {(groupLabel || heading) && (
            <div className="mb-4">
              {groupLabel && <div className="text-xs font-semibold text-taupe">{groupLabel}</div>}
              {heading && (
                <div className="mt-1 text-[19px] font-extrabold tracking-[-0.02em] text-navy">{heading}</div>
              )}
            </div>
          )}
          <OrgChart roots={roots} currentUserId={currentUserId} />
        </div>
      )}
    </div>
  );
}
