"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type SVGProps } from "react";
import Link from "next/link";
import type { PipelineStage } from "@/lib/pipeline-stages";
import { type PipelineLead, stagePotentialValue, stageCollected, daysSinceLastActivity, toAnc } from "./types";
import type { LeadCaseAnc } from "@/lib/case-anc";
import { waLink } from "@/lib/whatsapp";
import { productTag } from "@/lib/product-interest";
import { leadPotentialAnc } from "@/lib/lead-anc";
import { AncBadge } from "@/components/anc-badge";
import { malaysiaToday } from "@/lib/malaysia-date";
import { LeadNo } from "@/components/lead-no";
import { PhoneIcon, WhatsAppIcon, QuotationIcon } from "@/components/icons";
import { useTouchDrag } from "./use-touch-drag";
import { MoveSheet } from "./move-sheet";

type Stage = { value: PipelineStage; label: string; dot: string };

const UNDO_MS = 5000;

function fmtRM(n: number) {
  return n >= 1000 ? `RM ${(n / 1000).toFixed(1)}k` : `RM ${n.toFixed(0)}`;
}

function isToday(dateStr: string | null) {
  if (!dateStr) return false;
  return dateStr === malaysiaToday();
}

// A small "move between columns" glyph, Lucide's 24x24 stroke-2 style, kept
// local so this file doesn't need an edit to components/icons.tsx (another
// workstream owns that file in the same upgrade).
function MoveGlyph(props: SVGProps<SVGSVGElement>) {
  const { width = 14, height = 14, ...rest } = props;
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <polyline points="18 8 22 12 18 16" />
      <polyline points="6 8 2 12 6 16" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  );
}

export function MobileBoard({
  columns,
  stages,
  moveStage,
  movePending,
  moveError,
  openQuotation,
  casedAnc,
  staleAfterDays,
}: {
  columns: Record<string, PipelineLead[]>;
  stages: Stage[];
  moveStage: (leadId: string, stage: PipelineStage) => void;
  movePending: boolean;
  moveError: string | null;
  openQuotation: (lead: PipelineLead) => void;
  casedAnc: Map<string, LeadCaseAnc>;
  staleAfterDays: number;
}) {
  const [mobileStage, setMobileStage] = useState<PipelineStage>("follow_up");
  const [moveSheetLead, setMoveSheetLead] = useState<PipelineLead | null>(null);
  const [undo, setUndo] = useState<{ leadId: string; from: PipelineStage; to: PipelineStage; name: string } | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rafRef = useRef<number | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Kept in sync with `mobileStage` so the drop handler (captured once by
  // useTouchDrag's effect) always reads the column the user is actually
  // looking at, including one reached by edge auto-scroll mid-drag.
  const mobileStageRef = useRef<PipelineStage>(mobileStage);
  useEffect(() => {
    mobileStageRef.current = mobileStage;
  }, [mobileStage]);

  // Closed stages that have emptied out drop off the chip strip, same rule
  // the old single-column view used -- except the stage currently on screen
  // never disappears out from under the visitor.
  const visibleStages = useMemo(
    () => stages.filter((s) => !s.value.startsWith("closed") || (columns[s.value]?.length ?? 0) > 0 || s.value === mobileStage),
    [stages, columns, mobileStage],
  );

  const leadById = useMemo(() => {
    const m = new Map<string, PipelineLead>();
    for (const s of stages) for (const l of columns[s.value] ?? []) m.set(l.id, l);
    return m;
  }, [stages, columns]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of stages) c[s.value] = (columns[s.value] ?? []).length;
    return c;
  }, [stages, columns]);

  function labelFor(v: PipelineStage) {
    return stages.find((s) => s.value === v)?.label ?? v;
  }

  // Initial column: land on Follow Up instantly, no scroll animation.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.max(visibleStages.findIndex((s) => s.value === "follow_up"), 0);
    el.scrollLeft = idx * el.clientWidth;
    // Mount-only: this is a one-time landing position, not a sync effect
    // that should re-fire as columns change under the visitor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A rotation or resize changes clientWidth, which would otherwise leave
  // the scroll position pointing at a fraction of the wrong column.
  useEffect(() => {
    function onResize() {
      const el = scrollerRef.current;
      if (!el) return;
      const idx = Math.max(visibleStages.findIndex((s) => s.value === mobileStage), 0);
      el.scrollLeft = idx * el.clientWidth;
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [visibleStages, mobileStage]);

  // The active chip stays in view as the visitor scrolls through the board,
  // even when the strip itself is wider than the screen.
  useEffect(() => {
    chipRefs.current.get(mobileStage)?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [mobileStage]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  function handleScroll() {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollerRef.current;
      if (!el || el.clientWidth === 0) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      const clamped = Math.min(Math.max(idx, 0), visibleStages.length - 1);
      const next = visibleStages[clamped]?.value;
      if (next && next !== mobileStage) setMobileStage(next);
    });
  }

  function goToStage(stage: PipelineStage) {
    const idx = visibleStages.findIndex((s) => s.value === stage);
    const el = scrollerRef.current;
    if (!el || idx < 0) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
    // Set eagerly so the chip/dots highlight right away instead of waiting
    // on the scroll animation to settle and the onScroll handler to catch up.
    setMobileStage(stage);
  }

  function showUndo(entry: { leadId: string; from: PipelineStage; to: PipelineStage; name: string }) {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndo(entry);
    undoTimerRef.current = setTimeout(() => setUndo(null), UNDO_MS);
  }

  function handleUndo() {
    if (!undo) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    moveStage(undo.leadId, undo.from);
    setUndo(null);
  }

  const handleDrop = useCallback(
    (leadId: string, fromStage: PipelineStage) => {
      const to = mobileStageRef.current;
      if (to === fromStage) return; // released over the column it started in
      const lead = leadById.get(leadId);
      moveStage(leadId, to);
      showUndo({ leadId, from: fromStage, to, name: lead?.full_name ?? "Lead" });
    },
    [moveStage, leadById],
  );

  const { bind, drag } = useTouchDrag({
    scroller: scrollerRef,
    onDrop: handleDrop,
    enabled: !movePending,
  });

  return (
    <div className="lg:hidden">
      <div className="bg-brand px-5 pt-3.5 pb-4 text-white">
        <div className="text-base font-bold">Sales Pipeline</div>
        <div className="mt-3.5 flex gap-1.5 overflow-x-auto">
          {visibleStages.map((s) => (
            <button
              key={s.value}
              ref={(el) => {
                if (el) chipRefs.current.set(s.value, el);
                else chipRefs.current.delete(s.value);
              }}
              type="button"
              onClick={() => goToStage(s.value)}
              className={
                mobileStage === s.value
                  ? "flex-none rounded-full bg-gold px-3 py-1.5 text-[11.5px] font-bold text-navy"
                  : "flex-none rounded-full bg-white/[.09] px-3 py-1.5 text-[11.5px] font-semibold text-white/75"
              }
            >
              {s.label} {counts[s.value] ?? 0}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 pt-2.5">
        {visibleStages.map((s) => (
          <span
            key={s.value}
            className={`h-[6px] w-[6px] rounded-full ${s.value === mobileStage ? "bg-brand" : "bg-sand-2"}`}
          />
        ))}
        <span className="ml-1 text-[10.5px] font-semibold text-taupe">
          {visibleStages.findIndex((s) => s.value === mobileStage) + 1}/{visibleStages.length}
        </span>
      </div>

      {moveError && (
        <div className="sticky top-0 z-10 mx-5 mt-3 rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
          {moveError}
        </div>
      )}

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visibleStages.map((stage) => {
          const cards = columns[stage.value] ?? [];
          return (
            <section key={stage.value} className="w-full flex-none snap-start snap-always px-5 pt-3 pb-8">
              <div className="flex items-baseline justify-between pb-3">
                <span className="text-[12.5px] font-bold text-navy">
                  {stage.label} · {cards.length} leads
                </span>
                <span className="text-[11.5px] font-semibold text-taupe">
                  {fmtRM(toAnc(stagePotentialValue(stage.value, cards, casedAnc)))} ANC
                  {stageCollected(cards, casedAnc) > 0 && ` · ${fmtRM(stageCollected(cards, casedAnc))} collected`}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {cards.length === 0 && (
                  <p className="py-6 text-center text-[13px] text-muted">No leads in this stage.</p>
                )}
                {cards.map((lead) => (
                  <MobileCard
                    key={lead.id}
                    lead={lead}
                    staleAfterDays={staleAfterDays}
                    movePending={movePending}
                    isDragging={drag?.leadId === lead.id}
                    bindProps={bind(lead.id, stage.value)}
                    onOpenQuotation={() => openQuotation(lead)}
                    onOpenMoveSheet={() => setMoveSheetLead(lead)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {drag && (
        <>
          <div className="pointer-events-none fixed inset-x-4 top-3 z-30 rounded-[12px] bg-brand px-4 py-2.5 text-center text-[12.5px] font-bold text-white shadow-elevated">
            Drop to move to <span className="text-gold">{labelFor(mobileStage)}</span>
          </div>
          <div
            aria-hidden
            className="pointer-events-none fixed left-0 top-0 z-30 w-[210px] rounded-2xl bg-white p-3 shadow-elevated ring-2 ring-gold"
            style={{ transform: `translate3d(${drag.x + 14}px, ${drag.y - 28}px, 0)` }}
          >
            <div className="truncate text-[12.5px] font-bold text-navy">{drag.label || "Moving lead…"}</div>
          </div>
        </>
      )}

      {/* A rejected move already bounced the card back and says why in the
          error toast -- offering to "undo" it as well would contradict that. */}
      {undo && !moveError && (
        <div className="fixed inset-x-4 bottom-[76px] z-20 flex items-center justify-between gap-3 rounded-[12px] bg-brand px-4 py-3 text-[12.5px] font-semibold text-white shadow-elevated">
          <span className="truncate">Moved to {labelFor(undo.to)}</span>
          <button type="button" onClick={handleUndo} className="flex-none font-bold text-gold">
            Undo
          </button>
        </div>
      )}

      {moveSheetLead && (
        <MoveSheet
          name={moveSheetLead.full_name}
          fromStage={moveSheetLead.pipeline_stage as PipelineStage}
          stages={stages}
          counts={counts}
          onMove={(s) => moveStage(moveSheetLead.id, s)}
          onClose={() => setMoveSheetLead(null)}
        />
      )}
    </div>
  );
}

function MobileCard({
  lead,
  staleAfterDays,
  movePending,
  isDragging,
  bindProps,
  onOpenQuotation,
  onOpenMoveSheet,
}: {
  lead: PipelineLead;
  staleAfterDays: number;
  movePending: boolean;
  isDragging: boolean;
  bindProps: { onTouchStart: (e: React.TouchEvent) => void };
  onOpenQuotation: () => void;
  onOpenMoveSheet: () => void;
}) {
  const tag = productTag(lead.interest);
  const potential = leadPotentialAnc(lead.quotations);
  const staleDays = daysSinceLastActivity(lead);
  const stale = staleDays >= staleAfterDays;

  return (
    <div
      {...bindProps}
      data-label={`${lead.full_name} · ${lead.phone}`}
      className={
        "select-none rounded-[16px] border border-sand-3 bg-white p-2.5 transition-transform [-webkit-touch-callout:none] " +
        (isDragging ? "scale-[.98] opacity-40" : "")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <LeadNo no={lead.lead_no} />
            <Link href={`/leads/${lead.id}`} className="truncate text-[14.5px] font-bold text-navy">
              {lead.full_name}
            </Link>
          </div>
          <div className="mt-0.5 text-xs font-medium text-muted-2">{lead.phone}</div>
        </div>
        {stale && (
          <span className="flex-none rounded-[6px] bg-alert-red-bg px-[7px] py-1 text-[9.5px] font-bold text-alert-red">
            STALE {staleDays}d
          </span>
        )}
      </div>
      {(tag || potential) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {tag && <span className={`rounded-[6px] px-[7px] py-[2px] text-[9.5px] font-bold ${tag.cls}`}>{tag.label}</span>}
          <AncBadge potential={potential} />
        </div>
      )}
      {isToday(lead.follow_up_date) && (
        <div className="mt-2 rounded-[10px] border border-[#f7e9c2] bg-warn-gold-bg px-2.5 py-1.5 text-[11.5px] font-semibold text-warn-gold-text">
          Callback today
        </div>
      )}
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <a href={`tel:${lead.phone}`} className="flex h-11 items-center justify-center rounded-[11px] bg-brand" aria-label="Call">
          <PhoneIcon width={15} height={15} className="text-gold" />
        </a>
        <a href={waLink(lead.phone)} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center rounded-[11px] bg-green" aria-label="WhatsApp">
          <WhatsAppIcon width={16} height={16} fill="#fff" />
        </a>
        <button type="button" onClick={onOpenQuotation} className="flex h-11 items-center justify-center rounded-[11px] border border-[#f0dfb4] bg-warn-gold-bg" aria-label="Quotation estimate">
          <QuotationIcon width={15} height={15} className="text-warn-gold-text" />
        </button>
        <button
          type="button"
          onClick={onOpenMoveSheet}
          disabled={movePending}
          className="flex h-11 flex-col items-center justify-center gap-0.5 rounded-[11px] border border-sand-2 bg-cream disabled:opacity-50"
          aria-label="Move to another stage"
        >
          <MoveGlyph width={13} height={13} className="text-navy" />
          <span className="text-[8px] font-bold text-navy">Move</span>
        </button>
      </div>
    </div>
  );
}
