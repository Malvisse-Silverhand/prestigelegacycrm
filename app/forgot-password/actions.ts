"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, resetPasswordEmail } from "@/lib/email";

async function appOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Sends the reset link through Resend rather than Supabase's built-in mailer,
// which is rate limited to a handful of sends per hour and documented as not
// for production. Supabase still mints the link (so the token stays valid and
// single-use) -- we just deliver it ourselves.
//
// The result is deliberately the same whether or not the address has an
// account: this endpoint is unauthenticated, so telling the two apart would
// let anyone test which emails are registered.
export async function requestPasswordReset(email: string) {
  const address = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) {
    return { error: "Enter a valid email address." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: address,
    options: { redirectTo: `${await appOrigin()}/reset-password` },
  });

  const actionLink = data?.properties?.action_link;
  if (error || !actionLink) {
    // Most likely "user not found". Log it, but answer as if it worked.
    console.error("requestPasswordReset: generateLink failed", error?.message);
    return { error: null };
  }

  const { subject, html } = resetPasswordEmail({ actionLink });
  const { error: mailError } = await sendEmail({ to: address, subject, html });
  if (mailError) {
    console.error("requestPasswordReset: send failed", mailError);
    // A delivery failure IS worth surfacing -- unlike "no such user", it means
    // a legitimate request silently went nowhere.
    return { error: "Couldn't send the reset email just now. Please try again in a moment." };
  }

  return { error: null };
}
