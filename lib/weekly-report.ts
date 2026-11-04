import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { weeklyReportEmail } from "@/lib/email-templates/weekly-report";
import { checkRateLimit } from "@/lib/rate-limit";
import { addDays, isoWeekdayOf, mytClock } from "@/lib/daily-distribution-shared";
import { caseAnc, COUNTED_CASE_STATUSES } from "@/lib/case-anc";
import type { PaymentFrequency } from "@/lib/contribution-schedule";
import { WON_STAGES } from "@/lib/pipeline-stages";

// The weekly detailed report: every Monday 09:00 Malaysia time, SuperAdmins get
// the whole organisation and Group Managers their group, for the Monday-Sunday
// that just ended.
//
// There is no session in the job that sends this, so none of the session-client
// helpers (RLS does the scoping there) can be used. Every query below goes
// through the service-role client and is scoped explicitly by the recipient's
// member ids; the metric definitions mirror the Statistics / Dashboard ones.

export type ReportScope = { kind: "org" } | { kind: "group"; gmId: string };
export type ReportPeriod = { start: string; end: string }; // inclusive MYT dates, YYYY-MM-DD

export type ReportAgentRow = {
  id: string;
  name: string;
  role: string;
  unitName: string | null;
  received: number;
  contacted: number;
  quotes: number;
  appointments: number;
  cases: number;
  anc: number;
  stale: number;
};

export type ReportUnitRow = {
  id: string;
  name: string;
  managerName: string | null;
  agents: number;
  newLeads: number;
  quotes: number;
  cases: number;
  anc: number;
};

export type WeeklyReport = {
  period: ReportPeriod;
  staleAfterDays: number;
  headline: {
    newLeads: number;
    assignedByLeaders: number;
    contacted: number;
    quotations: number;
    appointments: number;
    cases: number;
    closedWon: number;
    anc: number;
    staleLeads: number;
  };
  sources: { source: string; count: number }[];
  // null when the daily-distribution tables don't exist yet.
  distribution: { runsDone: number; runsSkipped: number; runsFailed: number; leadsHandedOut: number } | null;
  units: ReportUnitRow[];
  agents: ReportAgentRow[];
  topAgents: ReportAgentRow[];
  inactiveAgents: { id: string; name: string; unitName: string | null }[];
};

const PAGE = 1000;
// Ids per `.in()` filter -- keeps the request URL comfortably short.
const ID_CHUNK = 150;
const SEND_GAP_MS = 600;
const REPORT_HOUR = 9;
// Roles whose zero-activity week is worth flagging (managers are not expected
// to produce leads every week).
const SELLING_ROLES = ["agent", "aspirant_unit_manager"];
const MAX_SOURCES = 8;

// -- Dates --------------------------------------------------------------------

// The Monday-Sunday (Malaysia time) of the week before the current Malaysia week.
export function previousWeek(now: Date = new Date()): { start: string; end: string } {
  const clock = mytClock(now);
  const thisMonday = addDays(clock.date, -(clock.isoWeekday - 1));
  return { start: addDays(thisMonday, -7), end: addDays(thisMonday, -1) };
}

// 00:00 Malaysia time on a date, as a UTC instant (= 16:00 UTC the day before).
function mytMidnightIso(date: string): string {
  return new Date(`${date}T00:00:00+08:00`).toISOString();
}

// -- Query helpers ------------------------------------------------------------

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { code?: string; message: string } | null }>;
type QueryError = { code?: string; message: string };

class ReportQueryError extends Error {
  code: string | undefined;
  constructor(label: string, error: QueryError) {
    super(`weekly report: ${label} query failed: ${error.message}`);
    this.code = error.code;
  }
}

function isMissingSchema(code: string | undefined): boolean {
  // 42P01 undefined_table, 42703 undefined_column, PGRST205/PGRST204 = PostgREST schema cache.
  return code === "42P01" || code === "42703" || code === "PGRST205" || code === "PGRST204";
}

// Pages through one query 1000 rows at a time.
async function fetchAll<T>(label: string, page: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new ReportQueryError(label, error);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

// Same, but split by a list of ids first (or unfiltered when `ids` is null,
// i.e. whole-organisation scope).
async function fetchScoped<T>(
  label: string,
  ids: string[] | null,
  build: (idChunk: string[] | null, from: number, to: number) => PageResult<T>,
): Promise<T[]> {
  if (ids === null) return fetchAll(label, (from, to) => build(null, from, to));
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const chunk = ids.slice(i, i + ID_CHUNK);
    out.push(...(await fetchAll(label, (from, to) => build(chunk, from, to))));
  }
  return out;
}

// -- Scope --------------------------------------------------------------------

type Member = { id: string; fullName: string; role: string; unitId: string | null };
type UnitInfo = { id: string; name: string };

async function loadScope(scope: ReportScope): Promise<{ members: Member[]; units: UnitInfo[] }> {
  const admin = createAdminClient();

  let unitQuery = admin.from("units").select("id, name").order("name");
  if (scope.kind === "group") unitQuery = unitQuery.eq("group_manager_id", scope.gmId);
  const { data: unitData, error: unitError } = await unitQuery.returns<UnitInfo[]>();
  if (unitError) throw new ReportQueryError("units", unitError);
  const units = unitData ?? [];

  let profileQuery = admin
    .from("profiles")
    .select("id, full_name, role, unit_id")
    .eq("is_active", true)
    .order("full_name");
  if (scope.kind === "org") {
    // SuperAdmins oversee everyone; they are not one of the people being measured.
    profileQuery = profileQuery.neq("role", "superadmin");
  } else {
    // The group = its units' people + the GM's direct reports + the GM.
    const parts = [`id.eq.${scope.gmId}`, `parent_id.eq.${scope.gmId}`];
    if (units.length > 0) parts.push(`unit_id.in.(${units.map((u) => u.id).join(",")})`);
    profileQuery = profileQuery.or(parts.join(","));
  }
  const { data, error } = await profileQuery.returns<
    { id: string; full_name: string; role: string; unit_id: string | null }[]
  >();
  if (error) throw new ReportQueryError("profiles", error);

  const members = (data ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    role: p.role,
    unitId: p.unit_id,
  }));
  return { members, units };
}

async function staleAfterDays(): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("distribution_settings")
    .select("stale_after_days")
    .is("unit_id", null)
    .maybeSingle<{ stale_after_days: number | null }>();
  if (error) {
    Sentry.captureException(error, { tags: { job: "weekly-report", step: "stale-days" } });
    return 3;
  }
  return data?.stale_after_days ?? 3;
}

// -- Row shapes ---------------------------------------------------------------

type NewLeadRow = {
  id: string;
  agent_id: string | null;
  lead_source: string | null;
  pipeline_stage: string;
};
type AssignedLeadRow = { id: string; agent_id: string | null };
type ActivityRow = { lead_id: string; actor_id: string | null };
type OwnedRow = { agent_id: string | null };
type CaseRow = {
  agent_id: string | null;
  payment_frequency: PaymentFrequency;
  installment_contribution: number | string | null;
};
type OpenLeadRow = { id: string; agent_id: string | null };
type RunRow = { status: string; distributed: number | null };

type Tally = {
  received: Set<string>;
  contacted: Set<string>;
  quotes: number;
  appointments: number;
  cases: number;
  anc: number;
  stale: number;
};

function emptyTally(): Tally {
  return { received: new Set(), contacted: new Set(), quotes: 0, appointments: 0, cases: 0, anc: 0, stale: 0 };
}

// -- The report ---------------------------------------------------------------

export async function buildWeeklyReport(scope: ReportScope, period: ReportPeriod): Promise<WeeklyReport> {
  const admin = createAdminClient();
  const { members, units } = await loadScope(scope);
  const memberById = new Map(members.map((m) => [m.id, m]));
  // null = whole organisation: no id filter on the queries.
  const scopeIds: string[] | null = scope.kind === "org" ? null : members.map((m) => m.id);
  const inScope = (id: string | null): boolean => scopeIds === null || (id !== null && memberById.has(id));
  const tallyOf = new Map<string, Tally>(members.map((m) => [m.id, emptyTally()]));
  const tally = (id: string | null): Tally | null => (id ? (tallyOf.get(id) ?? null) : null);

  const startIso = mytMidnightIso(period.start);
  const endExIso = mytMidnightIso(addDays(period.end, 1));
  const staleDays = await staleAfterDays();
  const staleCutoffIso = new Date(new Date(endExIso).getTime() - staleDays * 86_400_000).toISOString();

  // A group with nobody in it has nothing to query (and `.in([])` would 400).
  const emptyGroup = scopeIds !== null && scopeIds.length === 0;

  const [
    createdLeads,
    assignedLeads,
    activity,
    quotes,
    appointments,
    cases,
    wonLeads,
    openLeads,
  ] = emptyGroup
    ? [[], [], [], [], [], [], [], []] as [NewLeadRow[], AssignedLeadRow[], ActivityRow[], OwnedRow[], OwnedRow[], CaseRow[], OwnedRow[], OpenLeadRow[]]
    : await Promise.all([
        // New leads: created in the period.
        fetchScoped<NewLeadRow>("new leads", scopeIds, (ids, from, to) => {
          let q = admin
            .from("leads")
            .select("id, agent_id, lead_source, pipeline_stage")
            .is("deleted_at", null)
            .gte("created_at", startIso)
            .lt("created_at", endExIso);
          if (ids) q = q.in("agent_id", ids);
          return q.order("id").range(from, to).returns<NewLeadRow[]>();
        }),
        // Leads handed out by a leader (Leader Assigned) in the period.
        fetchScoped<AssignedLeadRow>("assigned leads", scopeIds, (ids, from, to) => {
          let q = admin
            .from("leads")
            .select("id, agent_id")
            .is("deleted_at", null)
            .not("assigned_by", "is", null)
            .gte("assigned_at", startIso)
            .lt("assigned_at", endExIso);
          if (ids) q = q.in("agent_id", ids);
          return q.order("id").range(from, to).returns<AssignedLeadRow[]>();
        }),
        // "Contacted": any logged activity by the agent other than the two
        // system entries (lead created / lead assigned).
        fetchScoped<ActivityRow>("activity", scopeIds, (ids, from, to) => {
          let q = admin
            .from("lead_activity")
            .select("lead_id, actor_id")
            .not("activity_type", "in", "(created,assigned)")
            .gte("created_at", startIso)
            .lt("created_at", endExIso);
          if (ids) q = q.in("actor_id", ids);
          return q.order("id").range(from, to).returns<ActivityRow[]>();
        }),
        // Quotations that left draft, as the Statistics screen counts them.
        fetchScoped<OwnedRow>("quotations", scopeIds, (ids, from, to) => {
          let q = admin
            .from("quotations")
            .select("agent_id")
            .neq("status", "draft")
            .gte("created_at", startIso)
            .lt("created_at", endExIso);
          if (ids) q = q.in("agent_id", ids);
          return q.order("id").range(from, to).returns<OwnedRow[]>();
        }),
        // Appointments booked (created) in the period, cancelled ones excluded.
        fetchScoped<OwnedRow>("appointments", scopeIds, (ids, from, to) => {
          let q = admin
            .from("appointments")
            .select("agent_id")
            .neq("status", "cancelled")
            .gte("created_at", startIso)
            .lt("created_at", endExIso);
          if (ids) q = q.in("agent_id", ids);
          return q.order("id").range(from, to).returns<OwnedRow[]>();
        }),
        // Cases submitted in the period that still stand (submitted / inforce).
        fetchScoped<CaseRow>("cases", scopeIds, (ids, from, to) => {
          let q = admin
            .from("case_submissions")
            .select("agent_id, payment_frequency, installment_contribution")
            .in("status", COUNTED_CASE_STATUSES as unknown as string[])
            .gte("submitted_at", startIso)
            .lt("submitted_at", endExIso);
          if (ids) q = q.in("agent_id", ids);
          return q.order("id").range(from, to).returns<CaseRow[]>();
        }),
        // Closed won: leads whose agreed closing day (closed_on) is in the period.
        fetchScoped<OwnedRow>("closed won", scopeIds, (ids, from, to) => {
          let q = admin
            .from("leads")
            .select("agent_id")
            .is("deleted_at", null)
            .in("pipeline_stage", WON_STAGES)
            .gte("closed_on", period.start)
            .lte("closed_on", period.end);
          if (ids) q = q.in("agent_id", ids);
          return q.order("id").range(from, to).returns<OwnedRow[]>();
        }),
        // Stale candidates: still-open leads old enough to have gone stale.
        fetchScoped<OpenLeadRow>("open leads", scopeIds, (ids, from, to) => {
          let q = admin
            .from("leads")
            .select("id, agent_id")
            .is("deleted_at", null)
            .not("pipeline_stage", "in", `(${[...WON_STAGES, "closed_lost"].join(",")})`)
            .lt("created_at", staleCutoffIso);
          if (ids) q = q.in("agent_id", ids);
          return q.order("id").range(from, to).returns<OpenLeadRow[]>();
        }),
      ]);

  // Stale = an open lead with no activity of any kind since the stale window
  // opened (same rule as lib/staleness, evaluated at the end of the period).
  const candidateIds = openLeads.map((l) => l.id);
  const touched = new Set<string>();
  for (let i = 0; i < candidateIds.length; i += ID_CHUNK) {
    const chunk = candidateIds.slice(i, i + ID_CHUNK);
    const rows = await fetchAll<{ lead_id: string }>("stale activity", (from, to) =>
      admin
        .from("lead_activity")
        .select("lead_id")
        .in("lead_id", chunk)
        .gte("created_at", staleCutoffIso)
        .lt("created_at", endExIso)
        .order("id")
        .range(from, to)
        .returns<{ lead_id: string }[]>(),
    );
    for (const r of rows) touched.add(r.lead_id);
  }

  // -- Fold everything into the per-member tallies and the headline numbers.
  const sourceCounts = new Map<string, number>();
  let newLeads = 0;
  for (const l of createdLeads) {
    if (!inScope(l.agent_id)) continue;
    newLeads++;
    tally(l.agent_id)?.received.add(l.id);
    const source = l.lead_source?.trim() || "Not set";
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  let assignedByLeaders = 0;
  for (const l of assignedLeads) {
    if (!inScope(l.agent_id)) continue;
    assignedByLeaders++;
    tally(l.agent_id)?.received.add(l.id);
  }

  const contactedLeads = new Set<string>();
  for (const a of activity) {
    if (!inScope(a.actor_id)) continue;
    contactedLeads.add(a.lead_id);
    tally(a.actor_id)?.contacted.add(a.lead_id);
  }

  let quotations = 0;
  for (const q of quotes) {
    if (!inScope(q.agent_id)) continue;
    quotations++;
    const t = tally(q.agent_id);
    if (t) t.quotes++;
  }

  let appointmentCount = 0;
  for (const a of appointments) {
    if (!inScope(a.agent_id)) continue;
    appointmentCount++;
    const t = tally(a.agent_id);
    if (t) t.appointments++;
  }

  // ANC is the CRM's one definition (lib/case-anc): the annualised instalment
  // of each submitted / inforce case, here for cases submitted in the period.
  let caseCount = 0;
  let anc = 0;
  for (const c of cases) {
    if (!inScope(c.agent_id)) continue;
    const value = caseAnc({
      paymentFrequency: c.payment_frequency,
      installmentContribution: c.installment_contribution == null ? null : Number(c.installment_contribution),
    });
    caseCount++;
    anc += value;
    const t = tally(c.agent_id);
    if (t) {
      t.cases++;
      t.anc += value;
    }
  }

  let closedWon = 0;
  for (const l of wonLeads) if (inScope(l.agent_id)) closedWon++;

  let staleLeads = 0;
  for (const l of openLeads) {
    if (!inScope(l.agent_id) || touched.has(l.id)) continue;
    staleLeads++;
    const t = tally(l.agent_id);
    if (t) t.stale++;
  }

  // -- Tables
  const unitName = new Map(units.map((u) => [u.id, u.name]));
  const agents: ReportAgentRow[] = members
    .map((m) => {
      const t = tallyOf.get(m.id) ?? emptyTally();
      return {
        id: m.id,
        name: m.fullName,
        role: m.role,
        unitName: m.unitId ? (unitName.get(m.unitId) ?? null) : null,
        received: t.received.size,
        contacted: t.contacted.size,
        quotes: t.quotes,
        appointments: t.appointments,
        cases: t.cases,
        anc: t.anc,
        stale: t.stale,
      };
    })
    .sort(
      (a, b) =>
        b.anc - a.anc || b.cases - a.cases || b.received - a.received || a.name.localeCompare(b.name),
    );

  const unitRows: ReportUnitRow[] = units
    .map((u) => {
      const inUnit = members.filter((m) => m.unitId === u.id);
      const rows = agents.filter((a) => inUnit.some((m) => m.id === a.id));
      return {
        id: u.id,
        name: u.name,
        managerName: inUnit.find((m) => m.role === "unit_manager")?.fullName ?? null,
        agents: inUnit.length,
        newLeads: rows.reduce((s, r) => s + r.received, 0),
        quotes: rows.reduce((s, r) => s + r.quotes, 0),
        cases: rows.reduce((s, r) => s + r.cases, 0),
        anc: rows.reduce((s, r) => s + r.anc, 0),
      };
    })
    .sort((a, b) => b.anc - a.anc || b.cases - a.cases || a.name.localeCompare(b.name));

  const topAgents = agents.filter((a) => a.cases > 0 || a.anc > 0).slice(0, 3);
  const inactiveAgents = agents
    .filter(
      (a) =>
        SELLING_ROLES.includes(a.role) &&
        a.received === 0 &&
        a.contacted === 0 &&
        a.quotes === 0 &&
        a.appointments === 0 &&
        a.cases === 0,
    )
    .map((a) => ({ id: a.id, name: a.name, unitName: a.unitName }));

  const sortedSources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]);
  const sources = sortedSources.slice(0, MAX_SOURCES).map(([source, count]) => ({ source, count }));
  const otherCount = sortedSources.slice(MAX_SOURCES).reduce((s, [, c]) => s + c, 0);
  if (otherCount > 0) sources.push({ source: "Other", count: otherCount });

  // -- Daily distribution (new in the latest migration -- tolerate it missing).
  let distribution: WeeklyReport["distribution"] = null;
  if (!emptyGroup) {
    try {
      const runs = await fetchScoped<RunRow>("distribution runs", scopeIds, (ids, from, to) => {
        let q = admin
          .from("lead_distribution_runs")
          .select("status, distributed")
          .gte("run_date", period.start)
          .lte("run_date", period.end);
        if (ids) q = q.in("owner_id", ids);
        return q.order("id").range(from, to).returns<RunRow[]>();
      });
      distribution = { runsDone: 0, runsSkipped: 0, runsFailed: 0, leadsHandedOut: 0 };
      for (const r of runs) {
        if (r.status === "done") distribution.runsDone++;
        else if (r.status === "skipped") distribution.runsSkipped++;
        else if (r.status === "failed") distribution.runsFailed++;
        distribution.leadsHandedOut += r.distributed ?? 0;
      }
    } catch (e) {
      if (!(e instanceof ReportQueryError && isMissingSchema(e.code))) throw e;
    }
  }

  return {
    period,
    staleAfterDays: staleDays,
    headline: {
      newLeads,
      assignedByLeaders,
      contacted: contactedLeads.size,
      quotations,
      appointments: appointmentCount,
      cases: caseCount,
      closedWon,
      anc,
      staleLeads,
    },
    sources,
    distribution,
    units: unitRows,
    agents,
    topAgents,
    inactiveAgents,
  };
}

// -- Sending ------------------------------------------------------------------

type Recipient = { id: string; full_name: string; email: string; role: string };

function scopeFor(r: { id: string; role: string }): ReportScope {
  return r.role === "superadmin" ? { kind: "org" } : { kind: "group", gmId: r.id };
}

function scopeLabelFor(r: { full_name: string; role: string }): string {
  return r.role === "superadmin" ? "Whole organisation" : `${r.full_name}'s group`;
}

async function originForLinks(): Promise<string> {
  try {
    // Needs a request context; the cron route has one, but never fail a report over a link.
    const { appOrigin } = await import("@/lib/app-url");
    return await appOrigin();
  } catch {
    return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ?? "";
  }
}

async function renderAndSend(
  recipient: Recipient,
  period: ReportPeriod,
  preview: boolean,
): Promise<{ sent: boolean; error: string | null }> {
  const report = await buildWeeklyReport(scopeFor(recipient), period);
  const { subject, html } = weeklyReportEmail(report, {
    recipientName: recipient.full_name,
    scopeLabel: scopeLabelFor(recipient),
    origin: await originForLinks(),
    preview,
  });
  return sendEmail({ to: recipient.email, subject, html });
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Called by the hourly job. Does nothing unless it is Monday 09:00+ in Malaysia
// and the SuperAdmin master switch is on; weekly_report_runs (unique on week +
// recipient) makes the repeat hourly calls harmless. Never throws.
export async function runWeeklyReports(
  now: Date = new Date(),
): Promise<{ sent: number; skipped: number; reason?: string }> {
  try {
    const clock = mytClock(now);
    if (clock.isoWeekday !== 1 || clock.hour < REPORT_HOUR) {
      return { sent: 0, skipped: 0, reason: "Not Monday 09:00 (Malaysia time) yet." };
    }

    const admin = createAdminClient();

    // Master switch. A missing column (migration not applied) counts as on.
    const { data: settings, error: settingsError } = await admin
      .from("site_settings")
      .select("weekly_report_enabled")
      .eq("id", true)
      .maybeSingle<{ weekly_report_enabled: boolean | null }>();
    if (settingsError && !isMissingSchema(settingsError.code)) {
      Sentry.captureException(settingsError, { tags: { job: "weekly-report", step: "master-switch" } });
      return { sent: 0, skipped: 0, reason: "Couldn't read the weekly report setting." };
    }
    if (!settingsError && settings?.weekly_report_enabled === false) {
      return { sent: 0, skipped: 0, reason: "Weekly reports are switched off." };
    }

    // Recipients. A missing opt-in column means everyone is opted in.
    type ProfileRow = Recipient & { weekly_report_opt_in?: boolean | null };
    const withOptIn = await admin
      .from("profiles")
      .select("id, full_name, email, role, weekly_report_opt_in")
      .eq("is_active", true)
      .in("role", ["superadmin", "group_manager"])
      .returns<ProfileRow[]>();
    let rows = withOptIn.data;
    if (withOptIn.error) {
      if (!isMissingSchema(withOptIn.error.code)) {
        Sentry.captureException(withOptIn.error, { tags: { job: "weekly-report", step: "recipients" } });
        return { sent: 0, skipped: 0, reason: "Couldn't load the recipients." };
      }
      const fallback = await admin
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("is_active", true)
        .in("role", ["superadmin", "group_manager"])
        .returns<ProfileRow[]>();
      if (fallback.error) {
        Sentry.captureException(fallback.error, { tags: { job: "weekly-report", step: "recipients" } });
        return { sent: 0, skipped: 0, reason: "Couldn't load the recipients." };
      }
      rows = fallback.data;
    }

    const all = rows ?? [];
    const recipients = all.filter((r) => r.email && r.weekly_report_opt_in !== false);
    let skipped = all.length - recipients.length;
    let sent = 0;

    const period = previousWeek(now);
    let first = true;
    for (const recipient of recipients) {
      try {
        // Claim this (week, recipient) before doing any work.
        const claim = await admin
          .from("weekly_report_runs")
          .insert({ week_start: period.start, recipient_id: recipient.id, status: "sending" });
        if (claim.error) {
          if (claim.error.code === "23505") {
            // Already handled this week. Only a failed attempt is worth another go.
            const retry = await admin
              .from("weekly_report_runs")
              .update({ status: "sending", note: null })
              .eq("week_start", period.start)
              .eq("recipient_id", recipient.id)
              .eq("status", "failed")
              .select("id");
            if (retry.error || (retry.data ?? []).length === 0) {
              skipped++;
              continue;
            }
          } else if (isMissingSchema(claim.error.code)) {
            return { sent, skipped, reason: "Run the latest database migration first." };
          } else {
            Sentry.captureException(claim.error, { tags: { job: "weekly-report", step: "claim" } });
            skipped++;
            continue;
          }
        }

        if (!first) await sleep(SEND_GAP_MS);
        first = false;

        const result = await renderAndSend(recipient, period, false);
        const { error: updateError } = await admin
          .from("weekly_report_runs")
          .update(result.sent ? { status: "sent", note: null } : { status: "failed", note: (result.error ?? "Not sent").slice(0, 500) })
          .eq("week_start", period.start)
          .eq("recipient_id", recipient.id);
        if (updateError) Sentry.captureException(updateError, { tags: { job: "weekly-report", step: "status" } });
        if (result.sent) sent++;
        else {
          skipped++;
          Sentry.captureMessage(`Weekly report not sent: ${result.error ?? "unknown"}`, {
            level: "warning",
            tags: { job: "weekly-report" },
          });
        }
      } catch (e) {
        Sentry.captureException(e, { tags: { job: "weekly-report", step: "recipient" } });
        skipped++;
        await admin
          .from("weekly_report_runs")
          .update({ status: "failed", note: (e instanceof Error ? e.message : "Unexpected error").slice(0, 500) })
          .eq("week_start", period.start)
          .eq("recipient_id", recipient.id);
      }
    }
    return { sent, skipped };
  } catch (e) {
    Sentry.captureException(e, { tags: { job: "weekly-report" } });
    return { sent: 0, skipped: 0, reason: "Weekly report job failed." };
  }
}

// A one-off "what would I get" email for the signed-in manager: this week so
// far (Monday to today, Malaysia time). No weekly_report_runs row.
export async function sendWeeklyReportPreview(profile: {
  id: string;
  role: string;
  email: string;
  full_name: string;
}): Promise<{ error: string | null }> {
  if (profile.role !== "superadmin" && profile.role !== "group_manager") {
    return { error: "Weekly reports are for Group Managers and SuperAdmins." };
  }
  if (!profile.email) return { error: "Your account has no email address." };

  try {
    const allowed = await checkRateLimit("weekly-report-preview", profile.id, 3, 3600);
    if (!allowed) return { error: "You've requested too many previews. Try again in an hour." };

    const today = mytClock().date;
    const period = { start: addDays(today, -(isoWeekdayOf(today) - 1)), end: today };
    const result = await renderAndSend(
      { id: profile.id, full_name: profile.full_name, email: profile.email, role: profile.role },
      period,
      true,
    );
    if (!result.sent) return { error: result.error ?? "Couldn't send the preview." };
    return { error: null };
  } catch (e) {
    Sentry.captureException(e, { tags: { job: "weekly-report", step: "preview" } });
    return { error: "Couldn't build the preview. Please try again." };
  }
}
