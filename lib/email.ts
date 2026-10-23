import "server-only";
import { Resend } from "resend";

// Transactional email (invites, password resets) goes through Resend.
//
// RESEND_FROM must use a domain verified at resend.com/domains. Until one is
// verified, Resend's shared `onboarding@resend.dev` sender only delivers to
// the account owner's own address and 403s for anyone else -- so keeping the
// sender in an env var means switching to a real domain is a config change,
// not a code change.
const FROM_NAME = "Prestige Legacy";

// The display name is fixed here, whatever RESEND_FROM holds: the env var
// supplies the address (which has to be on a verified domain), and the name
// recipients see is always the brand, never a person's or a longer label.
// Accepts either `Name <a@b.com>` or a bare `a@b.com`.
function senderAddress() {
  const raw = process.env.RESEND_FROM?.trim() ?? "";
  const inBrackets = raw.match(/<([^<>\s]+@[^<>\s]+)>/);
  const bare = /^[^\s<>@]+@[^\s<>@]+$/.test(raw) ? raw : null;
  return inBrackets?.[1] ?? bare ?? "onboarding@resend.dev";
}
const FROM = `${FROM_NAME} <${senderAddress()}>`;

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
<html><body style="margin:0;padding:24px;background:#fdf9f3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b2b2b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td style="background:#d12822;border-radius:16px 16px 0 0;padding:22px 26px">
      <div style="font-size:17px;font-weight:700;color:#ffffff">Prestige Legacy</div>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid #efe7da;border-top:0;border-radius:0 0 16px 16px;padding:26px">
      <h1 style="margin:0 0 14px;font-size:19px;line-height:1.3;color:#d12822">${heading}</h1>
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
    <a href="${href}" style="display:inline-block;background:#d12822;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:13px 22px;border-radius:12px">${label}</a>
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
      `<p style="margin:22px 0 0;font-size:12.5px;color:#5c5648">This link expires in 1 hour. If it does, use <a href="${input.loginUrl}" style="color:#d12822">the login page</a> and choose &ldquo;Forgot password&rdquo;.</p>`
    : greeting +
      `<p style="margin:0 0 8px;font-size:14px">Sign in with this temporary password and change it when prompted:</p>
       <p style="margin:0 0 6px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:17px;font-weight:700;letter-spacing:.5px;background:#fdf9f3;border:1px solid #e7ded0;border-radius:10px;padding:12px 14px">${input.tempPassword}</p>` +
      button(input.loginUrl, "Go to login");

  return { subject: "Your Prestige Legacy CRM account", html: layout("Welcome aboard", body) };
}

// Lead names reach this from public landing-page forms, so anything a visitor
// typed is escaped before it goes into HTML, and flattened to one line before
// it goes into a subject.
function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function oneLine(value: string, max = 80) {
  const flat = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export type AssignedLeadSummary = { id: string; name: string; interest: string | null; source: string | null };
export type AssignmentReason = "landing_page" | "manager" | "rebalance";

const MAX_LISTED = 10;

export function leadsAssignedEmail(input: {
  agentName: string;
  reason: AssignmentReason;
  // Who did it -- shown for manager / rebalance, meaningless for a landing page.
  byName: string | null;
  leads: AssignedLeadSummary[];
  // How many were assigned in total, which can exceed what is listed.
  total: number;
  origin: string;
}) {
  const { leads, total, origin } = input;
  const first = leads[0];
  const single = total === 1 && first;
  const by = input.byName ? esc(oneLine(input.byName, 60)) : "A manager";

  const intro =
    input.reason === "landing_page"
      ? "A new lead just came in through your landing page."
      : input.reason === "manager"
        ? `${by} assigned ${single ? "a lead" : `${total} leads`} to you.`
        : `${by} rebalanced the team's leads &mdash; ${total} ${total === 1 ? "lead is" : "leads are"} now yours.`;

  const rows = leads
    .slice(0, MAX_LISTED)
    .map((l) => {
      const detail = [l.interest, l.source].filter(Boolean).map((v) => esc(oneLine(v as string, 40))).join(" &middot; ");
      return `<tr><td style="padding:10px 0;border-top:1px solid #efe7da">
        <a href="${origin}/leads/${encodeURIComponent(l.id)}" style="color:#d12822;font-weight:600;font-size:14px;text-decoration:none">${esc(oneLine(l.name, 80))}</a>
        ${detail ? `<div style="font-size:12.5px;color:#5c5648;margin-top:2px">${detail}</div>` : ""}
      </td></tr>`;
    })
    .join("");
  const more =
    total > leads.slice(0, MAX_LISTED).length
      ? `<p style="margin:6px 0 0;font-size:12.5px;color:#5c5648">&hellip;and ${total - Math.min(leads.length, MAX_LISTED)} more.</p>`
      : "";

  const body =
    `<p style="margin:0 0 14px;font-size:14px;line-height:1.6">Hi ${esc(oneLine(input.agentName, 60))}, ${intro}</p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px">${rows}</table>` +
    more +
    button(single ? `${origin}/leads/${encodeURIComponent(first.id)}` : `${origin}/leads`, single ? "Open the lead" : "Open my leads") +
    `<p style="margin:18px 0 0;font-size:12.5px;color:#5c5648">Reaching out quickly is the best thing you can do for a new lead.</p>`;

  const subject = single
    ? `New lead: ${oneLine(first.name, 60)}`
    : `${total} new leads assigned to you`;

  return { subject, html: layout(single ? "New lead for you" : "New leads for you", body) };
}

export function resetPasswordEmail(input: { actionLink: string }) {
  const body =
    `<p style="margin:0 0 14px;font-size:14px;line-height:1.6">We received a request to reset your Prestige Legacy CRM password. Choose a new one using the button below.</p>` +
    button(input.actionLink, "Set a new password") +
    `<p style="margin:22px 0 0;font-size:12.5px;color:#5c5648">This link expires in 1 hour and can only be used once. If you didn't ask for this, no action is needed.</p>`;

  return { subject: "Reset your Prestige Legacy CRM password", html: layout("Password reset", body) };
}
