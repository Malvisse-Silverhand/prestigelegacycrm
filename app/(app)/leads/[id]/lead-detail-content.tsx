"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CurrentProfile } from "@/lib/profile-types";
import type { LeadDetail, ActivityRow } from "./data";
import { waLink } from "@/lib/whatsapp";
import { PhoneIcon, WaFlowIcon, QuotationIcon, ChevronDownIcon, CheckIcon, AlertIcon, ClockIcon } from "@/components/icons";
import { addNote, reassignLead, updateStage } from "./actions";
import { STAGES as STAGE_OPTIONS } from "@/lib/pipeline-stages";
import { quoteLauncherUrl } from "@/lib/quote-launcher";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function productTag(lead: LeadDetail) {
  const text = `${lead.lead_source ?? ""} ${lead.interest ?? ""}`.toLowerCase();
  if (text.includes("medical")) return "MEDICAL";
  if (text.includes("hibah")) return "HIBAH";
  return null;
}

function activityIcon(type: string) {
  switch (type) {
    case "wa_sent":
      return { bg: "bg-success-bg", node: <WaFlowIcon width={14} height={14} className="text-green" fill="currentColor" /> };
    case "assigned":
      return { bg: "bg-info-blue-bg", node: <CheckIcon width={14} height={14} className="text-info-blue-text" /> };
    case "stage_change":
      return { bg: "bg-warn-gold-bg", node: <ClockIcon width={14} height={14} className="text-warn-gold-text" /> };
    case "created":
      return { bg: "bg-sand-3", node: <span className="text-[14px] leading-none text-muted-2">+</span> };
    case "quotation_created":
      return { bg: "bg-info-blue-bg", node: <QuotationIcon width={14} height={14} className="text-info-blue-text" /> };
    default:
      return { bg: "bg-warn-gold-bg", node: <AlertIcon width={14} height={14} className="text-warn-gold-text" /> };
  }
}

export function LeadDetailContent({
  lead,
  activity,
  profile,
  reassignAgents,
  onClose,
  isModal,
}: {
  lead: LeadDetail;
  activity: ActivityRow[];
  profile: CurrentProfile;
  reassignAgents: { id: string; full_name: string }[];
  onClose?: () => void;
  isModal?: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const canEditStage =
    profile.role === "unit_manager" || (profile.role === "agent" && lead.agent_id === profile.id);
  const canReassign = profile.role === "unit_manager";

  // The quotation calculators open in a new tab (no CRM JS runs there) and
  // fan out to capture-quotation on submit -- there's no in-app event to
  // hook for "a quotation just landed." Refetching when this tab regains
  // focus is the simplest way to pick that up, and doubles as a general
  // safety net for any other change made elsewhere while this was open.
  useEffect(() => {
    function onFocus() {
      router.refresh();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  function handleAddNote() {
    if (!note.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await addNote(lead.id, note);
        if (result.error) setError(result.error);
        else {
          setNote("");
          router.refresh();
        }
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  function handleStageChange(value: string) {
    const opt = STAGE_OPTIONS.find((o) => o.value === value);
    if (!opt) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateStage(lead.id, value, opt.label);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  function handleReassign(agentId: string) {
    const agent = reassignAgents.find((a) => a.id === agentId);
    if (!agent) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await reassignLead(lead.id, agentId, agent.full_name);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  const stage = STAGE_OPTIONS.find((o) => o.value === lead.pipeline_stage) ?? STAGE_OPTIONS[0];
  const tag = productTag(lead);
  const initials = lead.full_name.split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();

  return (
    <div className="overflow-hidden rounded-[20px] bg-cream shadow-elevated">
      <div className="flex items-start gap-4 bg-navy p-[26px] text-white">
        <div className="flex h-[50px] w-[50px] flex-none items-center justify-center rounded-[15px] bg-gold text-[17px] font-extrabold text-navy">
          {initials}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xl font-bold tracking-[-0.01em]">{lead.full_name}</div>
            {tag && (
              <span className="rounded-[6px] bg-success-bg px-2 py-[3px] text-[10px] font-bold text-green">
                {tag}
              </span>
            )}
            <span className="rounded-[6px] bg-white/[.12] px-2 py-[3px] text-[10px] font-bold uppercase">
              {stage.label}
            </span>
          </div>
          <div className="mt-1 text-[12.5px] font-medium text-white/60">
            {[lead.phone, lead.email, lead.address].filter(Boolean).join(" · ")}
          </div>
        </div>
        {isModal && (
          <button type="button" onClick={onClose} aria-label="Close" className="text-white/60 hover:text-white">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-sand bg-white p-4">
        <a
          href={`tel:${lead.phone}`}
          className="flex h-11 flex-1 items-center justify-center gap-[7px] rounded-[11px] bg-navy text-[13px] font-semibold text-white"
        >
          <PhoneIcon width={15} height={15} className="text-gold" />
          Call
        </a>
        <a
          href={waLink(lead.phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 flex-1 items-center justify-center gap-[7px] rounded-[11px] bg-green text-[13px] font-semibold text-white"
        >
          WhatsApp
        </a>
        <button
          type="button"
          onClick={() => noteRef.current?.focus()}
          className="h-11 flex-1 rounded-[11px] border border-sand-2 bg-white text-[13px] font-semibold text-navy"
        >
          Add note
        </button>
        {canReassign && (
          <div className="relative flex-1">
            <select
              defaultValue=""
              onChange={(e) => e.target.value && handleReassign(e.target.value)}
              className="h-11 w-full appearance-none rounded-[11px] bg-gold px-3 text-[13px] font-bold text-navy"
            >
              <option value="" disabled>Reassign</option>
              {reassignAgents.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-sand bg-cream px-4 py-3">
        <a
          href={quoteLauncherUrl("imedi-evolusi-quote.html", lead)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 flex-1 items-center justify-center gap-[7px] rounded-[10px] border border-sand-2 bg-white text-[12.5px] font-semibold text-navy"
        >
          <QuotationIcon width={14} height={14} className="text-green" />
          Buat Quotation Medical Card
        </a>
        <a
          href={quoteLauncherUrl("quickquote-hibah-life-takaful.html", lead)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 flex-1 items-center justify-center gap-[7px] rounded-[10px] border border-sand-2 bg-white text-[12.5px] font-semibold text-navy"
        >
          <QuotationIcon width={14} height={14} className="text-info-blue-text" />
          Buat Quotation Hibah
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_268px]">
        <div className="max-h-[60vh] overflow-y-auto p-[26px]">
          <div className="flex items-center justify-between">
            <div className="text-[14.5px] font-bold text-navy">Activity timeline</div>
          </div>

          <div className="mt-[18px] flex flex-col">
            {activity.length === 0 && (
              <p className="pb-4 text-[13px] text-muted">No activity logged yet.</p>
            )}
            {activity.map((a, i) => {
              const meta = activityIcon(a.activity_type);
              const isLast = i === activity.length - 1;
              return (
                <div key={a.id} className="flex gap-[14px]">
                  <div className="flex flex-none flex-col items-center">
                    <div className={`flex h-[30px] w-[30px] items-center justify-center rounded-[10px] ${meta.bg}`}>
                      {meta.node}
                    </div>
                    {!isLast && <div className="my-1.5 w-[2px] flex-1 bg-sand" />}
                  </div>
                  <div className={`flex-1 ${isLast ? "" : "pb-5"}`}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13.5px] font-semibold text-navy">
                        {activityLabel(a)}
                      </span>
                      <span className="text-[11.5px] font-medium text-taupe">
                        {a.profiles?.full_name ?? "System"} · {timeAgo(a.created_at)}
                      </span>
                    </div>
                    {a.activity_type === "note" && a.content && (
                      <div className="mt-2 rounded-xl border border-sand bg-white p-3.5 text-[13px] leading-relaxed text-ink">
                        {a.content}
                      </div>
                    )}
                    {a.activity_type !== "note" && a.content && (
                      <div className="mt-1 text-[12.5px] font-medium text-muted-2">{a.content}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-[22px] flex flex-col gap-2 rounded-[13px] border border-sand-2 bg-white p-3.5">
            <textarea
              ref={noteRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this lead…"
              rows={2}
              className="resize-none bg-transparent text-[13px] text-navy outline-none placeholder:text-taupe"
            />
            {error && <p className="text-[12px] font-medium text-alert-red">{error}</p>}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddNote}
                disabled={pending || !note.trim()}
                className="rounded-[9px] bg-navy px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[18px] border-t border-sand bg-white p-[22px] lg:border-l lg:border-t-0">
          <div>
            <div className="text-[10.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">
              Pipeline stage
            </div>
            <div className="relative mt-2">
              <select
                value={lead.pipeline_stage}
                disabled={!canEditStage}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full appearance-none rounded-[10px] border border-sand-2 bg-cream py-[10px] pr-8 pl-3 text-[13px] font-semibold text-navy disabled:opacity-70"
              >
                {STAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {canEditStage && (
                <ChevronDownIcon width={14} height={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy" />
              )}
            </div>
          </div>

          <div>
            <div className="text-[10.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">
              Owner
            </div>
            <div className="mt-2 flex items-center gap-[9px]">
              <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-navy text-[11px] font-bold text-gold">
                {lead.profiles?.full_name.split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase() ?? "—"}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-navy">
                  {lead.profiles?.full_name ?? "Unassigned"}
                </div>
                <div className="text-[11px] font-medium text-taupe">
                  {lead.profiles?.units?.name ?? "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-sand-3" />

          <div className="flex flex-col gap-[13px]">
            <Detail label="Source" value={lead.lead_source} />
            <Detail label="Interest" value={lead.interest} />
            <Detail label="Budget indicated" value={lead.budget_indicated} />
            <Detail label="Best time to reach" value={lead.best_time_to_reach} />
            <Detail
              label="Created"
              value={new Date(lead.created_at).toLocaleString("en-MY", {
                day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function activityLabel(a: ActivityRow) {
  switch (a.activity_type) {
    case "wa_sent": return "WhatsApp sent";
    case "assigned": return a.content ?? "Reassigned";
    case "stage_change": return a.content ?? "Stage changed";
    case "created": return "Lead created";
    case "quotation_created": return a.content ?? "Quotation created";
    default: return "Note added";
  }
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">{label}</div>
      <div className="mt-[3px] text-[13px] font-semibold text-navy">{value || "—"}</div>
    </div>
  );
}
