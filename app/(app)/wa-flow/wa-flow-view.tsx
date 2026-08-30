"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CurrentProfile } from "@/lib/profile-types";
import { CATEGORIES, type WaTemplate, type LeadForFill } from "./types";
import { deleteTemplate, bumpUsage } from "./actions";
import { waLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/icons";
import { EmptyState } from "@/components/empty-state";
import { WaFlowIcon } from "@/components/icons";
import { TemplateModal } from "./template-modal";

function fillTemplate(body: string, values: Record<string, string>) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => values[key] ?? match);
}

function primaryPlan(lead: LeadForFill | null) {
  const q = lead?.quotations[0];
  if (!q || q.quotation_plans.length === 0) return null;
  return [...q.quotation_plans].sort((a, b) => a.sort_order - b.sort_order)[0];
}

const PRODUCT_LABEL: Record<string, string> = {
  imedi_evolusi: "i-Medi Evolusi",
  hibah_nova: "Hibah i-Great Nova",
  hibah_chinta: "Hibah i-Great Chinta",
  hibah_mixed: "Hibah (mixed)",
};

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
  const [category, setCategory] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WaTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // "Manage templates" is SuperAdmin/Group Manager only per Section 3's
  // permission matrix -- Unit Manager and Agent both only "Use templates".
  const canManage = profile.role === "superadmin" || profile.role === "group_manager";

  const plan = primaryPlan(lead);
  const q = lead?.quotations[0];
  const fillValues: Record<string, string> = lead
    ? {
        tokNama: lead.full_name,
        tokAgent: profile.full_name,
        tokProduk: q ? PRODUCT_LABEL[q.product] ?? q.product : "",
        tokCaruman: plan?.monthly_contribution != null ? String(plan.monthly_contribution) : "",
        tokHad: plan
          ? String(
              (plan.coverage_detail as Record<string, unknown>)?.annual_limit ??
                (plan.coverage_detail as Record<string, unknown>)?.sum_covered ??
                "",
            )
          : "",
      }
    : {};

  const filtered = useMemo(
    () => (category === "all" ? templates : templates.filter((t) => t.category === category)),
    [templates, category],
  );

  async function handleCopy(t: WaTemplate) {
    const text = lead ? fillTemplate(t.body, fillValues) : t.body;
    await navigator.clipboard.writeText(text.replace(/<br\s*\/?>/g, "\n"));
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
    const text = fillTemplate(t.body, fillValues).replace(/<br\s*\/?>/g, "\n");
    window.open(waLink(lead.phone, text), "_blank");
    try {
      await bumpUsage(t.id);
      router.refresh();
    } catch {
      // intentionally ignored -- the WA send already happened above
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      const result = await deleteTemplate(id);
      if (result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
    } catch {
      alert("Couldn't connect. Check your internet connection and try again.");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 border-b border-sand bg-white px-5 lg:px-[30px] py-5">
        <div>
          <div className="flex items-center gap-2.5">
            <WhatsAppIcon width={20} height={20} className="text-green" />
            <div className="text-[22px] font-extrabold tracking-[-0.02em] text-navy">WhatsApp Flow</div>
          </div>
          <div className="mt-[3px] text-[13px] font-medium text-muted">
            {lead ? `Filling for ${lead.full_name}` : "Save and reuse WhatsApp reply templates"}
          </div>
        </div>
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
        {filtered.length === 0 ? (
          <EmptyState
            icon={<WaFlowIcon width={28} height={28} className="text-green" />}
            title={templates.length === 0 ? "No templates yet" : "No templates in this category"}
            description={
              canManage
                ? "Add a template so your team can reuse it on WhatsApp."
                : "Ask a unit manager to add templates for this category."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => {
              const meta = CATEGORIES.find((c) => c.value === t.category);
              const isQuotation = t.category === "product_info";
              const preview = lead ? fillTemplate(t.body, fillValues) : t.body;
              return (
                <div key={t.id} className="rounded-[18px] border border-sand bg-white p-[18px] shadow-card">
                  <div className="flex items-start justify-between gap-2.5">
                    <div>
                      <div className="text-[15px] font-bold text-navy">{t.title}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={`rounded-[6px] px-2 py-[3px] text-[10px] font-bold ${meta?.cls ?? "bg-sand-3 text-taupe-2"}`}>
                          {meta?.label ?? t.category}
                        </span>
                        <span className="text-[11px] font-semibold text-taupe">
                          {t.language} · {t.usage_count === 0 ? "New" : `Used ${t.usage_count}×`}
                        </span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex flex-none gap-1.5">
                        <button type="button" onClick={() => { setEditing(t); setModalOpen(true); }} aria-label="Edit template" className="flex h-8 w-8 items-center justify-center rounded-lg text-taupe hover:text-navy">
                          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                            <path d="M11 4h-5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
                            <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
                          </svg>
                        </button>
                        <button type="button" onClick={() => handleDelete(t.id)} aria-label="Delete template" className="flex h-8 w-8 items-center justify-center rounded-lg text-taupe hover:text-alert-red">
                          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  <div
                    className="mt-3.5 min-h-[148px] rounded-xl border border-[#dbeee2] bg-[#f4faf6] p-3.5 font-mono text-[11.5px] leading-[1.75] whitespace-pre-wrap text-[#2f4a3c]"
                  >
                    {preview.replace(/<br\s*\/?>/g, "\n")}
                  </div>

                  <div className="mt-3.5 flex gap-2">
                    {!lead && (
                      <span
                        title="Open this page from a lead to fill in real details"
                        className="flex h-10 flex-none cursor-not-allowed items-center rounded-[11px] border border-sand-2 bg-cream px-[15px] text-[12.5px] font-semibold text-taupe-2"
                      >
                        {isQuotation ? "Auto-fill" : "Fill Name"}
                      </span>
                    )}
                    {isQuotation && lead ? (
                      <button
                        type="button"
                        onClick={() => handleSend(t)}
                        className="flex h-10 flex-1 items-center justify-center gap-[7px] rounded-[11px] bg-green text-[12.5px] font-semibold text-white"
                      >
                        <WhatsAppIcon width={14} height={14} fill="#fff" />
                        Send
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCopy(t)}
                        className="flex h-10 flex-1 items-center justify-center gap-[7px] rounded-[11px] bg-green text-[12.5px] font-semibold text-white"
                      >
                        {copiedId === t.id ? "Copied!" : "Copy"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
