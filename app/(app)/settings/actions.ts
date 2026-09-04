"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getTargetableAgents } from "./data";
import { ROLE_RANK, ROLE_LABEL, type Role } from "@/lib/profile-types";
import { sendEmail, inviteEmail } from "@/lib/email";

// Unit Managers can now invite into their own unit too ("Superadmin, Group
// Manager & Unit Manager boleh assign agent under mereka"). An Aspirant Unit
// Manager runs agents but does not create accounts.
function canManageSettings(role: Role) {
  return role === "superadmin" || role === "group_manager" || role === "unit_manager";
}

// You may only create someone strictly below your own rank -- "ikut priority
// siapa lebih tinggi". Superadmin is the exception, able to mint peers.
function creatableRoles(role: Role): Role[] {
  const below = (Object.keys(ROLE_RANK) as Role[]).filter((r) => ROLE_RANK[r] > ROLE_RANK[role]);
  return role === "superadmin" ? ["superadmin", ...below] : below;
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

// Absolute origin for links inside auth emails. Derived from the incoming
// request rather than hard-coded so local, preview, and production each send
// links back to themselves.
async function appOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function generateTempPassword() {
  // 16 chars from a URL-safe alphabet -- easy to read aloud/copy, no ambiguous
  // punctuation, well above Supabase's minimum length.
  return randomBytes(12).toString("base64").replace(/[+/=]/g, "").slice(0, 16);
}

type InviteInput = {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  assignedUnderId: string | null; // unit_manager id (role=agent) or unit id (role=unit_manager)
};

// Loose on purpose: agents type numbers with spaces/dashes ("012-345 6789"),
// and this only needs to be strict enough to build a wa.me link later
// (waLink() strips non-digits itself). 9-11 digits covers Malaysian mobiles
// with or without a leading 0.
function isPlausiblePhone(v: string) {
  return /^\d{9,11}$/.test(v.replace(/\D/g, ""));
}

type CallerProfile = { id: string; role: Role; unit_id: string | null };

// When the org has exactly one Group Manager, new Unit Managers roll up to
// them without anyone having to pick. Returns null once there is more than
// one, since then it genuinely is a choice.
async function soleGroupManagerId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("profiles").select("id").eq("role", "group_manager").limit(2);
  return data && data.length === 1 ? data[0].id : null;
}

// Shared by invite (new user) and edit (existing user): resolves the
// "assigned under" selection into an actual unit_id/parent_id pair, scoped so
// a group manager can only ever reach inside units they manage.
async function resolveAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caller: CallerProfile,
  role: Role,
  assignedUnderId: string | null,
): Promise<{ unitId: string | null; parentId: string; error: null } | { unitId: null; parentId: null; error: string }> {
  // An agent may report to a Unit Manager or an Aspirant Unit Manager; an
  // Aspirant Unit Manager only to a Unit Manager.
  if (role === "agent" || role === "aspirant_unit_manager") {
    // A Group Manager can hold people directly, not just via a unit.
    const allowedSupervisorRoles: Role[] =
      role === "agent"
        ? ["group_manager", "unit_manager", "aspirant_unit_manager"]
        : ["group_manager", "unit_manager"];
    if (!assignedUnderId) {
      return {
        unitId: null,
        parentId: null,
        error:
          role === "agent"
            ? "Choose who this agent reports to."
            : "Choose who this Aspirant Unit Manager reports to.",
      };
    }
    const { data: supervisor } = await supabase
      .from("profiles")
      .select("id, unit_id, role, parent_id")
      .eq("id", assignedUnderId)
      .in("role", allowedSupervisorRoles)
      .maybeSingle();
    if (!supervisor) {
      return { unitId: null, parentId: null, error: "That supervisor could not be found." };
    }
    // Reporting straight to a Group Manager means no unit -- the group
    // manager RLS policies cover direct reports via my_downline().
    if (supervisor.role === "group_manager") {
      if (caller.role === "group_manager" && supervisor.id !== caller.id) {
        return { unitId: null, parentId: null, error: "You can only assign people under yourself." };
      }
      if (caller.role === "unit_manager") {
        return { unitId: null, parentId: null, error: "You can't assign someone under a Group Manager." };
      }
      return { unitId: null, parentId: supervisor.id, error: null };
    }
    if (!supervisor.unit_id) {
      // An Aspirant UM who themselves reports straight to a Group Manager (no
      // unit) can still run agents -- everyone else at this point genuinely
      // needs a unit.
      if (supervisor.role !== "aspirant_unit_manager") {
        return { unitId: null, parentId: null, error: "That supervisor has no unit yet." };
      }
      if (caller.role === "group_manager" && supervisor.parent_id !== caller.id) {
        return { unitId: null, parentId: null, error: "That supervisor isn't in your downline." };
      }
      if (caller.role === "unit_manager") {
        return { unitId: null, parentId: null, error: "That supervisor isn't in your unit." };
      }
      return { unitId: null, parentId: supervisor.id, error: null };
    }
    if (caller.role === "group_manager") {
      const { data: unit } = await supabase
        .from("units")
        .select("id")
        .eq("id", supervisor.unit_id)
        .eq("group_manager_id", caller.id)
        .maybeSingle();
      if (!unit) return { unitId: null, parentId: null, error: "That supervisor isn't in one of your units." };
    }
    // A unit manager can only ever place people inside their own unit.
    if (caller.role === "unit_manager" && supervisor.unit_id !== caller.unit_id) {
      return { unitId: null, parentId: null, error: "That supervisor isn't in your unit." };
    }
    return { unitId: supervisor.unit_id, parentId: supervisor.id, error: null };
  }
  if (role === "unit_manager") {
    if (!assignedUnderId) return { unitId: null, parentId: null, error: "Choose which unit this manager will run." };
    let unitQuery = supabase.from("units").select("id, group_manager_id").eq("id", assignedUnderId);
    if (caller.role === "group_manager") unitQuery = unitQuery.eq("group_manager_id", caller.id);
    const { data: unit } = await unitQuery.maybeSingle();
    if (!unit) return { unitId: null, parentId: null, error: "That unit could not be found." };
    // Every Unit Manager should roll up to a Group Manager. Normally that's
    // whoever owns the unit; when the unit has none (superadmin-created), fall
    // back to the sole Group Manager if there is exactly one, so unit managers
    // land under them automatically instead of hanging off the superadmin.
    let parentId = unit.group_manager_id;
    if (!parentId) parentId = await soleGroupManagerId(supabase);
    return { unitId: unit.id, parentId: parentId ?? caller.id, error: null };
  }
  // group_manager / superadmin roles: no unit, parent is the acting superadmin.
  return { unitId: null, parentId: caller.id, error: null };
}

export async function inviteUser(input: InviteInput) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageSettings(profile.role)) return { error: "You don't have permission to do that." };

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  if (fullName.length < 2) return { error: "Enter the new user's full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Enter a valid email address." };
  if (!isPlausiblePhone(phone)) return { error: "Enter a valid phone number." };

  // Rank-based: you can only create someone below you. resolveAssignment then
  // additionally pins where they land (a group manager inside their own units,
  // a unit manager inside their own unit).
  const allowedRoles = creatableRoles(profile.role);
  if (!allowedRoles.includes(input.role)) return { error: "You can't create a user with that role." };

  const supabase = await createClient();
  const assignment = await resolveAssignment(supabase, profile, input.role, input.assignedUnderId);
  if (assignment.error) return { error: assignment.error };
  const { unitId, parentId } = assignment;

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
    phone,
    role: input.role,
    unit_id: unitId,
    parent_id: parentId,
    is_active: true,
    avatar_initials: initialsFrom(fullName),
    must_change_password: true,
  });
  if (profileError) {
    // Roll back the orphaned auth user rather than leaving a login with no profile.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Couldn't set up this user's profile. Please try again." };
  }

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: profile.id,
    target_id: created.user.id,
    action: "user_invited",
    metadata: { role: input.role, unit_id: unitId },
  });
  if (auditError) console.error("inviteUser: audit_log insert failed", auditError);

  // Invite email goes out through Resend. Supabase's own mailer can't be used
  // for this: it renders its own template and never sees the password we
  // generated, so it could only ever send a bare link. Generating the recovery
  // link ourselves lets the email carry a real "set your password" button and
  // keeps the temp password as a fallback in the same message.
  //
  // A mail failure must not fail the invite -- the account already exists and
  // works, and the temp password is shown on screen regardless.
  const origin = await appOrigin();
  let actionLink: string | null = null;
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${origin}/reset-password` },
  });
  if (linkError) console.error("inviteUser: generateLink failed", linkError);
  else actionLink = linkData?.properties?.action_link ?? null;

  const { subject, html } = inviteEmail({
    fullName,
    roleLabel: ROLE_LABEL[input.role],
    actionLink,
    tempPassword,
    loginUrl: `${origin}/login`,
  });
  const { sent: emailSent, error: emailError } = await sendEmail({ to: email, subject, html });
  if (emailError) console.error("inviteUser: invite email failed", emailError);

  revalidatePath("/settings");
  return { error: null, email, phone, tempPassword, emailSent, emailError };
}

export async function updateUserAssignment(input: {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  assignedUnderId: string | null;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageSettings(profile.role)) return { error: "You don't have permission to do that." };
  if (input.userId === profile.id) return { error: "You can't edit your own account here." };
  if (!creatableRoles(profile.role).includes(input.role)) {
    return { error: "You can't move a user into that role." };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  if (fullName.length < 2) return { error: "Enter a full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Enter a valid email address." };
  if (!isPlausiblePhone(phone)) return { error: "Enter a valid phone number." };

  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("id, role, email").eq("id", input.userId).maybeSingle();
  if (!target) return { error: "That user could not be found." };
  // A superadmin has full reach over every other account, peers included.
  // Everyone else can only touch people who rank strictly below them, so a
  // unit manager can't reshuffle their own group manager.
  if (profile.role !== "superadmin" && ROLE_RANK[target.role as Role] <= ROLE_RANK[profile.role]) {
    return { error: "You can only edit users below your own level." };
  }

  const assignment = await resolveAssignment(supabase, profile, input.role, input.assignedUnderId);
  if (assignment.error) return { error: assignment.error };
  const { unitId, parentId } = assignment;

  const admin = createAdminClient();

  // The login email lives on auth.users, not profiles -- profiles.email is a
  // denormalised copy for display/search. Both have to change together or the
  // person ends up unable to sign in with the address shown on screen.
  if (email !== target.email) {
    const { error: authError } = await admin.auth.admin.updateUserById(input.userId, { email });
    if (authError) {
      return {
        error: authError.message.toLowerCase().includes("already been registered")
          ? "A user with that email already exists."
          : "Couldn't update this user's login email. Please try again.",
      };
    }
  }

  const { data: updated, error } = await admin
    .from("profiles")
    .update({ full_name: fullName, email, phone, role: input.role, unit_id: unitId, parent_id: parentId })
    .eq("id", input.userId)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { error: "Couldn't update this user. Please try again." };

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: profile.id,
    target_id: input.userId,
    action: "user_reassigned",
    metadata: { role: input.role, unit_id: unitId },
  });
  if (auditError) console.error("updateUserAssignment: audit_log insert failed", auditError);

  revalidatePath("/settings");
  return { error: null };
}

export async function saveTargets(monthDate: string, rows: { agentId: string; ancTarget: number | null; nocTarget: number | null }[]) {
  const profile = await getCurrentProfile();
  // Aspirant Unit Managers run agents without Settings access generally, but
  // they do own their agents' targets -- so this checks target scope rather
  // than canManageSettings.
  if (!profile) return { error: "You don't have permission to do that." };
  const allowed = new Set((await getTargetableAgents(profile)).map((a) => a.id));
  if (allowed.size === 0) return { error: "You don't have permission to do that." };
  // The form only renders allowed agents, but this is a Server Action -- it
  // can be called with any agent id, so re-check server-side.
  if (rows.some((r) => !allowed.has(r.agentId))) {
    return { error: "You can only set targets for agents assigned to you." };
  }

  const supabase = await createClient();
  for (const row of rows) {
    const { data: existing } = await supabase
      .from("targets")
      .select("id")
      .eq("agent_id", row.agentId)
      .eq("month", monthDate)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("targets")
        .update({ anc_target: row.ancTarget, noc_target: row.nocTarget })
        .eq("id", existing.id)
        .select("id")
        .maybeSingle();
      if (error || !data) return { error: "Couldn't save targets. Please try again." };
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

  const { data, error } = input.id
    ? await supabase.from("distribution_settings").update(payload).eq("id", input.id).select("id").maybeSingle()
    : await supabase.from("distribution_settings").insert({ ...payload, unit_id: null }).select("id").maybeSingle();

  if (error || !data) return { error: "Couldn't save these settings. Please try again." };

  revalidatePath("/settings");
  return { error: null };
}

export async function deleteUser(userId: string) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageSettings(profile.role)) return { error: "You don't have permission to do that." };
  if (userId === profile.id) return { error: "You can't delete your own account." };

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return { error: "That user could not be found." };
  // Superadmins can remove anyone but themselves; everyone else only people
  // ranking strictly below them.
  if (profile.role !== "superadmin" && ROLE_RANK[target.role as Role] <= ROLE_RANK[profile.role]) {
    return { error: "You can only delete users below your own level." };
  }

  const admin = createAdminClient();

  // profiles.parent_id and several tables reference this row, so detach the
  // references that would otherwise block the delete rather than cascading
  // and silently taking real work (leads, quotations) with it.
  const { count: leadCount } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", userId);
  if (leadCount && leadCount > 0) {
    return {
      error: `${target.full_name} still owns ${leadCount} lead${leadCount === 1 ? "" : "s"}. Reassign them first, then delete.`,
    };
  }

  await admin.from("profiles").update({ parent_id: null }).eq("parent_id", userId);
  await admin.from("audit_log").update({ target_id: null }).eq("target_id", userId);
  await admin.from("units").update({ group_manager_id: null }).eq("group_manager_id", userId);

  // Deleting the auth user cascades to the profile row (profiles.id
  // references auth.users on delete cascade).
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: "Couldn't delete this user. Please try again." };

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: profile.id,
    action: "user_deleted",
    metadata: { deleted_name: target.full_name, role: target.role },
  });
  if (auditError) console.error("deleteUser: audit_log insert failed", auditError);

  revalidatePath("/settings");
  return { error: null };
}
