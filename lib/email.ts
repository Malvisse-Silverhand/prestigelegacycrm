import "server-only";
import { Resend } from "resend";

// Transactional email (invites, password resets) goes through Resend.
//
// RESEND_FROM must use a domain verified at resend.com/domains. Until one is
// verified, Resend's shared `onboarding@resend.dev` sender only delivers to
// the account owner's own address and 403s for anyone else -- so keeping the
// sender in an env var means switching to a real domain is a config change,
// not a code change.
const FROM = process.env.RESEND_FROM ?? "Prestige Legacy <onboarding@resend.dev>";

export type SendResult = { sent: boolean; error: string | null };

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, error: "Email is not configured (RESEND_API_KEY missing)." };

  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: Boolean(data?.id), error: null };
  } catch (e) {
    // Never let a mail failure take down the action that triggered it -- the
    // account/reset it belongs to has already been created either way.
    return { sent: false, error: e instanceof Error ? e.message : "Couldn't send the email." };
  }
}

function layout(heading: string, bodyHtml: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fdf9f3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f2540">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td style="background:#0f2540;border-radius:16px 16px 0 0;padding:22px 26px">
      <div style="font-size:17px;font-weight:700;color:#ffffff">Prestige Legacy</div>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid #efe7da;border-top:0;border-radius:0 0 16px 16px;padding:26px">
      <h1 style="margin:0 0 14px;font-size:19px;line-height:1.3;color:#0f2540">${heading}</h1>
      ${bodyHtml}
      <p style="margin:26px 0 0;font-size:11.5px;color:#8b8271">
        Prestige Legacy CRM · agent portal. If you weren't expecting this email you can ignore it.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:22px 0">
    <a href="${href}" style="display:inline-block;background:#0f2540;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:13px 22px;border-radius:12px">${label}</a>
  </p>
  <p style="margin:0;font-size:11.5px;color:#8b8271;word-break:break-all">Or paste this into your browser:<br>${href}</p>`;
}

export function inviteEmail(input: {
  fullName: string;
  roleLabel: string;
  actionLink: string | null;
  tempPassword: string;
  loginUrl: string;
}) {
  const greeting = `<p style="margin:0 0 14px;font-size:14px;line-height:1.6">Hi ${input.fullName}, an account has been created for you on Prestige Legacy CRM as <strong>${input.roleLabel}</strong>.</p>`;

  // Preferred path: a link that lets them set their own password. The
  // temporary password is included only as a fallback for when the link
  // couldn't be generated, so a working credential always reaches them.
  const body = input.actionLink
    ? greeting + button(input.actionLink, "Set your password") +
      `<p style="margin:22px 0 0;font-size:12.5px;color:#5c5648">This link expires in 1 hour. If it does, use <a href="${input.loginUrl}" style="color:#0f4c35">the login page</a> and choose &ldquo;Forgot password&rdquo;.</p>`
    : greeting +
      `<p style="margin:0 0 8px;font-size:14px">Sign in with this temporary password and change it when prompted:</p>
       <p style="margin:0 0 6px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:17px;font-weight:700;letter-spacing:.5px;background:#fdf9f3;border:1px solid #e7ded0;border-radius:10px;padding:12px 14px">${input.tempPassword}</p>` +
      button(input.loginUrl, "Go to login");

  return { subject: "Your Prestige Legacy CRM account", html: layout("Welcome aboard", body) };
}

export function resetPasswordEmail(input: { actionLink: string }) {
  const body =
    `<p style="margin:0 0 14px;font-size:14px;line-height:1.6">We received a request to reset your Prestige Legacy CRM password. Choose a new one using the button below.</p>` +
    button(input.actionLink, "Set a new password") +
    `<p style="margin:22px 0 0;font-size:12.5px;color:#5c5648">This link expires in 1 hour and can only be used once. If you didn't ask for this, no action is needed.</p>`;

  return { subject: "Reset your Prestige Legacy CRM password", html: layout("Password reset", body) };
}
