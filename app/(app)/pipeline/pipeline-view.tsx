"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CurrentProfile } from "@/lib/profile-types";
import { STAGES, type PipelineStage } from "@/lib/pipeline-stages";
import { type PipelineLead, primaryQuoteValue } from "./types";
import { waLink } from "@/lib/whatsapp";
import { updateStage } from "@/app/(app)/leads/[id]/actions";
import { PhoneIcon, WhatsAppIcon, LeadsIcon, QuotationIcon, ChevronRightIcon } from "@/components/icons";

function fmtRM(n: number) {
  return n >= 1000 ? `RM ${(n / 1000).toFixed(1)}k` : `RM ${n.toFixed(0)}`;
}

function productTag(lead: PipelineLead) {
  const text = `${lead.lead_source ?? ""} ${lead.interest ?? ""}`.toLowerCase();
  if (text.includes("medical")) return { label: "MEDICAL", cls: "bg-success-bg text-green" };
  if (text.includes("hibah")) return { label: "HIBAH", cls: "bg-info-blue-bg text-info-blue-text" };
  return null;
}

function isToday(dateStr: string | null) {
  if (!dateStr) return false;
  return dateStr === new Date().toISOString().slice(0, 10);
}

export function PipelineView({
  leads,
  agents,
  profile,
  currentAgent,
}: {
  leads: PipelineLead[];
  agents: { id: string; full_name: string }[];
  profile: CurrentProfile;
  currentAgent: string;
}) {
  const router = useRouter();
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [mobileStage, setMobileStage] = useState<PipelineStage>("follow_up");

  const canManageStage = profile.role !== "group_manager" && profile.role !== "superadmin";

  const columns = useMemo(() => {
    const map: Record<string, PipelineLead[]> = {};
    for (const s of STAGES) map[s.value] = [];
    for (const lead of leads) {
      (map[lead.pipeline_stage] ??= []).push(lead);
    }
    return map;
  }, [leads]);

  const totalLeads = leads.length;
  const totalValue = leads.reduce((sum, l) => sum + (primaryQuoteValue(l) ?? 0), 0);

  function moveStage(leadId: string, stage: PipelineStage) {
    setOpenCardId(null);
    startTransition(async () => {
      await updateStage(leadId, stage, STAGES.find((s) => s.value === stage)!.label);
      router.refresh();
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
              {totalLeads} lead{totalLeads === 1 ? "" : "s"} · {fmtRM(totalValue)} monthly contribution in play
            </div>
          </div>
          <AgentFilter agents={agents} currentAgent={currentAgent} />
        </div>

        <div className="flex items-start gap-3 overflow-x-auto px-[26px] py-[18px] pb-16">
          {STAGES.map((stage) => {
            const cards = columns[stage.value];
            const value = cards.reduce((sum, l) => sum + (primaryQuoteValue(l) ?? 0), 0);
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
                      ? `${fmtRM(value)} / month`
                      : stage.value === "closed_lost"
                        ? "Reason required"
                        : `${fmtRM(value)} potential`}
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
                    onDragStart={() => setDragLeadId(lead.id)}
                    onMove={(s) => moveStage(lead.id, s)}
                    canManageStage={canManageStage}
                  />
                ))}
              </div>
            );
          })}
        </div>
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
            {fmtRM(columns[mobileStage].reduce((sum, l) => sum + (primaryQuoteValue(l) ?? 0), 0))}
          </span>
        </div>

        <div className="flex flex-col gap-2.5 px-5 pt-3 pb-8">
          {columns[mobileStage].length === 0 && (
            <p className="py-6 text-center text-[13px] text-muted">No leads in this stage.</p>
          )}
          {columns[mobileStage].map((lead) => {
            const tag = productTag(lead);
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
                  {lead.is_stale ? (
                    <span className="rounded-[6px] bg-alert-red-bg px-[7px] py-1 text-[9.5px] font-bold text-alert-red">
                      STALE
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
                  <a href={`tel:${lead.phone}`} className="flex h-11 items-center justify-center rounded-[11px] bg-navy">
                    <PhoneIcon width={15} height={15} className="text-gold" />
                  </a>
                  <a href={waLink(lead.phone)} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center rounded-[11px] bg-green">
                    <WhatsAppIcon width={16} height={16} fill="#fff" />
                  </a>
                  <Link href={`/quotation?lead_id=${lead.id}`} className="flex h-11 items-center justify-center rounded-[11px] border border-[#f0dfb4] bg-warn-gold-bg">
                    <QuotationIcon width={15} height={15} className="text-warn-gold-text" />
                  </Link>
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
                    <Link href={`/leads/${lead.id}`} className="flex h-11 items-center justify-center rounded-[11px] border border-sand-2 bg-cream">
                      <ChevronRightIcon width={15} height={15} className="text-navy" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AgentFilter({
  agents, currentAgent,
}: { agents: { id: string; full_name: string }[]; currentAgent: string }) {
  const router = useRouter();
  if (agents.length === 0) return null;
  return (
    <select
      onChange={(e) => {
        router.push(e.target.value ? `/pipeline?agent=${e.target.value}` : "/pipeline");
      }}
      defaultValue={currentAgent}
      className="rounded-[10px] border border-sand-2 bg-cream px-3.5 py-2.5 text-[12.5px] font-semibold text-navy"
    >
      <option value="">All agents</option>
      {agents.map((a) => (
        <option key={a.id} value={a.id}>{a.full_name}</option>
      ))}
    </select>
  );
}

function PipelineCard({
  lead, stage, open, onToggle, onDragStart, onMove, canManageStage,
}: {
  lead: PipelineLead;
  stage: PipelineStage;
  open: boolean;
  onToggle: () => void;
  onDragStart: () => void;
  onMove: (s: PipelineStage) => void;
  canManageStage: boolean;
}) {
  const tag = productTag(lead);
  const quoteValue = primaryQuoteValue(lead);
  const hasQuote = lead.quotations.length > 0;

  return (
    <div
      draggable={canManageStage}
      onDragStart={onDragStart}
      className="relative rounded-[14px] border border-sand bg-white p-3"
    >
      <div className="flex items-start justify-between gap-1.5">
        <Link href={`/leads/${lead.id}`} className="text-[13px] font-bold text-navy hover:underline">
          {lead.full_name}
        </Link>
        <button type="button" onClick={onToggle} className="text-taupe" aria-label="Card actions">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
        </button>
      </div>
      <div className="mt-0.5 text-[11.5px] font-medium text-muted-2">{lead.phone}</div>

      {lead.is_stale && (
        <span className="mt-2 inline-block rounded-[5px] bg-alert-red-bg px-[6px] py-[3px] text-[8.5px] font-bold text-alert-red">
          STALE
        </span>
      )}
      {isToday(lead.follow_up_date) && (
        <div className="mt-2 rounded-lg border border-[#f7e9c2] bg-warn-gold-bg px-2 py-1.5 text-[10.5px] font-semibold text-warn-gold-text">
          Callback today
        </div>
      )}
      {tag && !lead.is_stale && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span className={`rounded-[5px] px-[6px] py-[3px] text-[9px] font-bold ${tag.cls}`}>{tag.label}</span>
          {lead.lead_source && (
            <span className="rounded-[5px] border border-sand-2 bg-cream px-[6px] py-[3px] text-[9px] font-semibold text-muted">
              {lead.lead_source.split(" — ")[0]}
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
          <Link href={`/quotation?lead_id=${lead.id}`} onClick={onToggle} className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] font-semibold text-navy hover:bg-cream">
            <QuotationIcon width={14} height={14} />
            Quotation estimate
          </Link>
          {canManageStage && (
            <>
              <div className="mt-1 border-t border-sand-3 px-2 pt-2 pb-1 text-[9.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">
                Move card to
              </div>
              <div className="flex flex-wrap gap-1 px-2 pb-2">
                {STAGES.filter((s) => s.value !== stage).map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => onMove(s.value)}
                    className="rounded-[7px] border border-sand-2 bg-cream px-2 py-1 text-[10.5px] font-semibold text-muted-2 hover:border-navy hover:text-navy"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
