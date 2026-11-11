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

// Lead names, phones and sources can come straight from a public form, so
// anything interpolated into the email body is escaped first.
function esc(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export type AssignedLeadSummary = {
  id: string;
  leadNo: number | null;
  fullName: string;
  phone: string | null;
  interest: string | null;
  source: string | null;
};

const ASSIGNED_EMAIL_MAX_LEADS = 10;

export function leadAssignedEmail(input: {
  agentName: string;
  leads: AssignedLeadSummary[];
  // How it reached them, e.g. "Landing page", "Assigned by Siti", "Rebalance".
  via: string;
  origin: string;
}) {
  const total = input.leads.length;
  const shown = input.leads.slice(0, ASSIGNED_EMAIL_MAX_LEADS);
  const rows = shown
    .map((l) => {
      const meta = [l.phone, l.interest, l.source].filter(Boolean).map((v) => esc(v as string)).join(" · ");
      const label = `${l.leadNo != null ? `#${l.leadNo} ` : ""}${esc(l.fullName)}`;
      return `<tr><td style="padding:10px 0;border-top:1px solid #efe7da">
        <a href="${input.origin}/leads/${l.id}" style="color:#0f2540;font-weight:600;font-size:14px;text-decoration:none">${label}</a>
        ${meta ? `<div style="margin-top:2px;font-size:12.5px;color:#5c5648">${meta}</div>` : ""}
      </td></tr>`;
    })
    .join("");
  const more =
    total > shown.length
      ? `<p style="margin:10px 0 0;font-size:12.5px;color:#5c5648">…and ${total - shown.length} more.</p>`
      : "";

  const single = total === 1;
  const href = single ? `${input.origin}/leads/${shown[0].id}` : `${input.origin}/leads`;
  const body =
    `<p style="margin:0 0 14px;font-size:14px;line-height:1.6">Hi ${esc(input.agentName)}, ${single ? "a new lead has" : `${total} new leads have`} been assigned to you. <span style="color:#8b8271">(${esc(input.via)})</span></p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>${more}` +
    button(href, single ? "Open lead" : "Open leads") +
    `<p style="margin:14px 0 0;font-size:12.5px;color:#5c5648">Reach out soon &mdash; fresh leads convert best when contacted quickly.</p>`;

  return {
    subject: single ? `New lead assigned: ${shown[0].fullName}` : `${total} new leads assigned to you`,
    html: layout(single ? "New lead assigned" : "New leads assigned", body),
  };
}

export function leadFormSubmittedEmail(input: {
  agentName: string;
  leadId: string;
  leadNo: number | null;
  leadName: string;
  // "Additional Details" / "Application & Signature".
  stageLabel: string;
  origin: string;
}) {
  const href = `${input.origin}/leads/${input.leadId}`;
  const who = `${input.leadNo != null ? `#${input.leadNo} ` : ""}${input.leadName}`;
  const body =
    `<p style="margin:0 0 14px;font-size:14px;line-height:1.6">Hi ${esc(input.agentName)}, <strong>${esc(who)}</strong> has submitted their <strong>${esc(input.stageLabel)}</strong> form.</p>` +
    `<p style="margin:0;font-size:13px;line-height:1.6;color:#5c5648">Their answers are now on the lead, and every change is logged in the activity timeline.</p>` +
    button(href, "Open lead");

  return {
    subject: `${input.leadName} has submitted their ${input.stageLabel} form`,
    html: layout("Form submitted", body),
  };
}
