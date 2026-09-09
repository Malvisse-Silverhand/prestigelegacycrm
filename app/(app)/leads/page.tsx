import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getLeads, getFilterOptions, PAGE_SIZE, isLeadView, type LeadFilters } from "./data";
import { LeadFiltersBar } from "./filters";
import { StatusBadge } from "./status-badge";
import { AddLeadButton } from "./add-lead-button";
import { ImportButton } from "./import/import-button";
import { ExportCsvButton } from "./export-csv-button";
import { LeadRowActions } from "./lead-row-actions";
import { DeletedRowActions } from "./deleted-row-actions";
import { EmptyState } from "@/components/empty-state";
import { SearchIcon, LeadsIcon, WhatsAppIcon } from "@/components/icons";
import { waLink } from "@/lib/whatsapp";
import { productTag } from "@/lib/product-interest";
import { leadPotentialAnc } from "@/lib/lead-anc";
import { AncBadge } from "@/components/anc-badge";

function subtitleFor(role: string) {
  switch (role) {
    case "superadmin":
      return "Track and manage incoming leads across every unit";
    case "group_manager":
      return "Track and manage incoming leads across your units";
    case "unit_manager":
      return "Track and manage incoming leads for your unit";
    case "aspirant_unit_manager":
      return "Track and manage leads for you and your agents";
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
    // The Deleted view is SuperAdmin-only. RLS already hides soft-deleted
    // rows from everyone else, so forcing ?view=deleted would just show an
    // empty list -- dropping it here sends them to the normal list instead.
    view: params.view === "deleted" && profile.role !== "superadmin" ? undefined : params.view,
    page: params.page ? Number(params.page) : 1,
  };

  const [{ leads, total, page }, { agents }] = await Promise.all([
    getLeads(filters),
    getFilterOptions(),
  ]);

  const hasFilters = Boolean(
    filters.q || filters.from || filters.to || filters.status || filters.agent || isLeadView(filters.view),
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canManage = profile.role !== "agent";
  const isSuperAdmin = profile.role === "superadmin";
  const viewingDeleted = filters.view === "deleted";

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-sand bg-white px-5 lg:px-[30px] py-3.5 lg:py-5">
        <div className="min-w-0">
          <div className="text-[18px] font-extrabold tracking-[-0.02em] text-navy lg:text-[22px]">
            Lead Management
          </div>
          {/* The subtitle is orientation for a new user, not something worth a
              line of a phone screen every visit. */}
          <div className="mt-[3px] hidden text-[13px] font-medium text-muted lg:block">
            {subtitleFor(profile.role)}
          </div>
        </div>
        <ExportCsvButton />
      </div>

      <LeadFiltersBar
        key={`${filters.q ?? ""}|${filters.from ?? ""}|${filters.to ?? ""}|${filters.status ?? ""}|${filters.agent ?? ""}|${filters.view ?? ""}`}
        agents={agents}
        showAgentFilter={canManage}
      />
      <div className="flex flex-wrap justify-end gap-2 px-5 lg:gap-2.5 lg:px-[30px] pb-3 lg:pb-4">
        {isSuperAdmin && (
          <Link
            href={viewingDeleted ? "/leads" : "/leads?view=deleted"}
            className="press flex items-center gap-2 rounded-[11px] border border-sand-2 bg-white px-3 py-2 text-[12.5px] font-semibold text-navy lg:px-[17px] lg:py-3 lg:text-[13px]"
          >
            {viewingDeleted ? (
              "Back to all leads"
            ) : (
              <>
                <span className="lg:hidden">Deleted</span>
                <span className="hidden lg:inline">Deleted leads</span>
              </>
            )}
          </Link>
        )}
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
                <div>{viewingDeleted ? "Deleted by" : "Agent"}</div>
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
                      {viewingDeleted
                        ? (lead.deleted_by_profile?.full_name ?? "—")
                        : (lead.profiles?.full_name ?? "—")}
                    </div>
                    <div className={`font-medium ${fu.overdue ? "text-alert-red" : ""}`}>
                      {fu.text}
                    </div>
                    {viewingDeleted ? (
                      <DeletedRowActions lead={lead} />
                    ) : (
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
                        <LeadRowActions lead={lead} canManage={canManage} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile card list */}
            <div className="flex flex-col gap-2.5 lg:hidden">
              {leads.map((lead) => {
                const fu = fmtFollowUp(lead.follow_up_date);
                const tag = productTag(lead.interest);
                const potential = leadPotentialAnc(lead.quotations);
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

                    {(tag || potential) && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {tag && (
                          <span className={`rounded-[6px] px-[7px] py-[2px] text-[9.5px] font-bold tracking-[0.05em] ${tag.cls}`}>
                            {tag.label}
                          </span>
                        )}
                        <AncBadge potential={potential} />
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-medium text-muted">
                      <span className="truncate font-semibold text-green">{lead.profiles?.full_name ?? "Unassigned"}</span>
                      <span className={fu.overdue ? "font-semibold text-alert-red" : ""}>FU {fu.text}</span>
                      {lead.state && <span>{lead.state}</span>}
                    </div>

                    <div className="mt-3 flex items-center gap-1.5">
                      <a
                        href={waLink(lead.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="press flex h-9 w-11 flex-none items-center justify-center rounded-[10px] bg-green text-white"
                        aria-label="Message on WhatsApp"
                        title="WhatsApp"
                      >
                        <WhatsAppIcon width={16} height={16} fill="#fff" />
                      </a>
                      <LeadRowActions lead={lead} canManage={canManage} variant="labels" />
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
