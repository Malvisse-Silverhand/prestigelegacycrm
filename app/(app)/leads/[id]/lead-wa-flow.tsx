"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES, type WaTemplate } from "@/app/(app)/wa-flow/types";
import { bumpUsage } from "@/app/(app)/wa-flow/actions";
import type { ClosingScript, ScriptSet } from "@/app/(app)/wa-flow/scripts/data";
import { waLink } from "@/lib/whatsapp";
import { fillTemplate, fillValuesFor, toMessageText, type FillableLead } from "@/lib/wa-template-fill";
import { WaFlowIcon, WhatsAppIcon, ChevronDownIcon } from "@/components/icons";

const SCRIPT_SET_LABEL: Record<ScriptSet, string> = {
  takaful: "Takaful",
  medical: "Medical Card",
  hibah_faraid: "Hibah & Faraid",
};
const SCRIPT_SET_HREF: Record<ScriptSet, string> = {
  takaful: "/wa-flow/scripts",
  medical: "/wa-flow/scripts/medical",
  hibah_faraid: "/wa-flow/scripts/hibah-faraid",
};

// The lead's own WhatsApp Flow: the same templates as the WA Flow page, but
// already filled in with this lead's name, product and contribution, so a
// message is one tap away from the record you are looking at.
export function LeadWaFlow({
  lead,
  agentName,
  templates,
  closingScripts,
}: {
  lead: FillableLead;
  agentName: string;
  templates: WaTemplate[];
  closingScripts: Record<ScriptSet, ClosingScript[]>;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<string>(CATEGORIES[0].value);
  const [openId, setOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Same helper the WA Flow page uses, so a template -- or a script, which
  // carries the same {{Name}} token -- can never fill differently in the two
  // places.
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

          {/* Capped to roughly 6 rows before scrolling, so a category with a
              long list doesn't push the rest of the lead's page down. */}
          <div className="mt-3 flex max-h-[358px] flex-col gap-2 overflow-y-auto pr-1">
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

      <ClosingScriptsSection lead={lead} values={values} scriptsBySet={closingScripts} />
    </div>
  );
}

// Closing scripts, addressed to this lead. Three libraries as horizontal
// tabs -- Takaful, Medical Card, Hibah & Faraid -- each with its own
// section dropdown, since a script is filed by the situation an agent is in
// rather than by funnel stage the way a template is, and each library has
// its own set of situations.
function ClosingScriptsSection({
  lead,
  values,
  scriptsBySet,
}: {
  lead: FillableLead;
  values: Record<string, string>;
  scriptsBySet: Record<ScriptSet, ClosingScript[]>;
}) {
  const nonEmptySets = (Object.keys(scriptsBySet) as ScriptSet[]).filter((s) => scriptsBySet[s].length > 0);
  const [scriptSet, setScriptSet] = useState<ScriptSet | null>(nonEmptySets[0] ?? null);
  const [chapter, setChapter] = useState("");
  const [openScriptId, setOpenScriptId] = useState<string | null>(null);
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

  const activeSet = scriptSet && nonEmptySets.includes(scriptSet) ? scriptSet : (nonEmptySets[0] ?? null);
  // `[]` here is a fresh array on every render (activeSet === null has no
  // stored array to point at), which would otherwise make the chapters memo
  // below recompute every time regardless of its dependency array.
  const scripts = useMemo(() => (activeSet ? scriptsBySet[activeSet] : []), [activeSet, scriptsBySet]);

  const chapters = useMemo(() => {
    const seen = new Map<string, number>();
    for (const s of scripts) if (!seen.has(s.chapter)) seen.set(s.chapter, s.chapter_order);
    return [...seen.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name);
  }, [scripts]);

  const shown = chapter ? scripts.filter((s) => s.chapter === chapter) : scripts;

  function selectSet(next: ScriptSet) {
    setScriptSet(next);
    setChapter("");
    setOpenScriptId(null);
  }

  async function copyScript(s: ClosingScript) {
    await navigator.clipboard.writeText(toMessageText(s.body, values));
    setCopiedScriptId(s.id);
    setTimeout(() => setCopiedScriptId(null), 1500);
  }

  function sendScript(s: ClosingScript) {
    window.open(waLink(lead.phone, toMessageText(s.body, values)), "_blank");
  }

  if (nonEmptySets.length === 0 || !activeSet) return null;

  return (
    <div className="mt-4 border-t border-sand-3 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12.5px] font-bold text-navy">Closing Scripts</div>
        <Link href={SCRIPT_SET_HREF[activeSet]} className="text-[11px] font-semibold text-taupe hover:text-navy">
          Open full library
        </Link>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {nonEmptySets.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => selectSet(s)}
            className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${
              activeSet === s ? "bg-navy text-white" : "border border-sand-2 bg-white text-navy"
            }`}
          >
            {SCRIPT_SET_LABEL[s]}
          </button>
        ))}

        {chapters.length > 0 && (
          <div className="relative ml-auto">
            <select
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              aria-label={`${SCRIPT_SET_LABEL[activeSet]} section`}
              className="w-full appearance-none rounded-[9px] border border-sand-2 bg-white py-1.5 pr-7 pl-2.5 text-[11.5px] font-semibold text-navy"
            >
              <option value="">All sections</option>
              {chapters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDownIcon width={12} height={12} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-navy" />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex flex-col gap-2">
        {shown.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-sand-2 px-3.5 py-4 text-center text-[12px] font-medium text-taupe">
            Nothing in this section.
          </p>
        ) : (
          shown.map((s) => {
            const open = openScriptId === s.id;
            return (
              <div key={s.id} className="rounded-[11px] border border-sand-2 bg-cream px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenScriptId(open ? null : s.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="flex-none rounded-[5px] bg-white px-[6px] py-[1px] font-mono text-[10px] font-bold text-taupe-2">
                      #{String(s.script_no).padStart(2, "0")}
                    </span>
                    <span className="truncate text-[12.5px] font-bold text-navy">{s.situation}</span>
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
                      onClick={() => copyScript(s)}
                      className="rounded-[8px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy"
                    >
                      {copiedScriptId === s.id ? "Copied!" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() => sendScript(s)}
                      className="flex items-center gap-1.5 rounded-[8px] bg-green px-2.5 py-1.5 text-[11px] font-semibold text-white"
                    >
                      <WhatsAppIcon width={12} height={12} fill="#fff" />
                      Send
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="mt-2.5 rounded-[9px] border border-[#dbeee2] bg-[#f4faf6] p-3 font-mono text-[11px] leading-[1.7] whitespace-pre-wrap text-[#2f4a3c]">
                    {fillTemplate(s.body, values)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
