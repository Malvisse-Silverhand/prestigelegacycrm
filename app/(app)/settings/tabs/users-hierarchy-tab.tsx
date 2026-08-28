"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role, OrgTree, UnitManagerOption, UnitOption } from "../types";
import { inviteUser, updateUserAssignment } from "../actions";

const ROLE_LABEL: Record<Role, string> = {
  superadmin: "SuperAdmin",
  group_manager: "Group Manager",
  unit_manager: "Unit Manager",
  agent: "Agent",
};

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
  const canEdit = role === "superadmin";
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
              {roleCounts.agent} Agent
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
                <div className="flex-1">
                  <div className="text-[13.5px] font-bold text-white">{sa.full_name}</div>
                  <div className="text-[11.5px] text-white/50">{sa.email}</div>
                </div>
                <span className="rounded-[6px] bg-gold px-[9px] py-1 text-[10px] font-bold text-navy">SUPERADMIN</span>
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
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-navy">{gm.full_name}</div>
                  <div className="text-[11.5px] text-muted">
                    {gm.units.length} unit{gm.units.length === 1 ? "" : "s"} ·{" "}
                    {gm.units.reduce((s, u) => s + u.agents.length, 0)} agents
                  </div>
                </div>
                <span className="rounded-[6px] bg-white px-[9px] py-1 text-[10px] font-bold text-green">GROUP MANAGER</span>
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
                      <div className="flex-1">
                        <div className="text-[12.5px] font-bold text-navy">{unit.unitManager?.full_name ?? "No Unit Manager assigned"}</div>
                        <div className="text-[11px] text-taupe">
                          {unit.name} · {unit.agents.length} agent{unit.agents.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      {unit.unitManager && (
                        <span className="rounded-[6px] bg-info-blue-bg px-2 py-[3px] text-[9.5px] font-bold text-[#45566b]">
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
                            <span className="rounded-[5px] bg-warn-gold-bg px-[7px] py-[2px] text-[9px] font-bold text-warn-gold-text">
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
  onDone,
}: {
  editing: { id: string; fullName: string; role: Role; currentAssignedUnderId: string | null };
  assignmentOptions: { unitManagers: UnitManagerOption[]; units: UnitOption[] };
  onDone: () => void;
}) {
  const router = useRouter();
  const [newRole, setNewRole] = useState<Role>(editing.role);
  const [assignedUnderId, setAssignedUnderId] = useState(editing.currentAssignedUnderId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needsAssignment = newRole === "unit_manager" || newRole === "agent";
  const assignmentChoices = newRole === "agent" ? assignmentOptions.unitManagers : assignmentOptions.units;

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateUserAssignment({
          userId: editing.id,
          role: newRole,
          assignedUnderId: needsAssignment ? assignedUnderId || null : null,
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
            {(["group_manager", "unit_manager", "agent"] as Role[]).map((r) => (
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
        {needsAssignment && (
          <Field label={newRole === "agent" ? "Assigned under (Unit Manager)" : "Assigned under (Unit)"}>
            <select
              value={assignedUnderId}
              onChange={(e) => setAssignedUnderId(e.target.value)}
              className="h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
            >
              <option value="">Choose…</option>
              {newRole === "agent"
                ? assignmentOptions.unitManagers.map((um) => (
                    <option key={um.id} value={um.id}>
                      {um.full_name} — {um.unitName}
                    </option>
                  ))
                : assignmentOptions.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
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
          disabled={pending || (needsAssignment && !assignedUnderId)}
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
  const [success, setSuccess] = useState<{ email: string; tempPassword: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const availableRoles: Role[] = role === "superadmin" ? ["group_manager", "unit_manager", "agent", "superadmin"] : ["unit_manager", "agent"];
  const needsAssignment = newRole === "unit_manager" || newRole === "agent";
  const assignmentChoices = newRole === "agent" ? assignmentOptions.unitManagers : assignmentOptions.units;

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
          assignedUnderId: needsAssignment ? assignedUnderId || null : null,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setSuccess({ email: result.email!, tempPassword: result.tempPassword! });
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
        <div className="mt-1 text-xs font-medium text-muted">
          Share this temporary password with {success.email} — they should change it after signing in.
        </div>
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
        {needsAssignment && (
          <Field label={newRole === "agent" ? "Assigned under (Unit Manager)" : "Assigned under (Unit)"}>
            <select
              value={assignedUnderId}
              onChange={(e) => setAssignedUnderId(e.target.value)}
              className="h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
            >
              <option value="">Choose…</option>
              {newRole === "agent"
                ? assignmentOptions.unitManagers.map((um) => (
                    <option key={um.id} value={um.id}>
                      {um.full_name} — {um.unitName}
                    </option>
                  ))
                : assignmentOptions.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
            </select>
            {assignmentChoices.length === 0 && (
              <div className="mt-1.5 text-[11px] font-medium text-alert-red">
                {newRole === "agent" ? "No Unit Managers available to assign under yet." : "No units available yet."}
              </div>
            )}
          </Field>
        )}

        {error && <div className="text-[12px] font-medium text-alert-red">{error}</div>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !fullName || !email || (needsAssignment && !assignedUnderId)}
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
