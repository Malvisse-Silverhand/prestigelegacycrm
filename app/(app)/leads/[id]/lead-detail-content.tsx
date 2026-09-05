"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CurrentProfile } from "@/lib/profile-types";
import type { LeadDetail, ActivityRow, ReassignOption } from "./data";
import { waLink } from "@/lib/whatsapp";
import { productTag } from "@/lib/product-interest";
import { LEAD_SOURCES, OCCUPATION_CLASSES } from "@/lib/lead-constants";
import { ageNextBirthday } from "@/lib/age";
import { PhoneIcon, WaFlowIcon, QuotationIcon, ChevronDownIcon, CheckIcon, AlertIcon, ClockIcon } from "@/components/icons";
import { addNote, reassignLead, updateStage, updateSource } from "./actions";
import { STAGES as STAGE_OPTIONS } from "@/lib/pipeline-stages";
import { InterestDropdown } from "./interest-dropdown";
import { LeadQuotations } from "./lead-quotations";
import { EditLeadModal } from "../edit-lead-modal";
import { QuotationModal } from "@/components/quotation-modal";
import { quoteLauncherUrl } from "@/lib/quote-launcher";
import type { QuotationRow } from "./data";

const NEW_THRESHOLD_MS = 48 * 3600000;

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function genderSmokerLabel(lead: LeadDetail) {
  const gender = lead.gender === "male" ? "Male" : lead.gender === "female" ? "Female" : "—";
  const smoker = lead.is_smoker === true ? "Smoker" : lead.is_smoker === false ? "Non-smoker" : "Unknown";
  return `${gender} · ${smoker}`;
}

function occupationClassLabel(value: string | null) {
  return OCCUPATION_CLASSES.find((o) => o.value === value)?.label ?? null;
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

const editPencil = (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
  </svg>
);

// lead_activity has no quotation_id column, so a timeline row is matched to
// its quotation by timestamp: capture-quotation writes the activity entry and
// bumps the quotation's updated_at in the same request, milliseconds apart --
// on a resave too, since that's an upsert onto the existing row rather than a
// new one. The 2-minute window keeps that reliable while refusing to guess
// when nothing sits near it.
function quotationForActivity(a: ActivityRow, quotations: QuotationRow[]) {
  const at = new Date(a.created_at).getTime();
  let best: QuotationRow | null = null;
  let bestGap = Infinity;
  for (const q of quotations) {
    const gap = Math.abs(new Date(q.updated_at).getTime() - at);
    if (gap < bestGap) {
      bestGap = gap;
      best = q;
    }
  }
  return bestGap <= 120000 ? best : null;
}

export function LeadDetailContent({
  lead,
  activity,
  quotations,
  profile,
  reassignOptions,
  onClose,
  isModal,
}: {
  lead: LeadDetail;
  activity: ActivityRow[];
  quotations: QuotationRow[];
  profile: CurrentProfile;
  reassignOptions: ReassignOption[];
  onClose?: () => void;
  isModal?: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [quoteTool, setQuoteTool] = useState<{ url: string; title: string } | null>(null);

  // Passing quotation_id puts the customizer in reopen mode; without it the
  // tool just prefills from the lead and starts a fresh comparison.
  function openCustomizer(quotationId?: string) {
    const base = quoteLauncherUrl("quotation-customizer.html", lead);
    setQuoteTool({
      url: quotationId ? `${base}&quotation_id=${quotationId}` : base,
      title: `Quotation Customizer — ${lead.full_name}`,
    });
  }

  // A saved quotation reopens in whichever tool produced it. Calculator
  // quotations go back to their own calculator, which re-renders the full
  // benefits breakdown from the lead's details -- the customizer could only
  // ever show a blank sheet for those, since they don't store editor state.
  // preview=1 makes that calculator auto-run, so this lands on the finished
  // quotation rather than on a form the agent has to submit again.
  function openQuotation(q: QuotationRow) {
    if (q.raw_payload?.__customizer) {
      openCustomizer(q.id);
      return;
    }
    const isHibah = q.product.startsWith("hibah");
    const tool = isHibah ? "quickquote-hibah-life-takaful.html" : "imedi-evolusi-quote.html";
    setQuoteTool({
      url: `${quoteLauncherUrl(tool, lead)}&preview=1`,
      title: `${isHibah ? "Hibah" : "Medical Card"} quotation — ${lead.full_name}`,
    });
  }
  // Date.now() is impure -- calling it straight in the render body would
  // violate component purity. A useState lazy initializer is the idiomatic
  // escape hatch for one-time impure work: it runs once (not on every
  // render), unlike a plain body call.
  const [isNewLead] = useState(() => Date.now() - new Date(lead.created_at).getTime() < NEW_THRESHOLD_MS);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Mirrors the `leads` UPDATE RLS policies. This was originally
  // unit_manager/owning-agent only because group_manager and superadmin
  // genuinely had no leads UPDATE policy back then -- showing them a live
  // control would have silently no-op'd. 20260828150000_section2_rls_fixes
  // added policies for both, so the gate is just stale. A manager only ever
  // reaches a lead their matching SELECT policy already scoped to them, so
  // role alone is enough for them; an agent must additionally own the row.
  const canEditStage = profile.role === "agent" ? lead.agent_id === profile.id : true;
  // Same "at or below the viewer's level" scope as reassignOptions itself --
  // an agent has no subordinates so gets no picker at all.
  const canReassign = profile.role !== "agent";

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
    const agent = reassignOptions.find((a) => a.id === agentId);
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

  function handleSourceChange(value: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateSource(lead.id, value);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  const tag = productTag(lead.interest);
  const initials = lead.full_name.split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  const dobValue = lead.date_of_birth
    ? `${fmtDate(lead.date_of_birth)} · ANB ${ageNextBirthday(lead.date_of_birth)}`
    : null;

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
              <span className={`rounded-[6px] px-2 py-[3px] text-[10px] font-bold ${tag.cls}`}>{tag.label}</span>
            )}
            {isNewLead && (
              <span className="rounded-[6px] bg-gold px-2 py-[3px] text-[10px] font-bold text-navy">NEW</span>
            )}
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_268px]">
        <div className="max-h-[70vh] overflow-y-auto p-[26px]">
          <div className="rounded-[16px] border border-sand bg-white p-[18px]">
            <div className="flex items-center justify-between">
              <div className="text-[14.5px] font-bold text-navy">Lead details</div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-[9px] bg-gold px-3.5 py-2 text-[12px] font-bold text-navy shadow-sm hover:brightness-95"
              >
                {editPencil}
                Edit
              </button>
            </div>

            <div className="mt-[16px] grid grid-cols-1 gap-x-5 gap-y-[14px] sm:grid-cols-2">
              <Detail label="Full name" value={lead.full_name} />
              <Detail label="Phone / WhatsApp" value={lead.phone} />
              <Detail label="Email" value={lead.email} />
              <Detail label="Date of birth" value={dobValue} />
              <Detail label="Gender · smoker status" value={genderSmokerLabel(lead)} />
              <Detail label="Occupation" value={lead.occupation} />
              <Detail label="Occupation class" value={occupationClassLabel(lead.occupation_class)} />
              <Detail label="Location" value={lead.address ?? lead.state} />
              <InterestDropdown lead={lead} />
              <Detail label="Source" value={lead.lead_source} />
              <Detail label="Assigned agent" value={lead.profiles?.full_name ?? "Unassigned"} />
              <Detail label="Monthly budget" value={lead.budget_indicated ? `RM ${lead.budget_indicated}` : null} />
              <Detail
                label="Created"
                value={new Date(lead.created_at).toLocaleString("en-MY", {
                  day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
                })}
              />
            </div>

            {/* Quotation Customizer sits directly under Product Interest, which
                is what decides the plan family it opens on. */}
            <div className="mt-4 border-t border-sand-3 pt-3.5">
              <button
                type="button"
                onClick={() => openCustomizer()}
                className="flex items-center gap-2 rounded-[10px] border border-[#f0dfb4] bg-warn-gold-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-warn-gold-text"
              >
                <QuotationIcon width={14} height={14} />
                Open Quotation Customizer
              </button>
              <p className="mt-1.5 text-[11px] font-medium text-taupe">
                Build a side-by-side plan comparison. Saving stores it on this lead.
              </p>
            </div>
          </div>

          <div className="mt-[22px]">
            <LeadQuotations
              quotations={quotations}
              onOpen={openQuotation}
              canDelete={profile.role !== "agent"}
            />
          </div>

          <div className="mt-[22px] flex items-center justify-between">
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
                    {a.activity_type === "quotation_created" && quotationForActivity(a, quotations) && (
                      <button
                        type="button"
                        onClick={() => openQuotation(quotationForActivity(a, quotations)!)}
                        className="mt-1.5 text-[12px] font-semibold text-green underline underline-offset-2"
                      >
                        Open quotation
                      </button>
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
                disabled={!canEditStage || pending}
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
              Lead Assigned
            </div>
            <div className="mt-2 flex items-center gap-[9px]">
              <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[10px] bg-navy text-[11px] font-bold text-gold">
                {lead.profiles?.full_name.split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase() ?? "—"}
              </div>
              <div className="min-w-0 flex-1">
                {canReassign ? (
                  <select
                    value={lead.agent_id ?? ""}
                    disabled={pending}
                    onChange={(e) => e.target.value && handleReassign(e.target.value)}
                    className="w-full rounded-[8px] border border-sand-2 bg-cream px-2 py-[5px] text-[13px] font-semibold text-navy disabled:opacity-70"
                  >
                    <option value="" disabled>Unassigned</option>
                    {reassignOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.full_name}{o.id === profile.id ? " (Self)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="truncate text-[13px] font-semibold text-navy">
                    {lead.profiles?.full_name ?? "Unassigned"}
                  </div>
                )}
                <div className="truncate text-[11px] font-medium text-taupe">
                  {lead.profiles?.units?.name ?? "—"}
                </div>
              </div>
            </div>
            {!lead.agent_id && canReassign && (
              <button
                type="button"
                onClick={() => handleReassign(profile.id)}
                disabled={pending}
                className="mt-1.5 text-[11px] font-semibold text-navy underline decoration-sand-2 underline-offset-2 hover:decoration-navy disabled:opacity-60"
              >
                Assign to me
              </button>
            )}
          </div>

          <div className="h-px bg-sand-3" />

          <div className="flex flex-col gap-[13px]">
            <div>
              <div className="text-[10.5px] font-bold tracking-[0.1em] text-taupe-2 uppercase">Source</div>
              <div className="relative mt-[3px]">
                <select
                  value={lead.lead_source ?? ""}
                  disabled={pending}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  className="w-full appearance-none rounded-[8px] border border-sand-2 bg-cream py-1.5 pr-7 pl-2 text-[13px] font-semibold text-navy disabled:opacity-70"
                >
                  <option value="" disabled>Choose…</option>
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDownIcon width={13} height={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-navy" />
              </div>
            </div>
            <Detail label="Budget indicated" value={lead.budget_indicated ? `RM ${lead.budget_indicated}` : null} />
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

      {editing && <EditLeadModal lead={lead} canDelete={profile.role !== "agent"} onClose={() => setEditing(false)} />}

      <QuotationModal
        url={quoteTool?.url ?? null}
        title={quoteTool?.title ?? ""}
        onClose={() => {
          setQuoteTool(null);
          // A save inside the iframe writes a new quotations row; refetch so
          // the saved-quotations list and timeline pick it up.
          router.refresh();
        }}
      />
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
