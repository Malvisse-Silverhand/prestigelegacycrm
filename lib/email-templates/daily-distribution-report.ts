import "server-only";
import { emailLayout, emailButton, escapeHtml, oneLineText, EMAIL_COLORS } from "@/lib/email";
import type { RunAgentLine, RunTrigger } from "@/lib/daily-distribution-shared";

// The upline report for one daily lead distribution run: who got how many leads,
// and how long the pool will last. Sent to the person who owns the schedule, the
// Group Manager above a Unit Manager, and the super admins.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-11-04" -> "4 Nov"
function shortDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return m >= 1 && m <= 12 && d ? `${d} ${MONTHS[m - 1]}` : date;
}

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Super admin",
  group_manager: "Group manager",
  unit_manager: "Unit manager",
};

export function dailyDistributionReportEmail(input: {
  distributorName: string;
  distributorRole: string;
  date: string;
  trigger: RunTrigger;
  status: "done" | "skipped" | "failed";
  requested: number;
  distributed: number;
  perAgent: RunAgentLine[];
  poolRemaining: number;
  daysLeft: number | null;
  note: string | null;
  origin: string;
}) {
  const { distributed, requested, poolRemaining, status } = input;
  const who = escapeHtml(input.distributorName);
  const role = ROLE_LABEL[input.distributorRole] ?? "Manager";
  const when = shortDate(input.date);

  const subject =
    status === "done"
      ? `Daily leads distributed — ${distributed} lead${distributed === 1 ? "" : "s"} by ${oneLineText(input.distributorName, 40)} (${when})`
      : status === "skipped"
        ? `Daily lead distribution skipped — ${oneLineText(input.distributorName, 40)} (${when})`
        : `Daily lead distribution failed — ${oneLineText(input.distributorName, 40)} (${when})`;

  const intro =
    status === "done"
      ? `${distributed} of ${requested} planned leads were handed out for <strong>${who}</strong> (${role}) on ${when}${input.trigger === "manual" ? " (run by hand)" : ""}.`
      : `The ${input.trigger === "manual" ? "manual" : "scheduled"} lead distribution for <strong>${who}</strong> (${role}) on ${when} ${status === "skipped" ? "did not hand out any leads" : "did not complete"}.`;

  const lines = [...input.perAgent].sort((a, b) => b.count - a.count);
  const total = lines.reduce((s, l) => s + l.count, 0);
  const cell = `padding:8px 10px;border-top:1px solid ${EMAIL_COLORS.line};font-size:13px`;
  const rows = lines
    .map(
      (l) =>
        `<tr><td style="${cell}">${escapeHtml(l.name)}</td><td style="${cell};text-align:right">${l.count}</td><td style="${cell};text-align:right">${total > 0 ? Math.round((l.count / total) * 100) : 0}%</td></tr>`,
    )
    .join("");
  const th = `padding:8px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${EMAIL_COLORS.faint};text-align:left`;
  const table =
    lines.length > 0
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid ${EMAIL_COLORS.line};border-radius:10px;border-collapse:separate">
        <tr style="background:${EMAIL_COLORS.cream}"><th style="${th}">Agent</th><th style="${th};text-align:right">Leads</th><th style="${th};text-align:right">Share %</th></tr>
        ${rows}
      </table>`
      : "";

  const pool =
    input.daysLeft === null
      ? `Pool remaining: <strong>${poolRemaining}</strong>`
      : `Pool remaining: <strong>${poolRemaining}</strong> (about ${input.daysLeft} day${input.daysLeft === 1 ? "" : "s"} at this rate)`;

  let explain = "";
  if (status === "skipped") {
    explain = `<p style="margin:0 0 14px;font-size:13.5px;line-height:1.6;color:${EMAIL_COLORS.muted}">Why: ${escapeHtml(input.note ?? "nothing to hand out today")}. Nothing was changed; the next scheduled day will try again.</p>`;
  } else if (status === "failed") {
    explain = `<p style="margin:0 0 14px;font-size:13.5px;line-height:1.6;color:${EMAIL_COLORS.brand}">Something went wrong${input.note ? `: ${escapeHtml(input.note)}` : ""}. Leads already created stay with their agents. The error has been logged.</p>`;
  } else if (input.note) {
    explain = `<p style="margin:0 0 14px;font-size:12.5px;line-height:1.6;color:${EMAIL_COLORS.muted}">${escapeHtml(input.note)}</p>`;
  }

  const body = `<p style="margin:0 0 6px;font-size:14px;line-height:1.6">${intro}</p>
    ${explain}
    ${table}
    <p style="margin:0;font-size:14px;line-height:1.6">${pool}</p>
    ${emailButton(`${input.origin}/settings`, "Open Daily Distribution settings")}`;

  const heading = status === "done" ? "Daily leads distributed" : status === "skipped" ? "Distribution skipped" : "Distribution failed";
  return { subject, html: emailLayout(heading, body, { width: 600 }) };
}
