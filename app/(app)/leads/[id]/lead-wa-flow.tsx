"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES, type WaTemplate } from "@/app/(app)/wa-flow/types";
import { bumpUsage } from "@/app/(app)/wa-flow/actions";
import { waLink } from "@/lib/whatsapp";
import { fillTemplate, fillValuesFor, toMessageText, type FillableLead } from "@/lib/wa-template-fill";
import { WaFlowIcon, WhatsAppIcon } from "@/components/icons";

// The lead's own WhatsApp Flow: the same templates as the WA Flow page, but
// already filled in with this lead's name, product and contribution, so a
// message is one tap away from the record you are looking at.
export function LeadWaFlow({
  lead,
  agentName,
  templates,
}: {
  lead: FillableLead;
  agentName: string;
  templates: WaTemplate[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState<string>(CATEGORIES[0].value);
  const [openId, setOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Same helper the WA Flow page uses, so a template can never preview
  // differently in the two places.
  const values = useMemo(() => fillValuesFor(lead, agentName), [lead, agentName]);

  // Only offer categories that actually hold something, so the row of chips
  // doesn't advertise empty lanes.
  const tabs = useMemo(
    () => CATEGORIES.filter((c) => templates.some((t) => t.category === c.value)),
    [templates],
  );
  const active = tabs.some((t) => t.value === category) ? category : (tabs[0]?.value ?? "");
  const shown = templates.filter((t) => t.category === active);

  async function copy(t: WaTemplate) {
    await navigator.clipboard.writeText(toMessageText(t.body, values));
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 1500);
    try {
      await bumpUsage(t.id);
      router.refresh();
    } catch {
      // The copy already succeeded; a failed counter isn't worth an error.
    }
  }

  async function send(t: WaTemplate) {
    window.open(waLink(lead.phone, toMessageText(t.body, values)), "_blank");
    try {
      await bumpUsage(t.id);
      router.refresh();
    } catch {
      // intentionally ignored -- the WA send already happened above
    }
  }

  return (
    <div className="mt-[22px] rounded-[16px] border border-sand bg-white p-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <WaFlowIcon width={15} height={15} className="text-green" />
          <div className="text-[14.5px] font-bold text-navy">WhatsApp Flow</div>
        </div>
        <Link href="/wa-flow" className="text-[11.5px] font-semibold text-taupe hover:text-navy">
          Manage templates
        </Link>
      </div>

      {templates.length === 0 ? (
        <p className="mt-3 rounded-[10px] border border-dashed border-sand-2 px-3.5 py-4 text-center text-[12px] font-medium text-taupe">
          No templates yet. Add them in WhatsApp Flow and they&apos;ll appear here, filled in for this lead.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tabs.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => { setCategory(c.value); setOpenId(null); }}
                className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${
                  active === c.value ? "bg-navy text-white" : c.cls
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {shown.map((t) => {
              const open = openId === t.id;
              return (
                <div key={t.id} className="rounded-[11px] border border-sand-2 bg-cream px-3.5 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : t.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className="truncate text-[12.5px] font-bold text-navy">{t.title}</span>
                      <span className="flex-none text-[10.5px] font-semibold text-taupe">{t.language}</span>
                      <svg
                        width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
                        className={`flex-none text-taupe transition-transform ${open ? "rotate-180" : ""}`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    <div className="flex flex-none gap-1.5">
                      <button
                        type="button"
                        onClick={() => copy(t)}
                        className="rounded-[8px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy"
                      >
                        {copiedId === t.id ? "Copied!" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={() => send(t)}
                        className="flex items-center gap-1.5 rounded-[8px] bg-green px-2.5 py-1.5 text-[11px] font-semibold text-white"
                      >
                        <WhatsAppIcon width={12} height={12} fill="#fff" />
                        Send
                      </button>
                    </div>
                  </div>
                  {open && (
                    <div className="mt-2.5 rounded-[9px] border border-[#dbeee2] bg-[#f4faf6] p-3 font-mono text-[11px] leading-[1.7] whitespace-pre-wrap text-[#2f4a3c]">
                      {fillTemplate(t.body, values).replace(/<br\s*\/?>/g, "\n")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
