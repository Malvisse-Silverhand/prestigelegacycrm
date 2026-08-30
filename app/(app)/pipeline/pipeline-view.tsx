"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CurrentProfile } from "@/lib/profile-types";
import { STAGES, type PipelineStage } from "@/lib/pipeline-stages";
import { type PipelineLead, primaryQuoteValue, stagePotentialValue, leadPotentialValue, daysSinceLastActivity, toAnc } from "./types";
import { waLink } from "@/lib/whatsapp";
import { productTag, INTEREST_OPTIONS } from "@/lib/product-interest";
import { quoteLauncherUrl } from "@/lib/quote-launcher";
import { updateStage } from "@/app/(app)/leads/[id]/actions";
import { AddLeadButton } from "@/app/(app)/leads/add-lead-button";
import { QuotationModal } from "@/components/quotation-modal";
import { PhoneIcon, WhatsAppIcon, LeadsIcon, QuotationIcon, ChevronRightIcon, PipelineIcon, TableIcon } from "@/components/icons";
import { EmptyState } from "@/components/empty-state";

// Same interest -> tool mapping InterestDropdown uses. No mapped tool (no
// interest set yet, or a product without a calculator) falls back to
// Lead Detail, where the agent can set the interest and launch from there.
function quoteToolFor(lead: { interest: string | null }) {
  return INTEREST_OPTIONS.find((o) => o.label === lead.interest)?.tool ?? null;
}

function fmtRM(n: number) {
  return n >= 1000 ? `RM ${(n / 1000).toFixed(1)}k` : `RM ${n.toFixed(0)}`;
}

function isToday(dateStr: string | null) {
  if (!dateStr) return false;
  return dateStr === new Date().toISOString().slice(0, 10);
}

function buildQuery(agent: string, interest: string) {
  const params = new URLSearchParams();
  if (agent) params.set("agent", agent);
  if (interest) params.set("interest", interest);
  const qs = params.toString();
  return qs ? `/pipeline?${qs}` : "/pipeline";
}

export function PipelineView({
  leads,
  agents,
  profile,
  currentAgent,
  currentInterest,
  staleAfterDays,
}: {
  leads: PipelineLead[];
  agents: { id: string; full_name: string }[];
  profile: CurrentProfile;
  currentAgent: string;
  currentInterest: string;
  staleAfterDays: number;
}) {
  const router = useRouter();
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [mobileStage, setMobileStage] = useState<PipelineStage>("follow_up");
  const [view, setView] = useState<"board" | "table">("board");
  const [quoteModal, setQuoteModal] = useState<{ url: string; leadName: string } | null>(null);

  // Same stale gate Lead Detail had: group_manager/superadmin were excluded
  // because they had no `leads` UPDATE RLS policy at the time, which
  // 20260828150000_section2_rls_fixes since added. The UPDATE policies line
  // up role-for-role with the SELECT policies, so every card the viewer can
  // see on this board is one they're also allowed to move (an agent's board
  // only ever contains their own leads).
  const canManageStage = true;
  const canAddLead = profile.role !== "agent";

  function openQuotation(lead: PipelineLead) {
    const tool = quoteToolFor(lead);
    if (tool) setQuoteModal({ url: quoteLauncherUrl(tool, lead), leadName: lead.full_name });
    else router.push(`/leads/${lead.id}`);
  }

  // The customizer saves straight onto this lead (capture-quotation), same as
  // from Lead Detail -- so refresh on close to pick the new quotation up.
  function openCustomizer(lead: PipelineLead) {
    setQuoteModal({
      url: quoteLauncherUrl("quotation-customizer.html", lead),
      leadName: lead.full_name,
    });
  }

  const columns = useMemo(() => {
    const map: Record<string, PipelineLead[]> = {};
    for (const s of STAGES) map[s.value] = [];
    for (const lead of leads) {
      (map[lead.pipeline_stage] ??= []).push(lead);
    }
    return map;
  }, [leads]);

  const totalLeads = leads.length;
  const totalValue = STAGES.reduce((sum, s) => sum + stagePotentialValue(s.value, columns[s.value]), 0);

  function moveStage(leadId: string, stage: PipelineStage) {
    setOpenCardId(null);
    setMoveError(null);
    startTransition(async () => {
      // No optimistic move -- `columns` is derived straight from server-fetched
      // `leads`, so a rejected update just leaves the card where it already
      // was once refresh() re-fetches. The one gap was silence: surface the
      // rejection instead of failing invisibly. This is also where the
      // "no quotation yet" block on entering Quoted actually gets enforced --
      // updateStage rejects it server-side, this just displays that rejection.
      try {
        const result = await updateStage(leadId, stage, STAGES.find((s) => s.value === stage)!.label);
        if (result.error) {
          setMoveError(result.error);
        } else {
          router.refresh();
        }
      } catch {
        setMoveError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  function handleDrop(stage: PipelineStage) {
    if (dragLeadId) moveStage(dragLeadId, stage);
    setDragLeadId(null);
  }

  return (
    <div>
      {/* Desktop board */}
      <div className="hidden lg:block">
        <div className="flex items-center gap-3.5 border-b border-sand bg-white px-[26px] py-[18px]">
          <div className="flex-1">
            <div className="text-[22px] font-extrabold tracking-[-0.025em] text-navy">
              Sales Pipeline
            </div>
            <div className="mt-0.5 text-[12.5px] font-medium text-muted">
              {totalLeads} lead{totalLeads === 1 ? "" : "s"} · {fmtRM(toAnc(totalValue))} ANC in play
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 border-b border-sand bg-cream px-[26px] py-3">
          <ViewToggle view={view} onChange={setView} />
          <div className="flex-1" />
          <ProductFilter currentAgent={currentAgent} currentInterest={currentInterest} />
          <AgentFilter agents={agents} currentAgent={currentAgent} currentInterest={currentInterest} />
          {canAddLead && <AddLeadButton />}
        </div>

        {moveError && (
          <div className="mx-[26px] mt-3 rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
            {moveError}
          </div>
        )}

        {totalLeads === 0 ? (
          <div className="px-[26px] py-[18px]">
            <EmptyState
              icon={<PipelineIcon width={28} height={28} className="text-green" />}
              title={currentAgent || currentInterest ? "No leads match these filters" : "Pipeline is empty"}
              description={
                currentAgent || currentInterest
                  ? "Clear the filters to see the full board."
                  : canManageStage
                    ? "Leads land here as soon as they're created in Leads Manager."
                    : "Leads assigned to you will show up here."
              }
              actions={currentAgent || currentInterest ? [{ label: "Clear filters", href: "/pipeline" }] : undefined}
            />
          </div>
        ) : view === "table" ? (
          <PipelineTable leads={leads} agents={agents} />
        ) : (
        <div className="flex items-start gap-3 overflow-x-auto px-[26px] py-[18px] pb-16">
          {STAGES.map((stage) => {
            const cards = columns[stage.value];
            const value = stagePotentialValue(stage.value, cards);
            return (
              <div
                key={stage.value}
                className="flex w-[240px] flex-none flex-col gap-2.5"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.value)}
              >
                <div className="rounded-xl border border-sand bg-white px-3 py-2.5">
                  <div className="flex items-center gap-[7px]">
                    <span className="h-[7px] w-[7px] rounded-full" style={{ background: stage.dot }} />
                    <span className="flex-1 text-[11px] font-bold tracking-[0.08em] text-navy uppercase">
                      {stage.label}
                    </span>
                    <span className="text-[11px] font-bold text-taupe">{cards.length}</span>
                  </div>
                  <div
                    className={`mt-[3px] text-[10.5px] font-semibold ${stage.value === "closed_won" ? "text-green" : "text-taupe"}`}
                  >
                    {stage.value === "closed_won"
                      ? `${fmtRM(toAnc(value))} ANC`
                      : stage.value === "closed_lost"
                        ? "Reason required"
                        : `${fmtRM(toAnc(value))} ANC potential`}
                  </div>
                </div>

                {cards.length === 0 && (
                  <div className="rounded-[14px] border-2 border-dashed border-sand-2 bg-white/45 px-2.5 py-4 text-center text-[11px] font-semibold text-taupe-2">
                    No leads here
                  </div>
                )}

                {cards.map((lead) => (
                  <PipelineCard
                    key={lead.id}
                    lead={lead}
                    stage={stage.value}
                    open={openCardId === lead.id}
                    onToggle={() => setOpenCardId(openCardId === lead.id ? null : lead.id)}
                    isDragging={dragLeadId === lead.id}
                    onDragStart={() => setDragLeadId(lead.id)}
                    onDragEnd={() => setDragLeadId(null)}
                    onMove={(s) => moveStage(lead.id, s)}
                    canManageStage={canManageStage}
                    staleAfterDays={staleAfterDays}
                    onOpenQuotation={() => openQuotation(lead)}
                    onOpenCustomizer={() => openCustomizer(lead)}
                  />
                ))}
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        <div className="bg-navy px-5 pt-3.5 pb-4 text-white">
          <div className="text-base font-bold">Sales Pipeline</div>
          <div className="mt-3.5 flex gap-1.5 overflow-x-auto">
            {STAGES.filter((s) => !s.value.startsWith("closed") || columns[s.value].length > 0).map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setMobileStage(s.value)}
                className={
                  mobileStage === s.value
                    ? "flex-none rounded-full bg-gold px-3 py-1.5 text-[11.5px] font-bold text-navy"
                    : "flex-none rounded-full bg-white/[.09] px-3 py-1.5 text-[11.5px] font-semibold text-white/75"
                }
              >
                {s.label} {columns[s.value].length}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-baseline justify-between px-5 pt-3.5">
          <span className="text-[12.5px] font-bold text-navy">
            {STAGES.find((s) => s.value === mobileStage)?.label} · {columns[mobileStage].length} leads
          </span>
          <span className="text-[11.5px] font-semibold text-taupe">
            {fmtRM(toAnc(stagePotentialValue(mobileStage, columns[mobileStage])))} ANC
          </span>
        </div>

        {moveError && (
          <div className="mx-5 mt-3 rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
            {moveError}
          </div>
        )}

        <div className="flex flex-col gap-2.5 px-5 pt-3 pb-8">
          {columns[mobileStage].length === 0 && (
            <p className="py-6 text-center text-[13px] text-muted">No leads in this stage.</p>
          )}
          {columns[mobileStage].map((lead) => {
            const tag = productTag(lead.interest);
            const staleDays = daysSinceLastActivity(lead);
            const stale = staleDays >= staleAfterDays;
            const nextStage = STAGES[Math.min(STAGES.findIndex((s) => s.value === mobileStage) + 1, STAGES.length - 1)];
            return (
              <div key={lead.id} className="rounded-2xl border border-sand bg-white p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/leads/${lead.id}`} className="text-[14.5px] font-bold text-navy">
                      {lead.full_name}
                    </Link>
                    <div className="mt-0.5 text-xs font-medium text-muted-2">{lead.phone}</div>
                  </div>
                  {stale ? (
                    <span className="rounded-[6px] bg-alert-red-bg px-[7px] py-1 text-[9.5px] font-bold text-alert-red">
                      STALE {staleDays}d
                    </span>
                  ) : tag ? (
                    <span className={`rounded-[7px] px-2 py-[3px] text-[10px] font-bold ${tag.cls}`}>{tag.label}</span>
                  ) : null}
                </div>
                {isToday(lead.follow_up_date) && (
                  <div className="mt-2.5 rounded-[10px] border border-[#f7e9c2] bg-warn-gold-bg px-2.5 py-2 text-[11.5px] font-semibold text-warn-gold-text">
                    Callback today
                  </div>
                )}
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  <a href={`tel:${lead.phone}`} className="flex h-11 items-center justify-center rounded-[11px] bg-navy" aria-label="Call">
                    <PhoneIcon width={15} height={15} className="text-gold" />
                  </a>
                  <a href={waLink(lead.phone)} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center rounded-[11px] bg-green" aria-label="WhatsApp">
                    <WhatsAppIcon width={16} height={16} fill="#fff" />
                  </a>
                  <button type="button" onClick={() => openQuotation(lead)} className="flex h-11 items-center justify-center rounded-[11px] border border-[#f0dfb4] bg-warn-gold-bg" aria-label="Quotation estimate">
                    <QuotationIcon width={15} height={15} className="text-warn-gold-text" />
                  </button>
                  {canManageStage ? (
                    <button
                      type="button"
                      onClick={() => moveStage(lead.id, nextStage.value)}
                      className="flex h-11 items-center justify-center rounded-[11px] border border-sand-2 bg-cream"
                      aria-label={`Move to ${nextStage.label}`}
                    >
                      <ChevronRightIcon width={15} height={15} className="text-navy" />
                    </button>
                  ) : (
                    <Link href={`/leads/${lead.id}`} className="flex h-11 items-center justify-center rounded-[11px] border border-sand-2 bg-cream" aria-label="Open lead">
                      <ChevronRightIcon width={15} height={15} className="text-navy" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <QuotationModal
        url={quoteModal?.url ?? null}
        title={quoteModal ? `Quotation — ${quoteModal.leadName}` : ""}
        onClose={() => {
          setQuoteModal(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: "board" | "table"; onChange: (v: "board" | "table") => void }) {
  return (
    <div className="flex rounded-[10px] border border-sand-2 bg-white p-[3px]">
      <button
        type="button"
        onClick={() => onChange("board")}
        className={
          view === "board"
            ? "flex items-center gap-1.5 rounded-[7px] bg-navy px-3 py-[7px] text-[12px] font-semibold text-white"
            : "flex items-center gap-1.5 rounded-[7px] px-3 py-[7px] text-[12px] font-semibold text-muted"
        }
      >
        <PipelineIcon width={13} height={13} />
        Board
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={
          view === "table"
            ? "flex items-center gap-1.5 rounded-[7px] bg-navy px-3 py-[7px] text-[12px] font-semibold text-white"
            : "flex items-center gap-1.5 rounded-[7px] px-3 py-[7px] text-[12px] font-semibold text-muted"
        }
      >
        <TableIcon width={13} height={13} />
        Table
      </button>
    </div>
  );
}

function AgentFilter({
  agents, currentAgent, currentInterest,
}: { agents: { id: string; full_name: string }[]; currentAgent: string; currentInterest: string }) {
  const router = useRouter();
  if (agents.length === 0) return null;
  return (
    <select
      onChange={(e) => router.push(buildQuery(e.target.value, currentInterest))}
      defaultValue={currentAgent}
      className="rounded-[10px] border border-sand-2 bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-navy"
    >
      <option value="">All agents</option>
      {agents.map((a) => (
        <option key={a.id} value={a.id}>{a.full_name}</option>
      ))}
    </select>
  );
}

function ProductFilter({
  currentAgent, currentInterest,
}: { currentAgent: string; currentInterest: string }) {
  const router = useRouter();
  return (
    <select
      onChange={(e) => router.push(buildQuery(currentAgent, e.target.value))}
      defaultValue={currentInterest}
      className="rounded-[10px] border border-sand-2 bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-navy"
    >
      <option value="">All products</option>
      {INTEREST_OPTIONS.map((o) => (
        <option key={o.label} value={o.label}>{o.label}</option>
      ))}
    </select>
  );
}

function PipelineTable({
  leads, agents,
}: { leads: PipelineLead[]; agents: { id: string; full_name: string }[] }) {
  const agentName = new Map(agents.map((a) => [a.id, a.full_name]));
  return (
    <div className="px-[26px] py-[18px] pb-16">
      <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-card">
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1.1fr_1fr_1fr] bg-navy px-5 py-[13px] text-[10.5px] font-bold tracking-[0.07em] text-white/72 uppercase">
              <div>Lead</div>
              <div>Phone</div>
              <div>Stage</div>
              <div>Product</div>
              <div>Agent</div>
              <div className="text-right">Value / Actions</div>
            </div>
            {leads.map((lead) => {
              const stage = STAGES.find((s) => s.value === lead.pipeline_stage) ?? STAGES[0];
              const tag = productTag(lead.interest);
              const value = leadPotentialValue(lead);
              return (
                <div
                  key={lead.id}
                  className="grid grid-cols-[1.5fr_1fr_1fr_1.1fr_1fr_1fr] items-center border-b border-sand-3 px-5 py-3 text-[12.5px] text-ink last:border-b-0"
                >
                  <Link href={`/leads/${lead.id}`} className="truncate font-bold text-navy hover:underline">
                    {lead.full_name}
                  </Link>
                  <div className="font-medium">{lead.phone}</div>
                  <div>
                    <span className="inline-flex items-center gap-[6px] rounded-[7px] bg-cream px-2 py-1 text-[10.5px] font-bold text-navy">
                      <span className="h-[6px] w-[6px] rounded-full" style={{ background: stage.dot }} />
                      {stage.label}
                    </span>
                  </div>
                  <div>
                    {tag ? (
                      <span className={`rounded-[6px] px-[7px] py-[3px] text-[10px] font-bold ${tag.cls}`}>{tag.label}</span>
                    ) : (
                      <span className="text-taupe">—</span>
                    )}
                  </div>
                  <div className="truncate font-semibold text-green">{agentName.get(lead.agent_id ?? "") ?? "—"}</div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-extrabold text-navy">{value > 0 ? fmtRM(value) : "—"}</span>
                    <a href={`tel:${lead.phone}`} className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-navy" aria-label="Call">
                      <PhoneIcon width={12} height={12} className="text-gold" />
                    </a>
                    <a href={waLink(lead.phone)} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-green" aria-label="WhatsApp">
                      <WhatsAppIcon width={12} height={12} fill="#fff" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineCard({
  lead, stage, open, onToggle, isDragging, onDragStart, onDragEnd, onMove, canManageStage, staleAfterDays, onOpenQuotation, onOpenCustomizer,
}: {
  lead: PipelineLead;
  stage: PipelineStage;
  open: boolean;
  onToggle: () => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (s: PipelineStage) => void;
  canManageStage: boolean;
  staleAfterDays: number;
  onOpenQuotation: () => void;
  onOpenCustomizer: () => void;
}) {
  const tag = productTag(lead.interest);
  const quoteValue = primaryQuoteValue(lead);
  const hasQuote = lead.quotations.length > 0;
  const staleDays = daysSinceLastActivity(lead);
  const stale = staleDays >= staleAfterDays;

  return (
    <div
      draggable={canManageStage}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={
        "relative rounded-[14px] border bg-white p-3 transition-colors " +
        (canManageStage ? "cursor-grab active:cursor-grabbing " : "") +
        (isDragging ? "border-gold bg-gold/10 opacity-70 shadow-elevated ring-2 ring-gold" : "border-sand")
      }
    >
      <div className="flex items-start justify-between gap-1.5">
        <Link href={`/leads/${lead.id}`} draggable={false} className="text-[13px] font-bold text-navy hover:underline">
          {lead.full_name}
        </Link>
        <button type="button" onClick={onToggle} className="text-taupe" aria-label="Card actions">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
        </button>
      </div>
      <div className="mt-0.5 text-[11.5px] font-medium text-muted-2">{lead.phone}</div>

      {stale && (
        <span className="mt-2 inline-block rounded-[5px] bg-alert-red-bg px-[6px] py-[3px] text-[8.5px] font-bold text-alert-red">
          STALE {staleDays}d
        </span>
      )}
      {isToday(lead.follow_up_date) && (
        <div className="mt-2 rounded-lg border border-[#f7e9c2] bg-warn-gold-bg px-2 py-1.5 text-[10.5px] font-semibold text-warn-gold-text">
          Callback today
        </div>
      )}
      {tag && !stale && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span className={`rounded-[5px] px-[6px] py-[3px] text-[9px] font-bold ${tag.cls}`}>{tag.label}</span>
          {lead.lead_source && (
            <span className="rounded-[5px] border border-sand-2 bg-cream px-[6px] py-[3px] text-[9px] font-semibold text-muted">
              {lead.lead_source}
            </span>
          )}
        </div>
      )}

      {hasQuote && (stage === "quoted" || stage === "closed_won") && quoteValue !== null && (
        <div className="mt-2.5 flex items-baseline justify-between border-t border-sand-3 pt-2.5">
          <span className="text-[10px] font-semibold text-taupe">
            {stage === "closed_won" ? "Policy active" : "Quote sent"}
          </span>
          <span className={`text-[12.5px] font-extrabold ${stage === "closed_won" ? "text-gold" : "text-green"}`}>
            {fmtRM(quoteValue)}<span className="text-[9px] text-taupe">/mo</span>
          </span>
        </div>
      )}

      <div className="mt-2.5 grid grid-cols-3 gap-1.5 border-t border-sand-3 pt-2.5">
        <a href={`tel:${lead.phone}`} draggable={false} className="flex h-8 items-center justify-center rounded-[8px] bg-navy" aria-label="Call">
          <PhoneIcon width={13} height={13} className="text-gold" />
        </a>
        <a href={waLink(lead.phone)} target="_blank" rel="noopener noreferrer" draggable={false} className="flex h-8 items-center justify-center rounded-[8px] bg-green" aria-label="WhatsApp">
          <WhatsAppIcon width={13} height={13} fill="#fff" />
        </a>
        <button type="button" onClick={onOpenQuotation} className="flex h-8 items-center justify-center rounded-[8px] border border-[#f0dfb4] bg-warn-gold-bg" aria-label="Quotation estimate">
          <QuotationIcon width={13} height={13} className="text-warn-gold-text" />
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 z-10 mt-1.5 w-[240px] rounded-[14px] border border-sand-2 bg-white p-1.5 shadow-elevated">
          <div className="px-2 pt-1 pb-1 text-[9.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">
            Linked actions
          </div>
          <Link href={`/leads/${lead.id}`} onClick={onToggle} className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] font-semibold text-navy hover:bg-cream">
            <LeadsIcon width={14} height={14} />
            Open in Leads Manager
          </Link>
          <Link href={`/wa-flow?lead_id=${lead.id}`} onClick={onToggle} className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] font-semibold text-navy hover:bg-cream">
            <WhatsAppIcon width={14} height={14} className="text-green" />
            Send WA template
          </Link>
          <button
            type="button"
            onClick={() => { onToggle(); onOpenQuotation(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[12px] font-semibold text-navy hover:bg-cream"
          >
            <QuotationIcon width={14} height={14} />
            Quotation estimate
          </button>
          <button
            type="button"
            onClick={() => { onToggle(); onOpenCustomizer(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[12px] font-semibold text-navy hover:bg-cream"
          >
            <QuotationIcon width={14} height={14} />
            Open customizer
          </button>
          {canManageStage && (
            <>
              <div className="mt-1 border-t border-sand-3 px-2 pt-2 pb-1 text-[9.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">
                Pipeline stage
              </div>
              <div className="px-2 pb-2">
                <select
                  value={stage}
                  onChange={(e) => onMove(e.target.value as PipelineStage)}
                  className="w-full rounded-[7px] border border-sand-2 bg-cream px-2 py-1.5 text-[10.5px] font-semibold text-navy outline-none focus:border-gold"
                >
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
