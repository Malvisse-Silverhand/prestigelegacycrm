import { EMAIL_COLORS, emailButton, emailLayout, escapeHtml, oneLineText } from "@/lib/email";
import type { ReportAgentRow, WeeklyReport } from "@/lib/weekly-report";

// The weekly report email. Inline styles and tables only, so Gmail (which
// strips <style> blocks in some clients and never loads external CSS) renders
// it the same everywhere.

const MAX_AGENT_ROWS = 30;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayLabel(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

function rangeLabel(start: string, end: string): string {
  return start === end ? dayLabel(start) : `${dayLabel(start)} – ${dayLabel(end)}`;
}

const num = (n: number) => Math.round(n).toLocaleString("en-US");
const rm = (n: number) => `RM ${Math.round(n).toLocaleString("en-US")}`;

const C = EMAIL_COLORS;
const TH = `padding:7px 6px;font-size:11px;font-weight:700;color:${C.faint};text-align:right;border-bottom:1px solid ${C.line};white-space:nowrap`;
const THL = TH.replace("text-align:right", "text-align:left");
const TD = `padding:7px 6px;font-size:12.5px;color:${C.ink};text-align:right;border-bottom:1px solid ${C.line};white-space:nowrap`;
const TDL = TD.replace("text-align:right", "text-align:left").replace("white-space:nowrap", "white-space:normal");

function tile(label: string, value: string, note?: string): string {
  return `<td width="50%" valign="top" style="padding:5px">
    <div style="background:${C.cream};border:1px solid ${C.line};border-radius:12px;padding:12px 14px">
      <div style="font-size:11.5px;color:${C.faint}">${escapeHtml(label)}</div>
      <div style="font-size:22px;font-weight:700;color:${C.ink};margin-top:2px">${escapeHtml(value)}</div>
      ${note ? `<div style="font-size:11px;color:${C.faint};margin-top:2px">${escapeHtml(note)}</div>` : ""}
    </div>
  </td>`;
}

function heading(text: string): string {
  return `<h2 style="margin:26px 0 8px;font-size:15px;color:${C.brand}">${escapeHtml(text)}</h2>`;
}

function agentTable(rows: ReportAgentRow[]): string {
  const shown = rows.slice(0, MAX_AGENT_ROWS);
  const body = shown
    .map(
      (a) => `<tr>
        <td style="${TDL}">${escapeHtml(a.name)}${a.unitName ? `<div style="font-size:11px;color:${C.faint}">${escapeHtml(a.unitName)}</div>` : ""}</td>
        <td style="${TD}">${num(a.received)}</td>
        <td style="${TD}">${num(a.contacted)}</td>
        <td style="${TD}">${num(a.quotes)}</td>
        <td style="${TD}">${num(a.appointments)}</td>
        <td style="${TD}">${num(a.cases)}</td>
        <td style="${TD}">${rm(a.anc)}</td>
        <td style="${TD}">${num(a.stale)}</td>
      </tr>`,
    )
    .join("");
  const more =
    rows.length > shown.length
      ? `<p style="margin:6px 0 0;font-size:12px;color:${C.faint}">…and ${num(rows.length - shown.length)} more</p>`
      : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    <tr><th style="${THL}">Agent</th><th style="${TH}">Leads</th><th style="${TH}">Contacted</th><th style="${TH}">Quotes</th><th style="${TH}">Appts</th><th style="${TH}">Cases</th><th style="${TH}">ANC</th><th style="${TH}">Stale</th></tr>
    ${body}
  </table>${more}`;
}

export function weeklyReportEmail(
  report: WeeklyReport,
  opts: { recipientName: string; scopeLabel: string; origin: string; preview: boolean },
): { subject: string; html: string } {
  const h = report.headline;
  const range = rangeLabel(report.period.start, report.period.end);
  const subject = `${opts.preview ? "[Preview] " : ""}Weekly report — ${oneLineText(opts.scopeLabel, 60)}, ${range}`;
  const firstName = opts.recipientName.trim().split(/\s+/)[0] || "there";

  const tiles = [
    tile("New leads", num(h.newLeads)),
    tile("Assigned by leaders", num(h.assignedByLeaders)),
    tile("Leads contacted", num(h.contacted), "worked on beyond \"new\""),
    tile("Quotations", num(h.quotations)),
    tile("Appointments booked", num(h.appointments)),
    tile("Cases submitted", num(h.cases)),
    tile("Closed won", num(h.closedWon)),
    tile("ANC", rm(h.anc), "annualised, cases submitted"),
    tile("Stale leads", num(h.staleLeads), `no activity for ${report.staleAfterDays}+ days`),
  ];
  const tileRows: string[] = [];
  for (let i = 0; i < tiles.length; i += 2) {
    tileRows.push(`<tr>${tiles[i]}${tiles[i + 1] ?? `<td width="50%"></td>`}</tr>`);
  }

  const sourceTotal = report.sources.reduce((s, x) => s + x.count, 0) || 1;
  const sources = report.sources.length
    ? `${heading("Lead sources")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${report.sources
        .map(
          (s) => `<tr><td style="${TDL}">${escapeHtml(s.source)}</td><td style="${TD}">${num(s.count)}</td><td style="${TD}">${Math.round((s.count / sourceTotal) * 100)}%</td></tr>`,
        )
        .join("")}</table>`
    : "";

  const d = report.distribution;
  const distribution = d
    ? `${heading("Daily distribution")}<p style="margin:0;font-size:13px;line-height:1.6;color:${C.muted}">${num(d.runsDone)} run${d.runsDone === 1 ? "" : "s"} completed, ${num(d.runsSkipped)} skipped${d.runsFailed ? `, ${num(d.runsFailed)} failed` : ""}. ${num(d.leadsHandedOut)} lead${d.leadsHandedOut === 1 ? "" : "s"} handed out.</p>`
    : "";

  const top = report.topAgents.length
    ? `${heading("Top agents")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${report.topAgents
        .map(
          (a, i) => `<tr><td style="${TDL}">${i + 1}. ${escapeHtml(a.name)}</td><td style="${TD}">${num(a.cases)} case${a.cases === 1 ? "" : "s"}</td><td style="${TD}">${rm(a.anc)}</td></tr>`,
        )
        .join("")}</table>`
    : "";

  const units = report.units.length
    ? `${heading("Units")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <tr><th style="${THL}">Unit</th><th style="${TH}">Agents</th><th style="${TH}">Leads</th><th style="${TH}">Quotes</th><th style="${TH}">Cases</th><th style="${TH}">ANC</th></tr>
      ${report.units
        .map(
          (u) => `<tr><td style="${TDL}">${escapeHtml(u.name)}${u.managerName ? `<div style="font-size:11px;color:${C.faint}">UM ${escapeHtml(u.managerName)}</div>` : ""}</td><td style="${TD}">${num(u.agents)}</td><td style="${TD}">${num(u.newLeads)}</td><td style="${TD}">${num(u.quotes)}</td><td style="${TD}">${num(u.cases)}</td><td style="${TD}">${rm(u.anc)}</td></tr>`,
        )
        .join("")}
    </table>`
    : "";

  const agents = report.agents.length ? `${heading("Agents")}${agentTable(report.agents)}` : "";

  const inactive = report.inactiveAgents.length
    ? `${heading("No activity this week")}<p style="margin:0;font-size:13px;line-height:1.6;color:${C.muted}">${report.inactiveAgents
        .slice(0, MAX_AGENT_ROWS)
        .map((a) => escapeHtml(a.name))
        .join(", ")}${report.inactiveAgents.length > MAX_AGENT_ROWS ? `, …and ${num(report.inactiveAgents.length - MAX_AGENT_ROWS)} more` : ""}</p>`
    : "";

  const intro = opts.preview
    ? `Hi ${escapeHtml(firstName)}, this is a preview of your weekly report for the week so far (${escapeHtml(range)}).`
    : `Hi ${escapeHtml(firstName)}, here is last week's report for ${escapeHtml(opts.scopeLabel)}, ${escapeHtml(range)}.`;

  const body = `
    <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:${C.muted}">${intro}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate">${tileRows.join("")}</table>
    ${top}${sources}${distribution}${units}${agents}${inactive}
    ${emailButton(`${opts.origin}/statistics`, "Open statistics")}`;

  return {
    subject,
    html: emailLayout(opts.preview ? "Weekly report (preview)" : "Weekly report", body, { width: 640 }),
  };
}
