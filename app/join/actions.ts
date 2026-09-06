"use server";

import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkInviteToken } from "@/lib/join-invite";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// Submitted by someone with no account and no session, so the token in the URL
// is the only authorisation -- it is re-validated here rather than trusted
// from the page that rendered the form.
//
// No auth user is created: the request sits pending until a manager approves
// it (see approveRegistration), which is exactly what "review their access"
// means and keeps strangers out of auth.users.
export async function submitRegistration(input: {
  token: string;
  fullName: string;
  email: string;
  phone: string;
  note: string;
}) {
  // No account and no session exist yet at this point, so the only thing
  // slowing down a script pointed at a leaked link is this: a handful of
  // submissions per source per hour, well above anything a real applicant
  // would ever hit (the form is filled in once).
  const allowed = await checkRateLimit("join-submit-ip", await clientIp(), 8, 60 * 60);
  if (!allowed) return { error: "Too many attempts from this connection. Please try again later." };

  const invite = await checkInviteToken(input.token);
  if (!invite.ok) return { error: "This link is no longer accepting registrations." };

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();

  if (fullName.length < 2) return { error: "Enter your full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Enter a valid email address." };
  if (!/^\d{9,11}$/.test(phone.replace(/\D/g, ""))) return { error: "Enter a valid phone number." };

  const admin = createAdminClient();
  const { error } = await admin.from("agent_registrations").insert({
    invite_id: invite.inviteId,
    full_name: fullName,
    email,
    phone,
    note: input.note.trim().slice(0, 500) || null,
  });

  if (error) {
    // The partial unique index on (invite_id, lower(email)) where status =
    // 'pending' means a repeat submission lands here. That isn't a failure
    // from the applicant's point of view -- their details are already queued.
    if (error.code === "23505") return { error: null, duplicate: true };
    Sentry.captureException(error, { tags: { action: "submitRegistration" } });
    return { error: "Couldn't send your details. Please try again." };
  }

  return { error: null, duplicate: false };
}
