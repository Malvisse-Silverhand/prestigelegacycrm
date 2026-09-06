"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CurrentProfile } from "@/lib/profile-types";
import { CATEGORIES, type WaTemplate, type LeadForFill } from "./types";
import { deleteTemplate, bumpUsage } from "./actions";
import { waLink } from "@/lib/whatsapp";
import { fillValuesFor, fillTemplate, toMessageText } from "@/lib/wa-template-fill";
import { WhatsAppIcon, TableIcon, PipelineIcon } from "@/components/icons";
import { EmptyState } from "@/components/empty-state";
import { WaFlowIcon } from "@/components/icons";
import { TemplateModal } from "./template-modal";

type View = "kanban" | "table";

const EditIcon = (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M11 4h-5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
  </svg>
);
const TrashIcon = (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </svg>
);

export function WaFlowView({
  templates,
  profile,
  lead,
}: {
  templates: WaTemplate[];
  profile: CurrentProfile;
  lead: LeadForFill | null;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("kanban");
  const [category, setCategory] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WaTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // "Manage templates" is SuperAdmin/Group Manager only per Section 3's
  // permission matrix -- Unit Manager and Agent both only "Use templates".
  const canManage = profile.role === "superadmin" || profile.role === "group_manager";

  const fillValues = useMemo(() => fillValuesFor(lead, profile.full_name), [lead, profile.full_name]);

  const filtered = useMemo(
    () => (category === "all" ? templates : templates.filter((t) => t.category === category)),
    [templates, category],
  );

  // One column per category, in CATEGORIES order. "Other" is only drawn when
  // something is actually in it, so the board shows the seven real lanes
  // unless a template still carries the legacy bucket.
  const columns = useMemo(() => {
    const source = category === "all" ? templates : filtered;
    return CATEGORIES.map((c) => ({
      ...c,
      items: source.filter((t) => t.category === c.value),
    })).filter((c) => c.value !== "other" || c.items.length > 0);
  }, [templates, filtered, category]);

  async function handleCopy(t: WaTemplate) {
    const text = lead ? toMessageText(t.body, fillValues) : t.body.replace(/<br\s*\/?>/g, "\n");
    await navigator.clipboard.writeText(text);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 1500);
    // Best-effort usage counter -- the copy itself already succeeded above,
    // so a network failure here shouldn't surface as if the user's action
    // failed. Swallow it (already logged server-side if it's a real error).
    try {
      await bumpUsage(t.id);
      router.refresh();
    } catch {
      // intentionally ignored
    }
  }

  async function handleSend(t: WaTemplate) {
    if (!lead) return;
    window.open(waLink(lead.phone, toMessageText(t.body, fillValues)), "_blank");
    try {
      await bumpUsage(t.id);
      router.refresh();
    } catch {
      // intentionally ignored -- the WA send already happened above
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    setDeletingId(id);
    try {
      const result = await deleteTemplate(id);
      if (result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
    } catch {
      alert("Couldn't connect. Check your internet connection and try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const previewOf = (t: WaTemplate) =>
    (lead ? fillTemplate(t.body, fillValues) : t.body).replace(/<br\s*\/?>/g, "\n");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sand bg-white px-5 lg:px-[30px] py-5">
        <div>
          <div className="flex items-center gap-2.5">
            <WhatsAppIcon width={20} height={20} className="text-green" />
            <div className="text-[22px] font-extrabold tracking-[-0.02em] text-navy">WhatsApp Flow</div>
          </div>
          <div className="mt-[3px] text-[13px] font-medium text-muted">
            {lead ? `Filling for ${lead.full_name}` : "Save and reuse WhatsApp reply templates"}
          </div>
        </div>
        <div className="flex flex-none items-center gap-2.5">
          <ViewToggle view={view} onChange={setView} />
          {canManage && (
            <button
              type="button"
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className="flex items-center gap-2 rounded-[11px] bg-navy px-[17px] py-3 text-[13px] font-semibold text-white"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth={2.4} strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Template
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-5 lg:px-[30px] pt-[18px]">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={category === "all" ? "rounded-full bg-navy px-4 py-2 text-[12.5px] font-semibold text-white" : "rounded-full bg-info-blue-bg px-4 py-2 text-[12.5px] font-semibold text-info-blue-text"}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`rounded-full px-4 py-2 text-[12.5px] font-semibold ${category === c.value ? "bg-navy text-white" : c.cls}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="px-5 lg:px-[30px] py-[18px] pb-[30px]">
        {templates.length === 0 || filtered.length === 0 ? (
          <EmptyState
            icon={<WaFlowIcon width={28} height={28} className="text-green" />}
            title={templates.length === 0 ? "No templates yet" : "No templates in this category"}
            description={
              canManage
                ? "Add a template so your team can reuse it on WhatsApp."
                : "Ask a unit manager to add templates for this category."
            }
          />
        ) : view === "kanban" ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {columns.map((c) => (
              <div key={c.value} className="flex w-[290px] flex-none flex-col rounded-[16px] bg-sand-3/60 p-2.5">
                <div className="flex items-center gap-2 px-1.5 pb-2.5">
                  <span className="h-[9px] w-[9px] flex-none rounded-[3px]" style={{ background: c.dot }} />
                  <span className="flex-1 text-[11.5px] font-bold uppercase tracking-[0.05em] text-navy">
                    {c.label}
                  </span>
                  <span className="text-[11px] font-bold text-taupe">{c.items.length}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {c.items.length === 0 ? (
                    <p className="rounded-[12px] border border-dashed border-sand-2 px-3 py-5 text-center text-[11.5px] font-medium text-taupe">
                      No templates here
                    </p>
                  ) : (
                    c.items.map((t) => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        preview={previewOf(t)}
                        lead={lead}
                        canManage={canManage}
                        copied={copiedId === t.id}
                        deleting={deletingId === t.id}
                        onCopy={() => handleCopy(t)}
                        onSend={() => handleSend(t)}
                        onEdit={() => { setEditing(t); setModalOpen(true); }}
                        onDelete={() => handleDelete(t.id)}
                        compact
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[16px] border border-sand bg-white">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-sand bg-cream text-left">
                  <Th>Template</Th>
                  <Th>Category</Th>
                  <Th>Language</Th>
                  <Th>Used</Th>
                  <Th>Message</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const meta = CATEGORIES.find((c) => c.value === t.category);
                  return (
                    <tr key={t.id} className="border-b border-sand-3 last:border-b-0 align-top">
                      <td className="px-3.5 py-3 text-[13px] font-bold text-navy">{t.title}</td>
                      <td className="px-3.5 py-3">
                        <span className={`rounded-[6px] px-2 py-[3px] text-[10px] font-bold ${meta?.cls ?? "bg-sand-3 text-taupe-2"}`}>
                          {meta?.label ?? t.category}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-[12px] font-semibold text-taupe">{t.language}</td>
                      <td className="px-3.5 py-3 text-[12px] font-semibold text-taupe">
                        {t.usage_count === 0 ? "New" : `${t.usage_count}×`}
                      </td>
                      <td className="max-w-[320px] px-3.5 py-3 text-[11.5px] leading-relaxed text-muted">
                        <span className="line-clamp-3 whitespace-pre-wrap">{previewOf(t)}</span>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {lead && t.category === "product_info" ? (
                            <button
                              type="button"
                              onClick={() => handleSend(t)}
                              className="rounded-[9px] bg-green px-3 py-2 text-[11.5px] font-semibold text-white"
                            >
                              Send
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleCopy(t)}
                              className="rounded-[9px] bg-green px-3 py-2 text-[11.5px] font-semibold text-white"
                            >
                              {copiedId === t.id ? "Copied!" : "Copy"}
                            </button>
                          )}
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => { setEditing(t); setModalOpen(true); }}
                                aria-label="Edit template"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-taupe hover:text-navy"
                              >
                                {EditIcon}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(t.id)}
                                disabled={deletingId === t.id}
                                aria-label="Delete template"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-taupe hover:text-alert-red disabled:opacity-50"
                              >
                                {TrashIcon}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canManage && (
        <TemplateModal
          open={modalOpen}
          template={editing}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3.5 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-taupe-2">
      {children}
    </th>
  );
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="flex rounded-[10px] border border-sand-2 bg-cream p-[3px]">
      {([
        { value: "kanban" as const, label: "Kanban", icon: PipelineIcon },
        { value: "table" as const, label: "Table", icon: TableIcon },
      ]).map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`flex items-center gap-1.5 rounded-[7px] px-3 py-2 text-[12px] font-bold ${
            view === value ? "bg-navy text-white" : "text-taupe"
          }`}
        >
          <Icon width={14} height={14} />
          {label}
        </button>
      ))}
    </div>
  );
}

export function TemplateCard({
  template, preview, lead, canManage, copied, deleting, onCopy, onSend, onEdit, onDelete, compact,
}: {
  template: WaTemplate;
  preview: string;
  lead: LeadForFill | null;
  canManage: boolean;
  copied: boolean;
  deleting: boolean;
  onCopy: () => void;
  onSend: () => void;
  onEdit: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  const meta = CATEGORIES.find((c) => c.value === template.category);
  const isQuotation = template.category === "product_info";

  return (
    <div className="rounded-[14px] border border-sand bg-white p-3.5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13.5px] font-bold text-navy">{template.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-[6px] px-2 py-[2px] text-[9.5px] font-bold ${meta?.cls ?? "bg-sand-3 text-taupe-2"}`}>
              {meta?.label ?? template.category}
            </span>
            <span className="text-[10.5px] font-semibold text-taupe">
              {template.language} · {template.usage_count === 0 ? "New" : `Used ${template.usage_count}×`}
            </span>
          </div>
        </div>
        {canManage && (
          <div className="flex flex-none gap-0.5">
            <button type="button" onClick={onEdit} aria-label="Edit template" className="flex h-7 w-7 items-center justify-center rounded-lg text-taupe hover:text-navy">
              {EditIcon}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              aria-label="Delete template"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-taupe hover:text-alert-red disabled:opacity-50"
            >
              {TrashIcon}
            </button>
          </div>
        )}
      </div>

      <div
        className={`mt-2.5 overflow-y-auto rounded-[10px] border border-[#dbeee2] bg-[#f4faf6] p-3 font-mono text-[11px] leading-[1.7] whitespace-pre-wrap text-[#2f4a3c] ${
          compact ? "max-h-[168px]" : "min-h-[130px]"
        }`}
      >
        {preview}
      </div>

      <div className="mt-2.5 flex gap-2">
        {!lead && (
          <span
            title="Open this from a lead to fill in real details"
            className="flex h-9 flex-none cursor-not-allowed items-center rounded-[10px] border border-sand-2 bg-cream px-3 text-[11.5px] font-semibold text-taupe-2"
          >
            {isQuotation ? "Auto-fill" : "Fill Name"}
          </span>
        )}
        {isQuotation && lead ? (
          <button
            type="button"
            onClick={onSend}
            className="flex h-9 flex-1 items-center justify-center gap-[6px] rounded-[10px] bg-green text-[12px] font-semibold text-white"
          >
            <WhatsAppIcon width={13} height={13} fill="#fff" />
            Send
          </button>
        ) : (
          <button
            type="button"
            onClick={onCopy}
            className="flex h-9 flex-1 items-center justify-center gap-[6px] rounded-[10px] bg-green text-[12px] font-semibold text-white"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}
