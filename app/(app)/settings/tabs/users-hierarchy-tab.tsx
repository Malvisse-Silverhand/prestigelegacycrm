"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLE_RANK } from "@/lib/profile-types";
import type { Role, OrgTree, UnitManagerOption, UnitOption } from "../types";
import { inviteUser, updateUserAssignment, deleteUser } from "../actions";
import { waLink } from "@/lib/whatsapp";

const ROLE_LABEL: Record<Role, string> = {
  superadmin: "SuperAdmin",
  group_manager: "Group Manager",
  unit_manager: "Unit Manager",
  aspirant_unit_manager: "Aspirant UM",
  agent: "Agent",
};

// Mirrors creatableRoles() in ../actions -- you may only create/move someone
// below your own rank (superadmin excepted, who can mint peers).
function creatableRoles(role: Role): Role[] {
  const below = (Object.keys(ROLE_RANK) as Role[]).filter((r) => ROLE_RANK[r] > ROLE_RANK[role]);
  return role === "superadmin" ? [...below, "superadmin"] : below;
}

// Group managers and superadmins attach to nothing; everyone else is placed
// under a supervisor (or, for a unit manager, a unit). Mirrors
// resolveAssignment() in ../actions.
function needsAssignment(role: Role) {
  return role === "unit_manager" || role === "aspirant_unit_manager" || role === "agent";
}

function assignmentLabel(role: Role) {
  if (role === "agent") return "Assigned under (supervisor)";
  if (role === "aspirant_unit_manager") return "Assigned under (Group or Unit Manager)";
  return "Assigned under (Group Manager)";
}

// Normalised to {id,label} so the <select> renders the same either way,
// whether the choices are people or units.
const SUPERVISOR_SUFFIX: Record<string, string> = {
  group_manager: " (Group Manager)",
  aspirant_unit_manager: " (Aspirant UM)",
  unit_manager: "",
};

function assignmentChoicesFor(
  role: Role,
  opts: { unitManagers: UnitManagerOption[]; units: UnitOption[] },
): { id: string; label: string }[] {
  // An agent may report to a Group Manager, a Unit Manager or an Aspirant UM;
  // an Aspirant UM to a Group Manager or a Unit Manager. A Unit Manager only
  // ever reports to a Group Manager -- their own unit follows them there.
  const supervisorRoles =
    role === "agent"
      ? ["group_manager", "unit_manager", "aspirant_unit_manager"]
      : role === "aspirant_unit_manager"
        ? ["group_manager", "unit_manager"]
        : ["group_manager"];

  if (role === "agent" || role === "aspirant_unit_manager" || role === "unit_manager") {
    return opts.unitManagers
      .filter((m) => supervisorRoles.includes(m.role))
      .map((m) => ({
        id: m.id,
        label: `${m.full_name}${m.unitName ? ` — ${m.unitName}` : ""}${SUPERVISOR_SUFFIX[m.role] ?? ""}`,
      }));
  }
  return [];
}

// The message an admin pastes straight into WhatsApp. Written in BM because
// it is sent to a person, not shown in the CRM -- the same exception the WA
// Flow template bodies use. Asterisks are WhatsApp's bold syntax.
//
// The origin is read from the browser rather than hard-coded, so the link is
// always the environment the admin is actually using.
function shareMessage(s: { fullName: string; email: string; tempPassword: string }) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return [
    "*Prestige Legacy CRM*",
    "",
    `Salam ${s.fullName}, akaun CRM anda sudah siap.`,
    "",
    `🔗 Log masuk: ${origin}/login`,
    `📧 Emel: ${s.email}`,
    `🔑 Kata laluan sementara: ${s.tempPassword}`,
    "",
    "Sila tukar kata laluan selepas log masuk kali pertama.",
  ].join("\n");
}

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

const editPencil = (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
  </svg>
);

function CollapseButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? "Expand" : "Collapse"}
      aria-expanded={!collapsed}
      className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-current opacity-60 hover:opacity-100"
    >
      <svg
        width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
        className={`transition-transform ${collapsed ? "" : "rotate-180"}`}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Delete user"
      title="Delete user"
      className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-alert-red opacity-70 hover:opacity-100"
    >
      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
      </svg>
    </button>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Edit user"
      className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-current opacity-70 hover:opacity-100"
    >
      {editPencil}
    </button>
  );
}

export function UsersHierarchyTab({
  role,
  orgTree,
  assignmentOptions,
}: {
  role: Role;
  orgTree: OrgTree;
  assignmentOptions: { unitManagers: UnitManagerOption[]; units: UnitOption[] };
}) {
  const { superadmins, groupManagers, roleCounts } = orgTree;
  // Mirrors canManageSettings() in ../actions.
  const canEdit = role === "superadmin" || role === "group_manager" || role === "unit_manager";
  const [editing, setEditing] = useState<
    { id: string; fullName: string; email: string; phone: string; role: Role; currentAssignedUnderId: string | null } | null
  >(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  // Collapsed by id; everything starts expanded so the tree still reads as a
  // tree, and long branches can be folded away.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleCollapse = (id: string) =>
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  return (
    <div>
      <div className="rounded-[18px] border border-sand bg-white px-[22px] pb-6 pt-5 shadow-[0_1px_2px_rgba(15,37,64,.05)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[15.5px] font-bold text-navy">Organisation structure</div>
            <div className="mt-0.5 text-xs font-medium text-muted">
              {roleCounts.superadmin} SuperAdmin · {roleCounts.group_manager} Group Manager · {roleCounts.unit_manager} Unit Manager ·{" "}
              {roleCounts.aspirant_unit_manager} Aspirant UM · {roleCounts.agent} Agent
            </div>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex flex-none items-center gap-1.5 rounded-[10px] bg-navy px-3.5 py-2.5 text-[12.5px] font-semibold text-white"
            >
              + Add user
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          {role === "superadmin" &&
            superadmins.map((sa) => (
              <div key={sa.id} className="flex items-center gap-3 rounded-[14px] bg-navy px-4 py-3.5">
                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-gold text-[11.5px] font-bold text-navy">
                  {initialsOf(sa.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold text-white">{sa.full_name}</div>
                  <div className="truncate text-[11.5px] text-white/50">{sa.email}</div>
                </div>
                <span className="flex-none rounded-[6px] bg-gold px-[9px] py-1 text-[10px] font-bold text-navy">SUPERADMIN</span>
              </div>
            ))}

          {groupManagers.length === 0 && (
            <div className="rounded-[12px] border border-dashed border-taupe px-4 py-6 text-center text-[12.5px] font-medium text-taupe-2">
              No Group Managers in scope yet.
            </div>
          )}

          {groupManagers.map((gm) => (
            <div key={gm.id} className={role === "superadmin" ? "pl-[26px]" : ""}>
              <div className="flex items-center gap-3 rounded-[14px] border border-[#dbeee2] bg-success-bg px-4 py-[13px] text-green">
                <div className="flex h-[32px] w-[32px] items-center justify-center rounded-[10px] bg-green text-[11px] font-bold text-white">
                  {initialsOf(gm.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-navy">{gm.full_name}</div>
                  <div className="truncate text-[11.5px] text-muted">
                    {gm.units.length} unit{gm.units.length === 1 ? "" : "s"} ·{" "}
                    {gm.units.reduce(
                      (s, u) => s + u.agents.length + u.aspirants.reduce((n, a) => n + a.agents.length, 0),
                      0,
                    ) +
                      gm.directAgents.length +
                      gm.directAspirants.reduce((n, a) => n + a.agents.length, 0)}{" "}
                    agents
                  </div>
                </div>
                <span className="flex-none rounded-[6px] bg-white px-[9px] py-1 text-[10px] font-bold text-green">GROUP MANAGER</span>
                <CollapseButton collapsed={!!collapsed[gm.id]} onClick={() => toggleCollapse(gm.id)} />
                {canEdit && (
                  <EditButton
                    onClick={() => setEditing({ id: gm.id, fullName: gm.full_name, email: gm.email, phone: gm.phone ?? "", role: "group_manager", currentAssignedUnderId: null })}
                  />
                )}
                {canEdit && <DeleteButton onClick={() => setConfirmDelete({ id: gm.id, name: gm.full_name })} />}
              </div>

              <div className={`flex-col gap-2 pl-[26px] pt-2.5 ${collapsed[gm.id] ? "hidden" : "flex"}`}>
                {/* Reports straight to the Group Manager -- no unit in between. */}
                {gm.directAgents.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {gm.directAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-2.5 rounded-lg border border-sand-3 bg-white px-3 py-2"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sand-3 text-[9.5px] font-bold text-navy">
                          {initialsOf(agent.full_name)}
                        </div>
                        <div className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-navy">
                          {agent.full_name}
                        </div>
                        <span className="flex-none rounded-[5px] bg-warn-gold-bg px-[7px] py-[2px] text-[9px] font-bold text-warn-gold-text">
                          AGENT
                        </span>
                        {canEdit && (
                          <EditButton
                            onClick={() =>
                              setEditing({
                                id: agent.id,
                                fullName: agent.full_name,
                                email: agent.email,
                                phone: agent.phone ?? "",
                                role: "agent",
                                currentAssignedUnderId: gm.id,
                              })
                            }
                          />
                        )}
                        {canEdit && (
                          <DeleteButton onClick={() => setConfirmDelete({ id: agent.id, name: agent.full_name })} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Also reports straight to the Group Manager, but still runs their
                    own team of agents -- same shape as an aspirant inside a unit. */}
                {gm.directAspirants.map((asp) => (
                  <div key={asp.id}>
                    <div className="flex items-center gap-2.5 rounded-lg border border-[#e7dcc1] bg-warn-gold-bg px-3 py-2">
                      <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-gold text-[9.5px] font-bold text-navy">
                        {initialsOf(asp.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-bold text-navy">{asp.full_name}</div>
                        <div className="truncate text-[10.5px] text-taupe">
                          {asp.agents.length} agent{asp.agents.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      <span className="flex-none rounded-[5px] bg-white px-[7px] py-[2px] text-[9px] font-bold text-warn-gold-text">
                        ASPIRANT UM
                      </span>
                      <CollapseButton collapsed={!!collapsed[asp.id]} onClick={() => toggleCollapse(asp.id)} />
                      {canEdit && (
                        <EditButton
                          onClick={() =>
                            setEditing({
                              id: asp.id,
                              fullName: asp.full_name,
                              email: asp.email,
                              phone: asp.phone ?? "",
                              role: "aspirant_unit_manager",
                              currentAssignedUnderId: gm.id,
                            })
                          }
                        />
                      )}
                      {canEdit && (
                        <DeleteButton onClick={() => setConfirmDelete({ id: asp.id, name: asp.full_name })} />
                      )}
                    </div>
                    {asp.agents.length > 0 && (
                      <div className={`flex-col gap-1.5 pl-[22px] pt-1.5 ${collapsed[asp.id] ? "hidden" : "flex"}`}>
                        {asp.agents.map((agent) => (
                          <div
                            key={agent.id}
                            className="flex items-center gap-2.5 rounded-lg border border-sand-3 bg-white px-3 py-2"
                          >
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sand-3 text-[9.5px] font-bold text-navy">
                              {initialsOf(agent.full_name)}
                            </div>
                            <div className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-navy">
                              {agent.full_name}
                            </div>
                            <span className="flex-none rounded-[5px] bg-warn-gold-bg px-[7px] py-[2px] text-[9px] font-bold text-warn-gold-text">
                              AGENT
                            </span>
                            {canEdit && (
                              <EditButton
                                onClick={() =>
                                  setEditing({
                                    id: agent.id,
                                    fullName: agent.full_name,
                                    email: agent.email,
                                    phone: agent.phone ?? "",
                                    role: "agent",
                                    currentAssignedUnderId: asp.id,
                                  })
                                }
                              />
                            )}
                            {canEdit && (
                              <DeleteButton onClick={() => setConfirmDelete({ id: agent.id, name: agent.full_name })} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {gm.units.map((unit) => (
                  <div key={unit.id}>
                    <div className="flex items-center gap-3 rounded-xl border border-sand-2 bg-cream px-3.5 py-[11px]">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy text-[10px] font-bold text-gold">
                        {unit.unitManager ? initialsOf(unit.unitManager.full_name) : "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-bold text-navy">{unit.unitManager?.full_name ?? "No Unit Manager assigned"}</div>
                        <div className="truncate text-[11px] text-taupe">
                          {unit.name} · {unit.agents.length} agent{unit.agents.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      {unit.unitManager && (
                        <span className="flex-none rounded-[6px] bg-info-blue-bg px-2 py-[3px] text-[9.5px] font-bold text-[#45566b]">
                          UNIT MANAGER
                        </span>
                      )}
                      {unit.unitManager && (
                        <CollapseButton collapsed={!!collapsed[unit.id]} onClick={() => toggleCollapse(unit.id)} />
                      )}
                      {canEdit && unit.unitManager && (
                        <EditButton
                          onClick={() =>
                            setEditing({
                              id: unit.unitManager!.id,
                              fullName: unit.unitManager!.full_name,
                              email: unit.unitManager!.email,
                              phone: unit.unitManager!.phone ?? "",
                              role: "unit_manager",
                              currentAssignedUnderId: gm.id,
                            })
                          }
                        />
                      )}
                      {canEdit && unit.unitManager && (
                        <DeleteButton onClick={() => setConfirmDelete({ id: unit.unitManager!.id, name: unit.unitManager!.full_name })} />
                      )}
                    </div>

                    {unit.aspirants.map((asp) => (
                      <div key={asp.id} className={`pl-[22px] pt-1.5 ${collapsed[unit.id] ? "hidden" : ""}`}>
                        <div className="flex items-center gap-2.5 rounded-lg border border-[#e7dcc1] bg-warn-gold-bg px-3 py-2">
                          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-gold text-[9.5px] font-bold text-navy">
                            {initialsOf(asp.full_name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] font-bold text-navy">{asp.full_name}</div>
                            <div className="truncate text-[10.5px] text-taupe">
                              {asp.agents.length} agent{asp.agents.length === 1 ? "" : "s"}
                            </div>
                          </div>
                          <span className="flex-none rounded-[5px] bg-white px-[7px] py-[2px] text-[9px] font-bold text-warn-gold-text">
                            ASPIRANT UM
                          </span>
                          <CollapseButton collapsed={!!collapsed[asp.id]} onClick={() => toggleCollapse(asp.id)} />
                          {canEdit && (
                            <EditButton
                              onClick={() =>
                                setEditing({
                                  id: asp.id,
                                  fullName: asp.full_name,
                                  email: asp.email,
                                  phone: asp.phone ?? "",
                                  role: "aspirant_unit_manager",
                                  currentAssignedUnderId: unit.unitManager?.id ?? null,
                                })
                              }
                            />
                          )}
                          {canEdit && (
                            <DeleteButton onClick={() => setConfirmDelete({ id: asp.id, name: asp.full_name })} />
                          )}
                        </div>
                        {asp.agents.length > 0 && (
                          <div className={`flex-col gap-1.5 pl-[22px] pt-1.5 ${collapsed[asp.id] ? "hidden" : "flex"}`}>
                            {asp.agents.map((agent) => (
                              <div
                                key={agent.id}
                                className="flex items-center gap-2.5 rounded-lg border border-sand-3 bg-white px-3 py-2"
                              >
                                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sand-3 text-[9.5px] font-bold text-navy">
                                  {initialsOf(agent.full_name)}
                                </div>
                                <div className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-navy">
                                  {agent.full_name}
                                </div>
                                <span className="flex-none rounded-[5px] bg-warn-gold-bg px-[7px] py-[2px] text-[9px] font-bold text-warn-gold-text">
                                  AGENT
                                </span>
                                {canEdit && (
                                  <EditButton
                                    onClick={() =>
                                      setEditing({
                                        id: agent.id,
                                        fullName: agent.full_name,
                                        email: agent.email,
                                        phone: agent.phone ?? "",
                                        role: "agent",
                                        currentAssignedUnderId: asp.id,
                                      })
                                    }
                                  />
                                )}
                                {canEdit && (
                                  <DeleteButton onClick={() => setConfirmDelete({ id: agent.id, name: agent.full_name })} />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {unit.agents.length > 0 && (
                      <div className={`flex-col gap-1.5 pl-[22px] pt-1.5 ${collapsed[unit.id] ? "hidden" : "flex"}`}>
                        {unit.agents.map((agent) => (
                          <div
                            key={agent.id}
                            className="flex items-center gap-2.5 rounded-lg border border-sand-3 bg-white px-3 py-2"
                          >
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sand-3 text-[9.5px] font-bold text-navy">
                              {initialsOf(agent.full_name)}
                            </div>
                            <div className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-navy">{agent.full_name}</div>
                            <span className="flex-none rounded-[5px] bg-warn-gold-bg px-[7px] py-[2px] text-[9px] font-bold text-warn-gold-text">
                              AGENT
                            </span>
                            {canEdit && (
                              <EditButton
                                onClick={() =>
                                  setEditing({
                                    id: agent.id,
                                    fullName: agent.full_name,
                                    email: agent.email,
                                    phone: agent.phone ?? "",
                                    role: "agent",
                                    currentAssignedUnderId: unit.unitManager?.id ?? null,
                                  })
                                }
                              />
                            )}
                            {canEdit && (
                              <DeleteButton onClick={() => setConfirmDelete({ id: agent.id, name: agent.full_name })} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-elevated">
            <EditUserPanel
              // Remount on a different user so the fields reset to theirs
              // instead of keeping whatever was typed for the previous one.
              key={editing.id}
              editing={editing}
              assignmentOptions={assignmentOptions}
              viewerRole={role}
              onDone={() => setEditing(null)}
            />
          </div>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-elevated">
            <AddUserForm role={role} assignmentOptions={assignmentOptions} onClose={() => setAdding(false)} />
          </div>
        </div>
      )}

      {confirmDelete && (
        <DeleteUserDialog
          user={confirmDelete}
          onDone={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function EditUserPanel({
  editing,
  assignmentOptions,
  viewerRole,
  onDone,
}: {
  editing: { id: string; fullName: string; email: string; phone: string; role: Role; currentAssignedUnderId: string | null };
  assignmentOptions: { unitManagers: UnitManagerOption[]; units: UnitOption[] };
  viewerRole: Role;
  onDone: () => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(editing.fullName);
  const [email, setEmail] = useState(editing.email);
  const [phone, setPhone] = useState(editing.phone);
  const [newRole, setNewRole] = useState<Role>(editing.role);
  const [assignedUnderId, setAssignedUnderId] = useState(editing.currentAssignedUnderId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const requiresAssignment = needsAssignment(newRole);
  const assignmentChoices = assignmentChoicesFor(newRole, assignmentOptions);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateUserAssignment({
          userId: editing.id,
          fullName,
          email,
          phone,
          role: newRole,
          assignedUnderId: requiresAssignment ? assignedUnderId || null : null,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
        return;
      }
      onDone();
    });
  }

  return (
    <div className="px-[22px] pb-[22px] pt-5">
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-bold text-navy">Edit {editing.fullName}</div>
        <button type="button" onClick={onDone} className="text-[12px] font-semibold text-muted">
          Cancel
        </button>
      </div>
      <div className="mt-0.5 text-xs font-medium text-muted">
        Update their details, role, or move them elsewhere in the hierarchy.
      </div>

      <div className="mt-4 flex flex-col gap-3.5">
        <Field label="Full name">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
          />
        </Field>
        <Field label="Email">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
          />
          <p className="mt-1 text-[10.5px] font-medium text-taupe">Changing this changes their login email too.</p>
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            placeholder="012-345 6789"
            className="h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
          />
        </Field>
        <Field label="Role">
          <div className="grid grid-cols-2 gap-[7px]">
            {creatableRoles(viewerRole).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setNewRole(r);
                  setAssignedUnderId("");
                }}
                className={`rounded-[9px] border px-[9px] py-2.5 text-center text-xs font-semibold transition-colors ${
                  newRole === r ? "border-navy bg-navy text-white" : "border-sand-2 bg-cream text-muted"
                }`}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </Field>
        {requiresAssignment && (
          <Field label={assignmentLabel(newRole)}>
            <select
              value={assignedUnderId}
              onChange={(e) => setAssignedUnderId(e.target.value)}
              className="h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
            >
              <option value="">Choose…</option>
              {assignmentChoices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {assignmentChoices.length === 0 && (
              <div className="mt-1.5 text-[11px] font-medium text-alert-red">No options available yet.</div>
            )}
          </Field>
        )}

        {error && <div className="text-[12px] font-medium text-alert-red">{error}</div>}

        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !fullName.trim() || !email.trim() || !phone.trim() || (requiresAssignment && !assignedUnderId)}
          className="mt-0.5 flex h-[46px] items-center justify-center rounded-xl bg-navy text-[13.5px] font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function DeleteUserDialog({
  user,
  onDone,
}: {
  user: { id: string; name: string };
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteUser(user.id);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
        onDone();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated">
        <div className="text-[15px] font-bold text-navy">Delete {user.name}?</div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          This permanently removes their login and profile. Anyone reporting to them is detached rather than
          deleted. A user who still owns leads must have those reassigned first.
        </p>
        {error && (
          <div className="mt-3 rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
            {error}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onDone}
            className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded-[10px] bg-alert-red px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Delete user"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddUserForm({
  role,
  assignmentOptions,
  onClose,
}: {
  role: Role;
  assignmentOptions: { unitManagers: UnitManagerOption[]; units: UnitOption[] };
  onClose: () => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newRole, setNewRole] = useState<Role>("agent");
  const [assignedUnderId, setAssignedUnderId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    fullName: string;
    email: string;
    phone: string;
    tempPassword: string;
    emailSent: boolean;
    emailError: string | null;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const availableRoles = creatableRoles(role);
  const requiresAssignment = needsAssignment(newRole);
  const assignmentChoices = assignmentChoicesFor(newRole, assignmentOptions);

  function handleRoleChange(r: Role) {
    setNewRole(r);
    setAssignedUnderId("");
  }

  function handleSubmit() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const result = await inviteUser({
          fullName,
          email,
          phone,
          role: newRole,
          assignedUnderId: requiresAssignment ? assignedUnderId || null : null,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setSuccess({
          fullName,
          email: result.email!,
          phone: result.phone!,
          tempPassword: result.tempPassword!,
          emailSent: result.emailSent ?? false,
          emailError: result.emailError ?? null,
        });
        setFullName("");
        setEmail("");
        setPhone("");
        setAssignedUnderId("");
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  if (success) {
    return (
      <div className="px-[22px] pb-[22px] pt-5">
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-bold text-navy">Account created</div>
          <button type="button" onClick={onClose} className="text-[12px] font-semibold text-muted">
            Close
          </button>
        </div>
        {success.emailSent ? (
          <div className="mt-2 rounded-[10px] bg-success-bg px-3.5 py-2.5 text-[12px] font-medium text-green">
            A set-your-password email was sent to {success.email}. For security, the email contains a link
            rather than the password below — so still pass this temporary password on if they need to sign
            in right away.
          </div>
        ) : (
          <div className="mt-2 rounded-[10px] bg-warn-gold-bg px-3.5 py-2.5 text-[12px] font-medium text-warn-gold-text">
            The account works, but the email could not be sent
            {success.emailError ? ` (${success.emailError})` : ""}. Share the temporary password below with{" "}
            {success.email} directly.
          </div>
        )}
        <div className="mt-4 rounded-[10px] border border-sand-2 bg-cream px-3.5 py-3">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">Temporary password</div>
          <div className="mt-1 select-all font-mono text-[15px] font-bold text-navy">{success.tempPassword}</div>
        </div>

        <a
          href={waLink(success.phone, shareMessage(success))}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-green text-[13px] font-semibold text-white"
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.11h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.14.82.84-3.06-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24Zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.42-.14-.01-.31-.01-.47-.01a.9.9 0 0 0-.65.31c-.22.25-.86.84-.86 2.04 0 1.2.88 2.37 1 2.53.12.17 1.73 2.64 4.2 3.7.59.25 1.04.4 1.4.52.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.1-.23-.16-.48-.28Z" />
          </svg>
          Share to WhatsApp
        </a>
        <button
          type="button"
          onClick={() => setSuccess(null)}
          className="mt-4 flex h-[42px] w-full items-center justify-center rounded-xl bg-navy text-[13px] font-semibold text-white"
        >
          Add another user
        </button>
      </div>
    );
  }

  return (
    <div className="px-[22px] pb-[22px] pt-5">
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-bold text-navy">Add a new user</div>
        <button type="button" onClick={onClose} className="text-[12px] font-semibold text-muted">
          Cancel
        </button>
      </div>
      <div className="mt-0.5 text-xs font-medium text-muted">Creates a real login — share the temporary password with them directly.</div>

      <div className="mt-4 flex flex-col gap-3.5">
        <Field label="Full name">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Amirah Zahra Latif"
            className="h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
          />
        </Field>
        <Field label="Email">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="amirah.zahra@takaful4us.my"
            type="email"
            className="h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
          />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="012-345 6789"
            type="tel"
            className="h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
          />
          <p className="mt-1 text-[10.5px] font-medium text-taupe">Used for the &ldquo;Share to WhatsApp&rdquo; button below.</p>
        </Field>
        <Field label="Role">
          <div className="grid grid-cols-2 gap-[7px]">
            {availableRoles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleChange(r)}
                className={`rounded-[9px] border px-[9px] py-2.5 text-center text-xs font-semibold transition-colors ${
                  newRole === r ? "border-navy bg-navy text-white" : "border-sand-2 bg-cream text-muted"
                }`}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </Field>
        {requiresAssignment && (
          <Field label={assignmentLabel(newRole)}>
            <select
              value={assignedUnderId}
              onChange={(e) => setAssignedUnderId(e.target.value)}
              className="h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
            >
              <option value="">Choose…</option>
              {assignmentChoices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {assignmentChoices.length === 0 && (
              <div className="mt-1.5 text-[11px] font-medium text-alert-red">
                {newRole === "unit_manager"
                  ? "No Group Managers available to assign under yet."
                  : "No supervisors available to assign under yet."}
              </div>
            )}
          </Field>
        )}

        {error && <div className="text-[12px] font-medium text-alert-red">{error}</div>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !fullName || !email || !phone || (requiresAssignment && !assignedUnderId)}
          className="mt-0.5 flex h-[46px] items-center justify-center rounded-xl bg-navy text-[13.5px] font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Creating…" : "Send Invitation"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">{label}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
