"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ClosingScript } from "./data";
import { updateScript } from "./actions";
import { PlaceholderPicker, insertAtCursor } from "@/components/placeholder-picker";
import { SearchIcon, ChevronDownIcon } from "@/components/icons";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          // A blocked clipboard is not worth an error state -- the script is
          // on screen and can be selected by hand.
          setCopied(false);
        }
      }}
      className="press rounded-[9px] border border-sand-2 bg-cream px-3 py-1.5 text-[11.5px] font-semibold text-navy hover:border-navy"
    >
      {copied ? "Copied" : "Copy script"}
    </button>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function ScriptsView({
  title,
  subtitle,
  scripts,
  canEdit,
}: {
  title: string;
  /** Shown under the title, already formatted -- computed server-side and
   * passed as a plain string, since a function prop can't cross the
   * Server-to-Client Component boundary this view sits behind. */
  subtitle: string;
  scripts: ClosingScript[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [chapter, setChapter] = useState("");
  const [editing, setEditing] = useState<ClosingScript | null>(null);

  const chapters = useMemo(() => {
    const seen = new Map<string, number>();
    for (const s of scripts) if (!seen.has(s.chapter)) seen.set(s.chapter, s.chapter_order);
    return [...seen.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name);
  }, [scripts]);

  // Static per-chapter counts for the nav -- what a section actually holds,
  // not how much of it currently matches a search. The search narrows the
  // cards on the right; it doesn't make the directory on the left flicker.
  const navCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let total = 0;
    for (const s of scripts) {
      if (!s.is_active && !canEdit) continue;
      counts.set(s.chapter, (counts.get(s.chapter) ?? 0) + 1);
      total++;
    }
    return { byChapter: counts, total };
  }, [scripts, canEdit]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scripts.filter((s) => {
      // An inactive script stays visible to whoever can edit it, so it can be
      // switched back on; for everyone else it is simply gone.
      if (!s.is_active && !canEdit) return false;
      if (chapter && s.chapter !== chapter) return false;
      if (!q) return true;
      return (
        s.situation.toLowerCase().includes(q) ||
        s.body.toLowerCase().includes(q) ||
        s.chapter.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        String(s.script_no) === q.replace(/^#/, "")
      );
    });
  }, [scripts, query, chapter, canEdit]);

  const grouped = useMemo(() => {
    const map = new Map<string, ClosingScript[]>();
    for (const s of visible) {
      const list = map.get(s.chapter);
      if (list) list.push(s);
      else map.set(s.chapter, [s]);
    }
    return [...map.entries()];
  }, [visible]);

  return (
    <div>
      <div className="border-b border-sand bg-white px-5 lg:px-[30px] py-3.5 lg:py-5">
        <div className="text-[18px] font-extrabold tracking-[-0.02em] text-navy lg:text-[22px]">{title}</div>
        <div className="mt-[3px] text-[12.5px] font-medium text-muted lg:text-[13px]">{subtitle}</div>
      </div>

      <div className="bg-cream px-5 py-3 lg:px-[30px] lg:py-[18px]">
        <div className="flex min-w-[170px] items-center gap-2 rounded-[10px] border border-sand-2 bg-white px-3 py-2 lg:rounded-[11px] lg:px-3.5 lg:py-[11px]">
          <SearchIcon width={15} height={15} className="flex-none text-taupe" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a situation, an objection, a word…"
            className="w-full min-w-0 bg-transparent text-[13px] font-medium text-navy outline-none placeholder:text-taupe"
          />
        </div>

        {/* Mobile: a horizontally scrollable strip of chapters -- there is no
            room for a sidebar on a phone, and wrapping pills would push the
            actual scripts off the first screen the way the old dropdown's
            sibling controls once did on Leads Manager. */}
        <div className="mt-2.5 -mx-5 overflow-x-auto px-5 lg:hidden">
          <div className="flex w-max gap-1.5 pb-1">
            <ChapterChip label={`All sections (${navCounts.total})`} active={chapter === ""} onClick={() => setChapter("")} />
            {chapters.map((c, i) => (
              <ChapterChip
                key={c}
                label={`${pad2(i + 1)} · ${c} (${navCounts.byChapter.get(c) ?? 0})`}
                active={chapter === c}
                onClick={() => setChapter(c)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-6 px-5 pb-[30px] lg:px-[30px]">
        {/* Desktop: a left-hand directory, matching how the source material
            itself is organised -- pick a chapter, read what's in it. */}
        <nav className="hidden w-[252px] flex-none lg:block">
          <div className="sticky top-4 flex flex-col gap-0.5">
            <ChapterRow label="All sections" count={navCounts.total} active={chapter === ""} onClick={() => setChapter("")} />
            {chapters.map((c, i) => (
              <ChapterRow
                key={c}
                no={pad2(i + 1)}
                label={c}
                count={navCounts.byChapter.get(c) ?? 0}
                active={chapter === c}
                onClick={() => setChapter(c)}
              />
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-6">
            {grouped.length === 0 && (
              <p className="py-10 text-center text-[13px] font-medium text-muted">
                {query
                  ? `Nothing matches "${query}". Try a shorter word, or the objection in the client's own words.`
                  : "Nothing in this section yet."}
              </p>
            )}

            {grouped.map(([chapterName, items]) => (
              <div key={chapterName}>
                {/* Redundant with the sidebar/chip selection whenever a
                    section is chosen, so it only earns its place under "All
                    sections", where it's the only thing marking where one
                    chapter ends and the next begins. */}
                {!chapter && (
                  <div className="sticky top-0 z-[1] bg-cream/95 py-2 text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase backdrop-blur">
                    {chapterName} · {items.length}
                  </div>
                )}
                <div className="grid gap-3 lg:grid-cols-2">
                  {items.map((s) => (
                    <div
                      key={s.id}
                      className={`rounded-2xl border bg-white p-4 shadow-card ${
                        s.is_active ? "border-sand" : "border-dashed border-sand-2 opacity-70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex-none rounded-[5px] bg-cream px-[6px] py-[1px] font-mono text-[10px] font-bold text-taupe-2">
                            #{String(s.script_no).padStart(2, "0")}
                          </span>
                          <div className="truncate text-[13px] font-bold text-navy">{s.situation}</div>
                        </div>
                        {!s.is_active && (
                          <span className="flex-none rounded-[5px] bg-sand-2 px-[6px] py-[1px] text-[9px] font-bold text-taupe-2">
                            HIDDEN
                          </span>
                        )}
                      </div>

                      <pre className="mt-2.5 rounded-[11px] bg-cream px-3 py-2.5 font-sans text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink">
                        {s.body}
                      </pre>

                      {s.why && (
                        <details className="mt-2 group">
                          <summary className="cursor-pointer text-[11.5px] font-semibold text-green">
                            Kenapa ia menjadi?
                          </summary>
                          <p className="mt-1.5 text-[11.5px] leading-relaxed font-medium text-muted">{s.why}</p>
                        </details>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-sand-3 pt-3">
                        <CopyButton text={s.body} />
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setEditing(s)}
                            className="press rounded-[9px] border border-sand-2 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-navy hover:border-navy"
                          >
                            Edit
                          </button>
                        )}
                        <div className="ml-auto flex flex-wrap gap-1">
                          {s.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-[5px] bg-info-blue-bg px-[6px] py-[1px] text-[9.5px] font-bold text-info-blue-text"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editing && (
        <EditScriptModal
          script={editing}
          chapters={chapters}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ChapterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press flex-none rounded-full px-3.5 py-2 text-[12px] font-semibold whitespace-nowrap ${
        active ? "bg-navy text-white" : "border border-sand-2 bg-white text-navy"
      }`}
    >
      {label}
    </button>
  );
}

function ChapterRow({
  no,
  label,
  count,
  active,
  onClick,
}: {
  no?: string;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-[12.5px] ${
        active ? "bg-navy font-bold text-white" : "font-semibold text-navy hover:bg-cream"
      }`}
    >
      {no && (
        <span className={`flex-none font-mono text-[10.5px] ${active ? "text-white/60" : "text-taupe"}`}>{no}</span>
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={`flex-none rounded-[5px] px-[6px] py-[1px] text-[10px] font-bold ${
          active ? "bg-white/15 text-white" : "bg-cream text-taupe-2"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function EditScriptModal({
  script,
  chapters,
  onClose,
  onSaved,
}: {
  script: ClosingScript;
  chapters: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [situation, setSituation] = useState(script.situation);
  const [body, setBody] = useState(script.body);
  const [why, setWhy] = useState(script.why ?? "");
  const [chapter, setChapter] = useState(script.chapter);
  const [isActive, setIsActive] = useState(script.is_active);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateScript(script.id, { situation, body, why, chapter, isActive });
        if (result.error) {
          setError(result.error);
          return;
        }
        onSaved();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-elevated">
        <div className="text-lg font-bold text-navy">Edit script #{String(script.script_no).padStart(2, "0")}</div>

        <label className="mt-4 block">
          <span className="text-[11px] font-bold tracking-[0.1em] text-taupe-2 uppercase">Situation</span>
          <input
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            className="mt-[5px] w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-[11px] font-bold tracking-[0.1em] text-taupe-2 uppercase">Section</span>
          <div className="relative mt-[5px]">
            <select
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              className="w-full appearance-none rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 pr-9 text-[13px] font-semibold text-navy"
            >
              {chapters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDownIcon width={14} height={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-navy" />
          </div>
        </label>

        <label className="mt-3 block">
          <span className="text-[11px] font-bold tracking-[0.1em] text-taupe-2 uppercase">Script</span>
          <textarea
            ref={bodyRef}
            rows={9}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-[5px] w-full resize-y rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] leading-relaxed font-medium text-navy outline-none focus:border-gold"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-[11px] font-bold tracking-[0.1em] text-taupe-2 uppercase">Why it works</span>
          <textarea
            rows={3}
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="The reason behind it — this is what lets an agent improvise when the conversation turns."
            className="mt-[5px] w-full resize-y rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[12.5px] leading-relaxed font-medium text-navy outline-none focus:border-gold placeholder:text-taupe"
          />
        </label>

        <label className="mt-3 flex items-center gap-2.5">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive((v) => !v)}
            className={`flex h-[21px] w-[38px] flex-none items-center rounded-full px-[3px] transition-colors ${
              isActive ? "justify-end bg-green" : "justify-start bg-sand-2"
            }`}
          >
            <span className="h-[15px] w-[15px] rounded-full bg-white" />
          </button>
          <span className="text-[12.5px] font-semibold text-navy">
            {isActive ? "Visible to agents" : "Hidden from agents"}
          </span>
        </label>

        {error && (
          <div className="mt-3 rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
            {error}
          </div>
        )}

        {/* The placeholder picker sits in the space beside the buttons, rather
            than adding another row above the fold. */}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <PlaceholderPicker
            className="flex-1"
            onInsert={(token) => setBody((current) => insertAtCursor(bodyRef.current, current, token))}
          />
          <div className="flex flex-none gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save script"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
