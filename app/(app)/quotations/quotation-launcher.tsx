"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuotationModal } from "@/components/quotation-modal";
import { QuotationIcon } from "@/components/icons";

export type LauncherLead = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | null;
  is_smoker: boolean | null;
};

type Tool = { file: string; label: string; hint: string };

const TOOLS: Tool[] = [
  { file: "imedi-evolusi-quote.html", label: "Medical Card estimate", hint: "i-Medi Evolusi calculator" },
  { file: "quickquote-hibah-life-takaful.html", label: "Hibah estimate", hint: "i-Great Nova / Chinta calculator" },
  { file: "quotation-customizer.html", label: "Quotation Customizer", hint: "Build a plan comparison by hand" },
];

// A quotation always belongs to a lead -- capture-quotation only writes rows
// tied to a lead_id -- so the tools are launched here by first picking which
// lead the quotation is for, rather than opening a lead-less builder whose
// result would have nowhere to save.
export function QuotationLauncher({ leads }: { leads: LauncherLead[] }) {
  const router = useRouter();
  const [tool, setTool] = useState<Tool | null>(null);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<{ url: string; title: string } | null>(null);

  const matches = query.trim()
    ? leads.filter((l) => {
        const q = query.trim().toLowerCase();
        return l.full_name.toLowerCase().includes(q) || l.phone.includes(q);
      })
    : leads;

  function launch(lead: LauncherLead) {
    if (!tool) return;
    const params = new URLSearchParams({
      lead_id: lead.id,
      name: lead.full_name,
      phone: lead.phone,
      email: lead.email ?? "",
    });
    if (lead.date_of_birth) params.set("dob", lead.date_of_birth);
    if (lead.gender) params.set("gender", lead.gender);
    if (lead.is_smoker !== null) params.set("smoker", String(lead.is_smoker));
    setModal({ url: `/tools/${tool.file}?${params.toString()}`, title: `${tool.label} — ${lead.full_name}` });
    setTool(null);
    setQuery("");
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.file}
            type="button"
            onClick={() => setTool(t)}
            className="flex items-center gap-2 rounded-[11px] border border-[#f0dfb4] bg-warn-gold-bg px-4 py-2.5 text-[13px] font-semibold text-warn-gold-text"
          >
            <QuotationIcon width={14} height={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tool && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-elevated">
            <div className="border-b border-sand px-5 py-4">
              <div className="text-[15px] font-bold text-navy">{tool.label}</div>
              <div className="mt-0.5 text-[12px] font-medium text-muted">
                {tool.hint} · choose which lead this quotation is for
              </div>
            </div>
            <div className="px-5 pt-4">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or phone…"
                className="w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
              />
            </div>
            <div className="mt-3 flex-1 overflow-y-auto px-5 pb-2">
              {matches.length === 0 ? (
                <p className="py-6 text-center text-[12.5px] text-muted">No leads match that search.</p>
              ) : (
                matches.slice(0, 50).map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => launch(l)}
                    className="flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-left hover:bg-cream"
                  >
                    <span className="truncate text-[13px] font-semibold text-navy">{l.full_name}</span>
                    <span className="flex-none text-[11.5px] font-medium text-taupe">{l.phone}</span>
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end border-t border-sand px-5 py-3.5">
              <button
                type="button"
                onClick={() => { setTool(null); setQuery(""); }}
                className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <QuotationModal
        url={modal?.url ?? null}
        title={modal?.title ?? ""}
        onClose={() => {
          setModal(null);
          router.refresh();
        }}
      />
    </>
  );
}
