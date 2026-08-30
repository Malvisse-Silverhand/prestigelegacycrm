"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLE_RANK } from "@/lib/profile-types";
import type { Role, OrgTree, UnitManagerOption, UnitOption } from "../types";
import { inviteUser, updateUserAssignment } from "../actions";

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
  if (role === "agent") return "Assigned under (Unit Manager or Aspirant UM)";
  if (role === "aspirant_unit_manager") return "Assigned under (Unit Manager)";
  return "Assigned under (Unit)";
}

// Normalised to {id,label} so the <select> renders the same either way,
// whether the choices are people or units.
function assignmentChoicesFor(
  role: Role,
  opts: { unitManagers: UnitManagerOption[]; units: UnitOption[] },
): { id: string; label: string }[] {
  if (role === "agent") {
    return opts.unitManagers.map((m) => ({
      id: m.id,
      label: `${m.full_name} — ${m.unitName}${m.role === "aspirant_unit_manager" ? " (Aspirant UM)" : ""}`,
    }));
  }
  if (role === "aspirant_unit_manager") {
    return opts.unitManagers
      .filter((m) => m.role === "unit_manager")
      .map((m) => ({ id: m.id, label: `${m.full_name} — ${m.unitName}` }));
  }
  if (role === "unit_manager") return opts.units.map((u) => ({ id: u.id, label: u.name }));
  return [];
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
  const [editing, setEditing] = useState<{ id: string; fullName: string; role: Role; currentAssignedUnderId: string | null } | null>(
    null,
  );

  return (
    <div className="grid grid-cols-1 items-start gap-[22px] lg:grid-cols-[1fr_360px]">
      <div className="rounded-[18px] border border-sand bg-white px-[22px] pb-6 pt-5 shadow-[0_1px_2px_rgba(15,37,64,.05)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15.5px] font-bold text-navy">Organisation structure</div>
            <div className="mt-0.5 text-xs font-medium text-muted">
              {roleCounts.superadmin} SuperAdmin · {roleCounts.group_manager} Group Manager · {roleCounts.unit_manager} Unit Manager ·{" "}
              {roleCounts.aspirant_unit_manager} Aspirant UM · {roleCounts.agent} Agent
            </div>
          </div>
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
                    {gm.units.reduce((s, u) => s + u.agents.length, 0)} agents
                  </div>
                </div>
                <span className="flex-none rounded-[6px] bg-white px-[9px] py-1 text-[10px] font-bold text-green">GROUP MANAGER</span>
                {canEdit && (
                  <EditButton
                    onClick={() => setEditing({ id: gm.id, fullName: gm.full_name, role: "group_manager", currentAssignedUnderId: null })}
                  />
                )}
              </div>

              <div className="flex flex-col gap-2 pl-[26px] pt-2.5">
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
                      {canEdit && unit.unitManager && (
                        <EditButton
                          onClick={() =>
                            setEditing({
                              id: unit.unitManager!.id,
                              fullName: unit.unitManager!.full_name,
                              role: "unit_manager",
                              currentAssignedUnderId: unit.id,
                            })
                          }
                        />
                      )}
                    </div>

                    {unit.aspirants.map((asp) => (
                      <div key={asp.id} className="pl-[22px] pt-1.5">
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
                          {canEdit && (
                            <EditButton
                              onClick={() =>
                                setEditing({
                                  id: asp.id,
                                  fullName: asp.full_name,
                                  role: "aspirant_unit_manager",
                                  currentAssignedUnderId: unit.unitManager?.id ?? null,
                                })
                              }
                            />
                          )}
                        </div>
                        {asp.agents.length > 0 && (
                          <div className="flex flex-col gap-1.5 pl-[22px] pt-1.5">
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
                                        role: "agent",
                                        currentAssignedUnderId: asp.id,
                                      })
                                    }
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {unit.agents.length > 0 && (
                      <div className="flex flex-col gap-1.5 pl-[22px] pt-1.5">
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
                                    role: "agent",
                                    currentAssignedUnderId: unit.unitManager?.id ?? null,
                                  })
                                }
                              />
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

      <div className="flex flex-col gap-[18px]">
        <AddUserForm role={role} assignmentOptions={assignmentOptions} />
        {editing && (
          <EditUserPanel
            editing={editing}
            assignmentOptions={assignmentOptions}
            viewerRole={role}
            onDone={() => setEditing(null)}
          />
        )}
      </div>
    </div>
  );
}

function EditUserPanel({
  editing,
  assignmentOptions,
  viewerRole,
  onDone,
}: {
  editing: { id: string; fullName: string; role: Role; currentAssignedUnderId: string | null };
  assignmentOptions: { unitManagers: UnitManagerOption[]; units: UnitOption[] };
  viewerRole: Role;
  onDone: () => void;
}) {
  const router = useRouter();
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
    <div className="rounded-[18px] border-2 border-navy bg-white px-[22px] pb-[22px] pt-5">
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-bold text-navy">Edit {editing.fullName}</div>
        <button type="button" onClick={onDone} className="text-[12px] font-semibold text-muted">
          Cancel
        </button>
      </div>
      <div className="mt-0.5 text-xs font-medium text-muted">Change their role or move them elsewhere in the hierarchy.</div>

      <div className="mt-4 flex flex-col gap-3.5">
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
          disabled={pending || (requiresAssignment && !assignedUnderId)}
          className="mt-0.5 flex h-[46px] items-center justify-center rounded-xl bg-navy text-[13.5px] font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function AddUserForm({
  role,
  assignmentOptions,
}: {
  role: Role;
  assignmentOptions: { unitManagers: UnitManagerOption[]; units: UnitOption[] };
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("agent");
  const [assignedUnderId, setAssignedUnderId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    email: string;
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
          role: newRole,
          assignedUnderId: requiresAssignment ? assignedUnderId || null : null,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setSuccess({
          email: result.email!,
          tempPassword: result.tempPassword!,
          emailSent: result.emailSent ?? false,
          emailError: result.emailError ?? null,
        });
        setFullName("");
        setEmail("");
        setAssignedUnderId("");
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-[18px] border-2 border-gold bg-white px-[22px] pb-[22px] pt-5">
        <div className="text-[15px] font-bold text-navy">Account created</div>
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
    <div className="rounded-[18px] border border-sand bg-white px-[22px] pb-[22px] pt-5">
      <div className="text-[15px] font-bold text-navy">Add a new user</div>
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
                {newRole === "unit_manager" ? "No units available yet." : "No supervisors available to assign under yet."}
              </div>
            )}
          </Field>
        )}

        {error && <div className="text-[12px] font-medium text-alert-red">{error}</div>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !fullName || !email || (requiresAssignment && !assignedUnderId)}
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
