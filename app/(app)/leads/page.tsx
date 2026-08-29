import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getLeads, getFilterOptions, PAGE_SIZE, type LeadFilters } from "./data";
import { LeadFiltersBar } from "./filters";
import { StatusBadge } from "./status-badge";
import { AddLeadButton } from "./add-lead-button";
import { ImportButton } from "./import/import-button";
import { ExportCsvButton } from "./export-csv-button";
import { LeadRowActions } from "./lead-row-actions";
import { EmptyState } from "@/components/empty-state";
import { SearchIcon, LeadsIcon, WhatsAppIcon } from "@/components/icons";
import { waLink } from "@/lib/whatsapp";

function subtitleFor(role: string) {
  switch (role) {
    case "superadmin":
      return "Track and manage incoming leads across every unit";
    case "group_manager":
      return "Track and manage incoming leads across your units";
    case "unit_manager":
      return "Track and manage incoming leads for your unit";
    default:
      return "Track and manage your own leads";
  }
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function fmtCreated(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtFollowUp(dateStr: string | null) {
  if (!dateStr) return { text: "—", overdue: false };
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr < today) return { text: "Overdue", overdue: true };
  const d = new Date(dateStr);
  return { text: `${d.getDate()}/${d.getMonth() + 1}`, overdue: false };
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const params = await searchParams;
  const filters: LeadFilters = {
    q: params.q,
    from: params.from,
    to: params.to,
    status: params.status,
    agent: params.agent,
    page: params.page ? Number(params.page) : 1,
  };

  const [{ leads, total, page }, { agents }] = await Promise.all([
    getLeads(filters),
    getFilterOptions(),
  ]);

  const hasFilters = Boolean(filters.q || filters.from || filters.to || filters.status || filters.agent);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canManage = profile.role !== "agent";

  return (
    <div>
      <div className="flex items-start justify-between gap-4 border-b border-sand bg-white px-5 lg:px-[30px] py-5">
        <div>
          <div className="text-[22px] font-extrabold tracking-[-0.02em] text-navy">
            Lead Management
          </div>
          <div className="mt-[3px] text-[13px] font-medium text-muted">
            {subtitleFor(profile.role)}
          </div>
        </div>
        <ExportCsvButton leads={leads} />
      </div>

      <LeadFiltersBar
        key={`${filters.q ?? ""}|${filters.from ?? ""}|${filters.to ?? ""}|${filters.status ?? ""}|${filters.agent ?? ""}`}
        agents={agents}
        showAgentFilter={canManage}
      />
      <div className="flex flex-wrap justify-end gap-2.5 px-5 lg:px-[30px] pb-4">
        <ImportButton />
        {canManage && <AddLeadButton />}
      </div>

      <div className="px-5 lg:px-[30px] pb-[30px]">
        {leads.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={<SearchIcon width={28} height={28} className="text-taupe" />}
              title={filters.q ? `No leads match "${filters.q}"` : "No leads match your filters"}
              description="Try a different search, or clear the filters to see all leads."
              actions={[{ label: "Clear filters", href: "/leads" }]}
            />
          ) : (
            <EmptyState
              icon={<LeadsIcon width={32} height={32} className="text-green" />}
              title="No leads yet"
              description={
                canManage
                  ? "New leads from your campaigns will show up here as they come in."
                  : "Leads assigned to you will show up here."
              }
            />
          )
        ) : (
          <>
            {/* Desktop table -- the 10-column grid has no room to breathe below
               lg, so narrow viewports get their own card list instead. */}
            <div className="hidden overflow-hidden rounded-2xl border border-sand bg-white shadow-card lg:block">
              <div className="grid grid-cols-[1.5fr_1fr_.9fr_.9fr_1fr_1fr_.8fr_1fr_.8fr_.7fr] bg-navy px-5 py-[13px] text-[10.5px] font-bold tracking-[0.07em] text-white/72 uppercase">
                <div>Name</div>
                <div>Phone</div>
                <div>Date of Birth</div>
                <div>State</div>
                <div>Occupation</div>
                <div>Created</div>
                <div>Status</div>
                <div>Agent</div>
                <div>FU Date</div>
                <div className="text-right">Actions</div>
              </div>
              {leads.map((lead) => {
                const fu = fmtFollowUp(lead.follow_up_date);
                return (
                  <div
                    key={lead.id}
                    className="grid grid-cols-[1.5fr_1fr_.9fr_.9fr_1fr_1fr_.8fr_1fr_.8fr_.7fr] items-center border-b border-sand-3 px-5 py-3.5 text-[12.5px] text-ink last:border-b-0"
                  >
                    <Link href={`/leads/${lead.id}`} className="truncate font-bold text-navy hover:underline">
                      {lead.full_name}
                    </Link>
                    <div className="font-medium">{lead.phone}</div>
                    <div className="font-medium">{fmtDate(lead.date_of_birth)}</div>
                    <div className="truncate font-medium">{lead.state ?? "—"}</div>
                    <div className="truncate font-medium">{lead.occupation ?? "—"}</div>
                    <div className="font-medium">{fmtCreated(lead.created_at)}</div>
                    <div><StatusBadge status={lead.status} /></div>
                    <div className="truncate font-semibold text-green">
                      {lead.profiles?.full_name ?? "—"}
                    </div>
                    <div className={`font-medium ${fu.overdue ? "text-alert-red" : ""}`}>
                      {fu.text}
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <a
                        href={waLink(lead.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-green"
                        aria-label="Message on WhatsApp"
                      >
                        <WhatsAppIcon width={13} height={13} fill="#fff" />
                      </a>
                      <LeadRowActions lead={lead} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile card list */}
            <div className="flex flex-col gap-2.5 lg:hidden">
              {leads.map((lead) => {
                const fu = fmtFollowUp(lead.follow_up_date);
                return (
                  <div key={lead.id} className="rounded-2xl border border-sand bg-white p-3.5 shadow-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/leads/${lead.id}`} className="truncate text-[14.5px] font-bold text-navy hover:underline">
                          {lead.full_name}
                        </Link>
                        <div className="mt-0.5 text-xs font-medium text-muted-2">{lead.phone}</div>
                      </div>
                      <StatusBadge status={lead.status} />
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-medium text-muted">
                      <span className="truncate font-semibold text-green">{lead.profiles?.full_name ?? "Unassigned"}</span>
                      <span className={fu.overdue ? "font-semibold text-alert-red" : ""}>FU {fu.text}</span>
                      {lead.state && <span>{lead.state}</span>}
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <a
                        href={waLink(lead.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 flex-1 items-center justify-center gap-2 rounded-[10px] bg-green text-[12.5px] font-semibold text-white"
                        aria-label="Message on WhatsApp"
                      >
                        <WhatsAppIcon width={13} height={13} fill="#fff" />
                        WhatsApp
                      </a>
                      <LeadRowActions lead={lead} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between text-[12.5px] font-medium text-muted">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} lead{total === 1 ? "" : "s"}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={{ query: { ...params, page: String(p) } }}
                      className={
                        p === page
                          ? "flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-navy font-bold text-white"
                          : "flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border border-sand-2 bg-white font-semibold text-navy"
                      }
                    >
                      {p}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
