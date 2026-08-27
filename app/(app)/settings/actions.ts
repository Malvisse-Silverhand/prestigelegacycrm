"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { Role } from "@/lib/profile-types";

function canManageSettings(role: Role) {
  return role === "superadmin" || role === "group_manager";
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function generateTempPassword() {
  // 16 chars from a URL-safe alphabet -- easy to read aloud/copy, no ambiguous
  // punctuation, well above Supabase's minimum length.
  return randomBytes(12).toString("base64").replace(/[+/=]/g, "").slice(0, 16);
}

type InviteInput = {
  fullName: string;
  email: string;
  role: Role;
  assignedUnderId: string | null; // unit_manager id (role=agent) or unit id (role=unit_manager)
};

export async function inviteUser(input: InviteInput) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageSettings(profile.role)) return { error: "You don't have permission to do that." };

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (fullName.length < 2) return { error: "Enter the new user's full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Enter a valid email address." };

  // Group managers can only create unit managers/agents inside units they
  // manage -- everything else (creating group managers, superadmins, or
  // reaching outside their own units) is superadmin-only.
  const allowedRoles: Role[] =
    profile.role === "superadmin" ? ["superadmin", "group_manager", "unit_manager", "agent"] : ["unit_manager", "agent"];
  if (!allowedRoles.includes(input.role)) return { error: "You can't create a user with that role." };

  const supabase = await createClient();
  let unitId: string | null = null;
  let parentId: string = profile.id;

  if (input.role === "agent") {
    if (!input.assignedUnderId) return { error: "Choose which Unit Manager this agent reports to." };
    const { data: unitManager } = await supabase
      .from("profiles")
      .select("id, unit_id, role")
      .eq("id", input.assignedUnderId)
      .eq("role", "unit_manager")
      .maybeSingle();
    if (!unitManager || !unitManager.unit_id) return { error: "That Unit Manager could not be found." };
    if (profile.role === "group_manager") {
      const { data: unit } = await supabase
        .from("units")
        .select("id")
        .eq("id", unitManager.unit_id)
        .eq("group_manager_id", profile.id)
        .maybeSingle();
      if (!unit) return { error: "That Unit Manager isn't in one of your units." };
    }
    unitId = unitManager.unit_id;
    parentId = unitManager.id;
  } else if (input.role === "unit_manager") {
    if (!input.assignedUnderId) return { error: "Choose which unit this manager will run." };
    let unitQuery = supabase.from("units").select("id, group_manager_id").eq("id", input.assignedUnderId);
    if (profile.role === "group_manager") unitQuery = unitQuery.eq("group_manager_id", profile.id);
    const { data: unit } = await unitQuery.maybeSingle();
    if (!unit) return { error: "That unit could not be found." };
    unitId = unit.id;
    parentId = unit.group_manager_id ?? profile.id;
  }
  // group_manager / superadmin roles: no unit, parent is the creating superadmin.

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError || !created?.user) {
    return { error: createError?.message?.includes("already been registered")
      ? "A user with that email already exists."
      : "Couldn't create the account. Please try again." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    email,
    role: input.role,
    unit_id: unitId,
    parent_id: parentId,
    is_active: true,
    avatar_initials: initialsFrom(fullName),
  });
  if (profileError) {
    // Roll back the orphaned auth user rather than leaving a login with no profile.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Couldn't set up this user's profile. Please try again." };
  }

  await admin.from("audit_log").insert({
    actor_id: profile.id,
    target_id: created.user.id,
    action: "user_invited",
    metadata: { role: input.role, unit_id: unitId },
  });

  revalidatePath("/settings");
  return { error: null, email, tempPassword };
}

export async function saveTargets(monthDate: string, rows: { agentId: string; ancTarget: number | null; nocTarget: number | null }[]) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageSettings(profile.role)) return { error: "You don't have permission to do that." };

  const supabase = await createClient();
  for (const row of rows) {
    const { data: existing } = await supabase
      .from("targets")
      .select("id")
      .eq("agent_id", row.agentId)
      .eq("month", monthDate)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("targets")
        .update({ anc_target: row.ancTarget, noc_target: row.nocTarget })
        .eq("id", existing.id);
      if (error) return { error: "Couldn't save targets. Please try again." };
    } else {
      const { error } = await supabase.from("targets").insert({
        agent_id: row.agentId,
        month: monthDate,
        anc_target: row.ancTarget,
        noc_target: row.nocTarget,
      });
      if (error) return { error: "Couldn't save targets. Please try again." };
    }
  }

  revalidatePath("/settings");
  return { error: null };
}

export async function saveDistributionSettings(input: {
  id: string | null;
  roundRobinEnabled: boolean;
  staleAfterDays: number;
  reassignRequiresApproval: boolean;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageSettings(profile.role)) return { error: "You don't have permission to do that." };

  const supabase = await createClient();
  const payload = {
    round_robin_enabled: input.roundRobinEnabled,
    stale_after_days: input.staleAfterDays,
    reassign_requires_approval: input.reassignRequiresApproval,
  };

  const { error } = input.id
    ? await supabase.from("distribution_settings").update(payload).eq("id", input.id)
    : await supabase.from("distribution_settings").insert({ ...payload, unit_id: null });

  if (error) return { error: "Couldn't save these settings. Please try again." };

  revalidatePath("/settings");
  return { error: null };
}
