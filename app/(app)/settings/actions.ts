"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { appOrigin } from "@/lib/app-url";
import { getTargetableMembers } from "./data";
import { ROLE_RANK, ROLE_LABEL, type Role } from "@/lib/profile-types";
import { sendEmail, inviteEmail, resetPasswordEmail } from "@/lib/email";
import { isWebhookEvent } from "@/lib/webhook-events";

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
  assignedUnderId: string | null; // the supervisor's profile id -- a Group Manager for role=unit_manager
};

// Loose on purpose: agents type numbers with spaces/dashes ("012-345 6789"),
// and this only needs to be strict enough to build a wa.me link later
// (waLink() strips non-digits itself). 9-11 digits covers Malaysian mobiles
// with or without a leading 0.
function isPlausiblePhone(v: string) {
  return /^\d{9,11}$/.test(v.replace(/\D/g, ""));
}

type CallerProfile = { id: string; role: Role; unit_id: string | null };

// Who the assignment is being resolved *for*. A Unit Manager's unit is named
// after them, and an existing one is moved rather than replaced.
type AssignmentTarget = { fullName: string; currentUnitId: string | null };

// Shared by invite (new user) and edit (existing user): resolves the
// "assigned under" selection into an actual unit_id/parent_id pair, scoped so
// a group manager can only ever reach inside units they manage.
async function resolveAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caller: CallerProfile,
  role: Role,
  assignedUnderId: string | null,
  target: AssignmentTarget,
): Promise<
  | { unitId: string | null; parentId: string; createdUnitId: string | null; error: null }
  | { unitId: null; parentId: null; createdUnitId: null; error: string }
> {
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
        createdUnitId: null,
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
      return { unitId: null, parentId: null, createdUnitId: null, error: "That supervisor could not be found." };
    }
    // Reporting straight to a Group Manager means no unit -- the group
    // manager RLS policies cover direct reports via my_downline().
    if (supervisor.role === "group_manager") {
      if (caller.role === "group_manager" && supervisor.id !== caller.id) {
        return { unitId: null, parentId: null, createdUnitId: null, error: "You can only assign people under yourself." };
      }
      if (caller.role === "unit_manager") {
        return { unitId: null, parentId: null, createdUnitId: null, error: "You can't assign someone under a Group Manager." };
      }
      return { unitId: null, parentId: supervisor.id, createdUnitId: null, error: null };
    }
    if (!supervisor.unit_id) {
      // An Aspirant UM who themselves reports straight to a Group Manager (no
      // unit) can still run agents -- everyone else at this point genuinely
      // needs a unit.
      if (supervisor.role !== "aspirant_unit_manager") {
        return { unitId: null, parentId: null, createdUnitId: null, error: "That supervisor has no unit yet." };
      }
      if (caller.role === "group_manager" && supervisor.parent_id !== caller.id) {
        return { unitId: null, parentId: null, createdUnitId: null, error: "That supervisor isn't in your downline." };
      }
      if (caller.role === "unit_manager") {
        return { unitId: null, parentId: null, createdUnitId: null, error: "That supervisor isn't in your unit." };
      }
      return { unitId: null, parentId: supervisor.id, createdUnitId: null, error: null };
    }
    if (caller.role === "group_manager") {
      const { data: unit } = await supabase
        .from("units")
        .select("id")
        .eq("id", supervisor.unit_id)
        .eq("group_manager_id", caller.id)
        .maybeSingle();
      if (!unit) return { unitId: null, parentId: null, createdUnitId: null, error: "That supervisor isn't in one of your units." };
    }
    // A unit manager can only ever place people inside their own unit.
    if (caller.role === "unit_manager" && supervisor.unit_id !== caller.unit_id) {
      return { unitId: null, parentId: null, createdUnitId: null, error: "That supervisor isn't in your unit." };
    }
    return { unitId: supervisor.unit_id, parentId: supervisor.id, createdUnitId: null, error: null };
  }
  // A Unit Manager is assigned under a Group Manager -- never under a unit.
  // The unit they run is just the container for their own team, and it is
  // owned by that Group Manager; that ownership is what places them in the
  // right branch of the org tree.
  if (role === "unit_manager") {
    if (!assignedUnderId) {
      return { unitId: null, parentId: null, createdUnitId: null, error: "Choose which Group Manager this Unit Manager reports to." };
    }
    const { data: gm } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", assignedUnderId)
      .eq("role", "group_manager")
      .maybeSingle();
    if (!gm) return { unitId: null, parentId: null, createdUnitId: null, error: "That Group Manager could not be found." };
    if (caller.role === "group_manager" && gm.id !== caller.id) {
      return { unitId: null, parentId: null, createdUnitId: null, error: "You can only assign people under yourself." };
    }

    // units has no insert/update RLS policy (select only), so this goes through
    // the service role -- after the permission checks above have passed.
    const admin = createAdminClient();
    if (target.currentUnitId) {
      // Already runs a unit: move that unit to the chosen Group Manager rather
      // than stranding their agents in a unit under the previous one.
      const { error: moveError } = await admin
        .from("units")
        .update({ group_manager_id: gm.id })
        .eq("id", target.currentUnitId);
      if (moveError) {
        Sentry.captureException(moveError, { tags: { action: "resolveAssignment", step: "move-unit" } });
        return { unitId: null, parentId: null, createdUnitId: null, error: "Couldn't move this Unit Manager's unit. Please try again." };
      }
      return { unitId: target.currentUnitId, parentId: gm.id, createdUnitId: null, error: null };
    }
    const { data: createdUnit, error: unitError } = await admin
      .from("units")
      .insert({ name: `${target.fullName} Unit`, group_manager_id: gm.id })
      .select("id")
      .maybeSingle();
    if (unitError || !createdUnit) {
      Sentry.captureException(unitError ?? new Error("unit insert returned no row"), {
        tags: { action: "resolveAssignment", step: "create-unit" },
      });
      return { unitId: null, parentId: null, createdUnitId: null, error: "Couldn't set up a unit for this Unit Manager. Please try again." };
    }
    return { unitId: createdUnit.id, parentId: gm.id, createdUnitId: createdUnit.id, error: null };
  }
  // group_manager / superadmin roles: no unit, parent is the acting superadmin.
  return { unitId: null, parentId: caller.id, createdUnitId: null, error: null };
}

// Creates the auth account + profile and sends the "set your password" email.
// Shared by the Add User form and by approving a join request, so a recruit
// who came in through a shared link is provisioned exactly like an invited
// one. Never throws: every failure path is rolled back and reported as text.
async function provisionAccount(input: {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  unitId: string | null;
  // Nullable because `string` isn't a narrowable discriminant: resolveAssignment
  // always fills this in on its success branch, but TS can't prove it (an empty
  // string is falsy), and profiles.parent_id accepts null regardless.
  parentId: string | null;
  actorId: string;
  auditAction: string;
}) {
  const admin = createAdminClient();
  const tempPassword = generateTempPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (createError || !created?.user) {
    return {
      userId: null,
      tempPassword: null,
      emailSent: false,
      error: createError?.message?.includes("already been registered")
        ? "A user with that email already exists."
        : "Couldn't create the account. Please try again.",
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    role: input.role,
    unit_id: input.unitId,
    parent_id: input.parentId,
    is_active: true,
    avatar_initials: initialsFrom(input.fullName),
    must_change_password: true,
  });
  if (profileError) {
    Sentry.captureException(profileError, {
      tags: { action: input.auditAction, step: "insert-profile" },
      extra: { role: input.role, unitId: input.unitId, parentId: input.parentId },
    });
    // Roll back the orphaned auth user rather than leaving a login with no profile.
    await admin.auth.admin.deleteUser(created.user.id);
    return { userId: null, tempPassword: null, emailSent: false, error: "Couldn't set up this user's profile. Please try again." };
  }

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: input.actorId,
    target_id: created.user.id,
    action: input.auditAction,
    metadata: { role: input.role, unit_id: input.unitId },
  });
  if (auditError) console.error(`${input.auditAction}: audit_log insert failed`, auditError);

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
    email: input.email,
    options: { redirectTo: `${origin}/reset-password` },
  });
  if (linkError) console.error(`${input.auditAction}: generateLink failed`, linkError);
  else actionLink = linkData?.properties?.action_link ?? null;

  const { subject, html } = inviteEmail({
    fullName: input.fullName,
    roleLabel: ROLE_LABEL[input.role],
    actionLink,
    tempPassword,
    loginUrl: `${origin}/login`,
  });
  const { sent: emailSent, error: emailError } = await sendEmail({ to: input.email, subject, html });
  if (emailError) console.error(`${input.auditAction}: invite email failed`, emailError);

  return { userId: created.user.id, tempPassword, emailSent, emailError, error: null };
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
  const assignment = await resolveAssignment(supabase, profile, input.role, input.assignedUnderId, {
    fullName,
    currentUnitId: null,
  });
  if (assignment.error) return { error: assignment.error };
  const { unitId, parentId, createdUnitId } = assignment;

  const result = await provisionAccount({
    fullName,
    email,
    phone,
    role: input.role,
    unitId,
    parentId,
    actorId: profile.id,
    auditAction: "user_invited",
  });
  if (result.error) {
    // Appointing a Unit Manager creates their unit up front. If the invite then
    // fails, drop it again -- an empty unit would otherwise sit in the org tree
    // forever as "No Unit Manager assigned".
    if (createdUnitId) await createAdminClient().from("units").delete().eq("id", createdUnitId);
    return { error: result.error };
  }

  revalidatePath("/settings");
  return {
    error: null,
    email,
    phone,
    tempPassword: result.tempPassword,
    emailSent: result.emailSent,
    emailError: result.emailError,
  };
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
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, email, unit_id")
    .eq("id", input.userId)
    .maybeSingle();
  if (!target) return { error: "That user could not be found." };
  // A superadmin has full reach over every other account, peers included.
  // Everyone else can only touch people who rank strictly below them, so a
  // unit manager can't reshuffle their own group manager.
  if (profile.role !== "superadmin" && ROLE_RANK[target.role as Role] <= ROLE_RANK[profile.role]) {
    return { error: "You can only edit users below your own level." };
  }

  const assignment = await resolveAssignment(supabase, profile, input.role, input.assignedUnderId, {
    fullName,
    // Only reuse the unit when they already run one -- an agent being promoted
    // sits in someone else's unit, which must not be hijacked.
    currentUnitId: target.role === "unit_manager" ? target.unit_id : null,
  });
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
  if (error || !updated) {
    Sentry.captureException(error ?? new Error("profile update matched no row"), {
      tags: { action: "updateUserAssignment", step: "update-profile" },
      extra: { userId: input.userId, role: input.role, unitId, parentId },
    });
    return { error: "Couldn't update this user. Please try again." };
  }

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

// Shared by both password actions below: same permission rule and the same
// "below your own rank, or superadmin" reach updateUserAssignment already
// uses, so nobody can act on an account they couldn't otherwise touch.
async function loadEditablePasswordTarget(userId: string) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageSettings(profile.role)) {
    return { profile: null, target: null, error: "You don't have permission to do that." };
  }
  if (userId === profile.id) {
    return { profile: null, target: null, error: "You can't reset your own password here — use your account settings instead." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return { profile: null, target: null, error: "That user could not be found." };
  if (profile.role !== "superadmin" && ROLE_RANK[target.role as Role] <= ROLE_RANK[profile.role]) {
    return { profile: null, target: null, error: "You can only reset the password of users below your own level." };
  }

  return { profile, target, error: null };
}

// Emails the same recovery link the public "Forgot password" page sends
// itself -- one template (resetPasswordEmail), one link-minting call
// (generateLink), so this can never drift from what that flow produces.
// Unlike the public endpoint, this one is allowed to say plainly whether it
// worked: the caller is already authenticated and already knows who the
// target is, so there's no address-enumeration risk to hide behind a
// same-response-either-way shape.
export async function sendPasswordResetLink(userId: string) {
  const { profile, target, error } = await loadEditablePasswordTarget(userId);
  if (error || !profile || !target) return { error };

  const admin = createAdminClient();
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: target.email,
    options: { redirectTo: `${await appOrigin()}/reset-password` },
  });
  const actionLink = linkData?.properties?.action_link;
  if (linkError || !actionLink) {
    Sentry.captureException(linkError ?? new Error("generateLink returned no action_link"), {
      tags: { action: "sendPasswordResetLink" },
      extra: { userId },
    });
    return { error: "Couldn't generate a reset link. Please try again." };
  }

  const { subject, html } = resetPasswordEmail({ actionLink });
  const { sent, error: mailError } = await sendEmail({ to: target.email, subject, html });
  if (!sent) {
    console.error("sendPasswordResetLink: send failed", mailError);
    return { error: "Couldn't send the reset email just now. Please try again in a moment." };
  }

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: profile.id,
    target_id: userId,
    action: "password_reset_link_sent",
    metadata: { email: target.email },
  });
  if (auditError) console.error("sendPasswordResetLink: audit_log insert failed", auditError);

  return { error: null };
}

// Sets a fresh random password immediately, for when the target can't be
// reached by email right now (or the admin is on the phone with them and
// wants a credential to read out this second) -- the reset-link email above
// stays the normal path. Reuses the exact same generate-a-temp-password +
// must_change_password shape new accounts already get via inviteUser, so a
// manually reset account is handed back to its owner the same way a brand
// new one is: one login on a password nobody re-uses, then their own choice.
export async function resetUserPasswordNow(userId: string) {
  const { profile, target, error } = await loadEditablePasswordTarget(userId);
  if (error || !profile || !target) return { error, tempPassword: null };

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();
  const { error: authError } = await admin.auth.admin.updateUserById(userId, { password: tempPassword });
  if (authError) {
    Sentry.captureException(authError, { tags: { action: "resetUserPasswordNow" }, extra: { userId } });
    return { error: "Couldn't set a new password. Please try again.", tempPassword: null };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", userId);
  if (profileError) console.error("resetUserPasswordNow: profile update failed", profileError);

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: profile.id,
    target_id: userId,
    action: "password_reset_manual",
    metadata: { email: target.email },
  });
  if (auditError) console.error("resetUserPasswordNow: audit_log insert failed", auditError);

  return { error: null, tempPassword };
}

export async function saveTargets(
  monthDate: string,
  rows: { agentId: string; ancTarget: number | null; nocTarget: number | null; approachTarget: number | null }[],
) {
  const profile = await getCurrentProfile();
  // Every role can set targets for themselves and their downline, so this
  // checks target scope rather than canManageSettings -- see
  // getTargetableMembers, which mirrors the can_set_target_for() policy.
  if (!profile) return { error: "You don't have permission to do that." };
  const allowed = new Set((await getTargetableMembers(profile)).map((a) => a.id));
  if (allowed.size === 0) return { error: "You don't have permission to do that." };
  // The form only renders allowed members, but this is a Server Action -- it
  // can be called with any profile id, so re-check server-side.
  if (rows.some((r) => !allowed.has(r.agentId))) {
    return { error: "You can only set targets for yourself and your own team." };
  }

  if (rows.length === 0) {
    revalidatePath("/settings");
    return { error: null };
  }

  // One statement for every row rather than a per-row check-then-update-or-
  // insert loop (which was up to 2 sequential network round trips per team
  // member): targets_agent_id_month_key makes "one row per agent per month"
  // a real constraint upsert can target, instead of the app checking for an
  // existing row itself.
  const supabase = await createClient();
  const { error } = await supabase.from("targets").upsert(
    rows.map((row) => ({
      agent_id: row.agentId,
      month: monthDate,
      anc_target: row.ancTarget,
      noc_target: row.nocTarget,
      approach_target: row.approachTarget,
    })),
    { onConflict: "agent_id,month" },
  );
  if (error) return { error: "Couldn't save targets. Please try again." };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { error: null };
}

// The campaign goal behind the dashboard's headline card. Always the
// caller's own -- a manager setting someone else's monthly numbers is
// normal, but "my road to RM130k" is a personal commitment, so there is no
// agentId parameter to spoof.
export async function saveCampaign(input: {
  name: string;
  targetAnc: number;
  startDate: string;
  deadline: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const name = input.name.trim();
  if (!name) return { error: "Give this goal a name." };
  if (!Number.isFinite(input.targetAnc) || input.targetAnc <= 0) {
    return { error: "Set a target amount above zero." };
  }
  if (input.deadline < input.startDate) {
    return { error: "The deadline can't be before the start date." };
  }

  const supabase = await createClient();
  // One running campaign per agent is a partial unique index, so replacing
  // the old one has to happen before the new row goes in rather than relying
  // on an upsert: the two rows differ by id, not by the indexed column.
  await supabase
    .from("anc_campaigns")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("agent_id", profile.id)
    .eq("is_active", true);

  const { error } = await supabase.from("anc_campaigns").insert({
    agent_id: profile.id,
    name,
    target_anc: input.targetAnc,
    start_date: input.startDate,
    deadline: input.deadline,
  });
  if (error) return { error: "Couldn't save this goal. Please try again." };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { error: null };
}

// Retires the running campaign without putting a new one in its place. The
// row stays (is_active = false) so past pushes remain on record.
export async function clearCampaign() {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("anc_campaigns")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("agent_id", profile.id)
    .eq("is_active", true);
  if (error) return { error: "Couldn't clear this goal. Please try again." };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
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

  // None of these FKs cascade or set-null on their own (only profiles.id ->
  // auth.users does), so any of them still pointing at this user blocks the
  // delete at the database level -- surfaced by Supabase as an opaque
  // "Database error deleting user" with no indication of which table.
  await admin.from("profiles").update({ parent_id: null }).eq("parent_id", userId);
  await admin.from("audit_log").update({ target_id: null }).eq("target_id", userId);
  await admin.from("audit_log").update({ actor_id: null }).eq("actor_id", userId);
  await admin.from("units").update({ group_manager_id: null }).eq("group_manager_id", userId);
  await admin.from("lead_activity").update({ actor_id: null }).eq("actor_id", userId);
  await admin.from("quotations").update({ agent_id: null }).eq("agent_id", userId);
  await admin.from("wa_templates").update({ created_by: null }).eq("created_by", userId);
  await admin.from("webhooks").update({ created_by: null }).eq("created_by", userId);
  // Target quotas have no meaning once the agent they were set for is gone.
  await admin.from("targets").delete().eq("agent_id", userId);

  // Deleting the auth user cascades to the profile row (profiles.id
  // references auth.users on delete cascade).
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    Sentry.captureException(error, { tags: { action: "deleteUser" }, extra: { userId } });
    return { error: "Couldn't delete this user. Please try again." };
  }

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: profile.id,
    action: "user_deleted",
    metadata: { deleted_name: target.full_name, role: target.role },
  });
  if (auditError) console.error("deleteUser: audit_log insert failed", auditError);

  revalidatePath("/settings");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Webhooks (Settings > Webhooks)
// ---------------------------------------------------------------------------

// Same audience as Lead Distribution: these are org-wide integration settings,
// not per-unit ones. RLS enforces it too -- this is the friendly error.
function canManageWebhooks(role: Role) {
  return role === "superadmin" || role === "group_manager";
}

// Rejects anything that isn't an ordinary https endpoint. http is allowed only
// for localhost so a webhook can be tried against a local listener during
// setup; everything else must be TLS, since lead details go over it.
function validateWebhookUrl(raw: string): { url: string; error: null } | { url: null; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { url: null, error: "Enter the webhook URL." };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { url: null, error: "That doesn't look like a valid URL." };
  }
  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLocal)) {
    return { url: null, error: "Use an https:// URL — lead details are sent over it." };
  }
  return { url: parsed.toString(), error: null };
}

export async function saveWebhook(input: {
  id: string | null;
  name: string;
  url: string;
  event: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageWebhooks(profile.role)) {
    return { error: "You don't have permission to do that." };
  }

  const name = input.name.trim();
  if (!name) return { error: "Give this webhook a name." };
  if (!isWebhookEvent(input.event)) return { error: "Pick which event should fire it." };

  const checked = validateWebhookUrl(input.url);
  if (checked.error) return { error: checked.error };

  const supabase = await createClient();
  const payload = { name, url: checked.url, event: input.event };

  const { data, error } = input.id
    ? await supabase.from("webhooks").update(payload).eq("id", input.id).select("id").maybeSingle()
    : await supabase
        .from("webhooks")
        .insert({ ...payload, created_by: profile.id })
        .select("id")
        .maybeSingle();

  if (error || !data) {
    Sentry.captureException(error ?? new Error("webhook save matched no row"), {
      tags: { action: "saveWebhook" },
    });
    return { error: "Couldn't save this webhook. Please try again." };
  }

  revalidatePath("/settings");
  return { error: null };
}

export async function setWebhookEnabled(id: string, isEnabled: boolean) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageWebhooks(profile.role)) {
    return { error: "You don't have permission to do that." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("webhooks")
    .update({ is_enabled: isEnabled })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't update this webhook." };
  revalidatePath("/settings");
  return { error: null };
}

export async function deleteWebhook(id: string) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageWebhooks(profile.role)) {
    return { error: "You don't have permission to do that." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("webhooks").delete().eq("id", id);
  if (error) return { error: "Couldn't delete this webhook." };

  revalidatePath("/settings");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Shareable recruitment links (Settings > Join Requests)
// ---------------------------------------------------------------------------

// URL-safe, 32 chars of base64url from 24 random bytes (~144 bits). Long
// enough that the link is the credential -- guessing one is not feasible.
function generateInviteToken() {
  return randomBytes(24).toString("base64url");
}

const INVITE_LINK_TTL_DAYS = 30;

export async function createInviteLink(input: { label: string; assignedUnderId: string }) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageSettings(profile.role)) {
    return { error: "You don't have permission to do that.", token: null };
  }

  const supabase = await createClient();
  // Links only ever recruit agents, so the assignment resolves through the
  // same path as the Add User form -- no unit is ever created here.
  const assignment = await resolveAssignment(supabase, profile, "agent", input.assignedUnderId, {
    fullName: "",
    currentUnitId: null,
  });
  if (assignment.error) return { error: assignment.error, token: null };

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_LINK_TTL_DAYS * 86400_000).toISOString();
  const { error } = await supabase.from("agent_invite_links").insert({
    token,
    label: input.label.trim() || null,
    created_by: profile.id,
    assigned_under_id: input.assignedUnderId,
    unit_id: assignment.unitId,
    expires_at: expiresAt,
  });

  if (error) {
    Sentry.captureException(error, { tags: { action: "createInviteLink" } });
    return { error: "Couldn't create this link. Please try again.", token: null };
  }

  revalidatePath("/settings");
  return { error: null, token };
}

export async function setInviteLinkActive(id: string, isActive: boolean) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageSettings(profile.role)) return { error: "You don't have permission to do that." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_invite_links")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't update this link." };
  revalidatePath("/settings");
  return { error: null };
}

export async function deleteInviteLink(id: string) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageSettings(profile.role)) return { error: "You don't have permission to do that." };

  const supabase = await createClient();
  const { error } = await supabase.from("agent_invite_links").delete().eq("id", id);
  if (error) return { error: "Couldn't delete this link." };

  revalidatePath("/settings");
  return { error: null };
}

// Approving is where the account finally comes into existence -- everything
// before this point is just a form submission from a stranger.
export async function approveRegistration(id: string) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageSettings(profile.role)) {
    return { error: "You don't have permission to do that.", tempPassword: null, emailSent: false };
  }

  const supabase = await createClient();
  // RLS scopes this read to requests the caller may review, so a manager can't
  // approve someone recruited into a part of the org they can't see.
  const { data: row } = await supabase
    .from("agent_registrations")
    .select("id, full_name, email, phone, status, agent_invite_links!inner(assigned_under_id, unit_id)")
    .eq("id", id)
    .maybeSingle();

  if (!row) return { error: "That request could not be found.", tempPassword: null, emailSent: false };
  if (row.status !== "pending") {
    return { error: "That request has already been reviewed.", tempPassword: null, emailSent: false };
  }

  const link = row.agent_invite_links as unknown as { assigned_under_id: string; unit_id: string | null };
  const result = await provisionAccount({
    fullName: row.full_name as string,
    email: row.email as string,
    phone: row.phone as string,
    role: "agent",
    unitId: link.unit_id,
    parentId: link.assigned_under_id,
    actorId: profile.id,
    auditAction: "registration_approved",
  });
  // The request stays pending on failure, so it can be retried once the cause
  // (usually "that email already has an account") is dealt with.
  if (result.error) return { error: result.error, tempPassword: null, emailSent: false };

  const { error: markError } = await supabase
    .from("agent_registrations")
    .update({
      status: "approved",
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      created_profile_id: result.userId,
    })
    .eq("id", id);
  // The account exists and the email is sent; a failure to stamp the row would
  // only make the request look pending, so report it rather than undoing it.
  if (markError) Sentry.captureException(markError, { tags: { action: "approveRegistration", step: "mark" } });

  revalidatePath("/settings");
  return { error: null, tempPassword: result.tempPassword, emailSent: result.emailSent };
}

export async function denyRegistration(id: string, reason: string) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageSettings(profile.role)) return { error: "You don't have permission to do that." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_registrations")
    .update({
      status: "denied",
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      review_note: reason.trim() || null,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't update this request." };
  revalidatePath("/settings");
  return { error: null };
}

// ===== Tracking code on the public landing pages =====
//
// SuperAdmin only, and checked here as well as in RLS. What gets saved is
// executed in the browser of every visitor to every landing page, so this is
// the narrowest gate in the app that still leaves the feature usable -- the
// same trust level as pasting a tag into Google Tag Manager.
//
// The snippets are stored verbatim. Sanitising them would defeat the point (a
// pixel IS a <script> tag), so the control is who may write them, not what
// they may write.
const TRACKING_MAX_CHARS = 20000;

export async function saveTrackingCode(input: {
  head: string;
  body: string;
  footer: string;
  enabled: boolean;
}) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") {
    return { error: "Only a SuperAdmin can change the site tracking code." };
  }

  const head = input.head.trim();
  const body = input.body.trim();
  const footer = input.footer.trim();
  if (head.length > TRACKING_MAX_CHARS || body.length > TRACKING_MAX_CHARS || footer.length > TRACKING_MAX_CHARS) {
    return { error: `Each snippet must be under ${TRACKING_MAX_CHARS.toLocaleString()} characters.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({
      tracking_head: head,
      tracking_body: body,
      tracking_footer: footer,
      tracking_enabled: input.enabled,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("id", true);

  if (error) {
    Sentry.captureException(error);
    return { error: "Couldn't save the tracking code. Please try again." };
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: profile.id,
    action: "tracking_code_updated",
    metadata: {
      enabled: input.enabled,
      head_chars: head.length,
      body_chars: body.length,
      footer_chars: footer.length,
    },
  });
  if (auditError) console.error("saveTrackingCode: audit_log insert failed", auditError);

  revalidatePath("/settings");
  // The landing pages read this on render, so they have to be re-rendered.
  revalidatePath("/p", "layout");
  return { error: null };
}

// Fetches each published landing page over real HTTP and reports what came
// back. The point is to answer "is the pixel actually on the page", which you
// cannot tell by looking at the settings form -- a snippet can save fine and
// still never reach a visitor.
export async function testLandingPages() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") {
    return { error: "Only a SuperAdmin can run this test.", results: [] };
  }

  const supabase = await createClient();
  const [{ data: pages }, { data: settings }] = await Promise.all([
    supabase
      .from("landing_pages")
      .select("name, slug")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("site_settings")
      .select("tracking_head, tracking_body, tracking_footer, tracking_enabled")
      .eq("id", true)
      .maybeSingle(),
  ]);

  if (!pages || pages.length === 0) {
    return { error: "No published landing pages to test yet.", results: [] };
  }

  const origin = await appOrigin();
  const enabled = (settings?.tracking_enabled as boolean) ?? true;
  // Match on a distinctive line from each snippet rather than the whole thing:
  // the HTML that comes back is the rendered page, and an exact full-text
  // match would be defeated by any whitespace handling along the way.
  const marker = (snippet: string | null) => {
    if (!enabled) return null;
    const line = (snippet ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 12)
      .sort((a, b) => b.length - a.length)[0];
    return line ?? null;
  };
  const headMark = marker(settings?.tracking_head as string | null);
  const bodyMark = marker(settings?.tracking_body as string | null);
  const footMark = marker(settings?.tracking_footer as string | null);

  const results = await Promise.all(
    pages.map(async (p) => {
      const url = `${origin}/p/${p.slug}`;
      const started = Date.now();
      try {
        const res = await fetch(url, { cache: "no-store", redirect: "follow" });
        const html = await res.text();
        return {
          slug: p.slug as string,
          name: p.name as string,
          url,
          ok: res.ok,
          status: res.status,
          ms: Date.now() - started,
          bytes: html.length,
          // A slot with nothing in it counts as present -- there is nothing to
          // find, and reporting it as missing would be a false alarm.
          headFound: headMark === null || html.includes(headMark),
          bodyFound: bodyMark === null || html.includes(bodyMark),
          footerFound: footMark === null || html.includes(footMark),
          error: null as string | null,
        };
      } catch (err) {
        return {
          slug: p.slug as string,
          name: p.name as string,
          url,
          ok: false,
          status: null,
          ms: Date.now() - started,
          bytes: 0,
          headFound: false,
          bodyFound: false,
          footerFound: false,
          error: err instanceof Error ? err.message : "Request failed",
        };
      }
    }),
  );

  return { error: null, results };
}

// The benefit catalogue behind the Submit Case form. Same audience as
// Webhooks: org-wide configuration, edited by the roles that own it. Every
// agent reads it (RLS allows that), but only these two change what is on offer.
function canManageBenefits(role: Role) {
  return role === "superadmin" || role === "group_manager";
}

export async function saveBenefit(input: {
  id: string | null;
  name: string;
  defaultSumCovered: number | null;
  description: string;
  sortOrder: number;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageBenefits(profile.role)) {
    return { error: "You don't have permission to do that." };
  }

  const name = input.name.trim();
  if (!name) return { error: "Give this benefit a name." };
  if (input.defaultSumCovered != null && input.defaultSumCovered < 0) {
    return { error: "A sum covered can't be negative." };
  }

  const supabase = await createClient();
  const payload = {
    name,
    default_sum_covered: input.defaultSumCovered,
    description: input.description.trim() || null,
    sort_order: input.sortOrder,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = input.id
    ? await supabase.from("benefit_catalogue").update(payload).eq("id", input.id).select("id").maybeSingle()
    : await supabase
        .from("benefit_catalogue")
        .insert({ ...payload, created_by: profile.id })
        .select("id")
        .maybeSingle();

  if (error || !data) {
    // A duplicate name is the one failure worth naming: the unique index is
    // there on purpose, and "try again" would be a lie.
    if (error?.code === "23505") return { error: "A benefit with that name already exists." };
    Sentry.captureException(error ?? new Error("benefit save matched no row"), {
      tags: { action: "saveBenefit" },
    });
    return { error: "Couldn't save this benefit. Please try again." };
  }

  revalidatePath("/settings");
  revalidatePath("/my-sales/submit-case");
  return { error: null };
}

/**
 * Retires a benefit, or brings it back.
 *
 * Deliberately not a delete: cases already filed store the benefit's name, and
 * a name that disappears from the catalogue leaves those rows looking like
 * typos. Turning it off takes it out of the dropdown and leaves history alone.
 */
export async function setBenefitActive(id: string, isActive: boolean) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageBenefits(profile.role)) {
    return { error: "You don't have permission to do that." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("benefit_catalogue")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't update this benefit." };

  revalidatePath("/settings");
  revalidatePath("/my-sales/submit-case");
  return { error: null };
}

export async function deleteBenefit(id: string) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageBenefits(profile.role)) {
    return { error: "You don't have permission to do that." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("benefit_catalogue")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't delete this benefit." };

  revalidatePath("/settings");
  revalidatePath("/my-sales/submit-case");
  return { error: null };
}

/**
 * Moves one benefit up or down the list.
 *
 * Renumbers the whole catalogue rather than swapping two sort_order values,
 * because the values in the table are not guaranteed to be unique or gapless
 * -- they were typed by hand before this existed, and a swap between two rows
 * that already share a number would do nothing at all. Rewriting the sequence
 * makes the order say exactly what the list shows, and the catalogue is small
 * enough that the extra writes cost nothing.
 */
export async function reorderBenefit(id: string, direction: "up" | "down") {
  const profile = await getCurrentProfile();
  if (!profile || !canManageBenefits(profile.role)) {
    return { error: "You don't have permission to do that." };
  }

  const supabase = await createClient();
  const { data: rows, error: readError } = await supabase
    .from("benefit_catalogue")
    .select("id, sort_order, name")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (readError || !rows) return { error: "Couldn't read the benefit list." };

  const from = rows.findIndex((r) => r.id === id);
  if (from === -1) return { error: "That benefit no longer exists." };

  const to = direction === "up" ? from - 1 : from + 1;
  // Already at the end it is being pushed towards: nothing to do, and not an
  // error worth showing anyone.
  if (to < 0 || to >= rows.length) return { error: null };

  const moved = rows.slice();
  [moved[from], moved[to]] = [moved[to], moved[from]];

  // Only the rows whose position actually changed get written.
  const updates = moved
    .map((row, index) => ({ row, index }))
    .filter(({ row, index }) => row.sort_order !== index);

  for (const { row, index } of updates) {
    const { error } = await supabase
      .from("benefit_catalogue")
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) {
      Sentry.captureException(error, { tags: { action: "reorderBenefit" } });
      return { error: "Couldn't reorder the benefits. Please try again." };
    }
  }

  revalidatePath("/settings");
  revalidatePath("/my-sales/submit-case");
  return { error: null };
}
