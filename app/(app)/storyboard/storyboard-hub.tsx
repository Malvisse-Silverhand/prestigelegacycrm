"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { STORYBOARD_TEXT, rm } from "@/lib/storyboard/i18n";
import { STORYBOARD_MODULES, UPCOMING_MODULES, type StoryboardModule } from "@/lib/storyboard/modules";
import { malaysiaDateTime } from "@/lib/malaysia-date";
import { createSession, deleteSession } from "./actions";
import type { SessionListRow } from "./data";

const MODULE_ART: Record<StoryboardModule, { from: string; glyph: string }> = {
  hibah: { from: "from-[#0f2540] to-[#1c3f66]", glyph: "♡" },
  medical: { from: "from-[#0f4c35] to-[#2e8f68]", glyph: "✚" },
  ci: { from: "from-[#7a2a1f] to-[#c9552f]", glyph: "♥" },
};

const STATUS_CHIP = {
  draft: "bg-sand-3 text-muted",
  presented: "bg-success-bg text-green",
  shared: "bg-info-blue-bg text-info-blue-text",
} as const;

export function StoryboardHub({
  sessions,
  leadOptions,
  preselected,
}: {
  sessions: SessionListRow[];
  leadOptions: { id: string; fullName: string }[];
  preselected: { id: string; fullName: string } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lead, setLead] = useState(preselected);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const t = STORYBOARD_TEXT.en;

  const matches = query.trim()
    ? leadOptions.filter((l) => l.fullName.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  function start(module: StoryboardModule) {
    setError(null);
    startTransition(async () => {
      const res = await createSession(module, lead?.id ?? null);
      if (res.error || !res.id) return setError(res.error ?? "Couldn't start.");
      router.push(`/storyboard/${res.id}`);
    });
  }

  return (
    <div>
      <div className="sticky top-0 z-20 flex items-center gap-3.5 border-b border-sand bg-white/85 px-5 py-4 backdrop-blur-md lg:static lg:bg-white lg:px-[30px] lg:py-5 lg:backdrop-blur-none">
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-extrabold tracking-[-0.025em] text-navy">Financial Storyboard</div>
          <div className="mt-0.5 text-[13px] font-medium text-muted">
            Walk a prospect through their own numbers: story, gap, solution, next step.
          </div>
        </div>
        <Link
          href="/storyboard/insights"
          className="flex-none rounded-[10px] border border-sand-2 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy"
        >
          My Insights
        </Link>
      </div>

      <div className="flex flex-col gap-6 px-5 py-[22px] pb-[30px] lg:px-[30px]">
        {/* Who is this for: a lead, or a practice run. */}
        <section className="rounded-[20px] border border-sand bg-white p-5">
          <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">1 · Who is this for?</div>
          {lead ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="rounded-full bg-info-blue-bg px-3 py-1.5 text-[13px] font-bold text-info-blue-text">{lead.fullName}</span>
              <button type="button" onClick={() => setLead(null)} className="text-[12px] font-semibold text-muted hover:text-navy">
                Change
              </button>
            </div>
          ) : (
            <div className="mt-3 max-w-[520px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a lead — or leave empty for a practice session"
                className="w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-brand"
              />
              {matches.length > 0 && (
                <div className="mt-1.5 flex flex-col overflow-hidden rounded-[10px] border border-sand-2">
                  {matches.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setLead(l);
                        setQuery("");
                      }}
                      className="border-b border-sand-3 px-3 py-2 text-left text-[12.5px] font-semibold text-navy last:border-b-0 hover:bg-cream"
                    >
                      {l.fullName}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-1.5 text-[11.5px] font-medium text-taupe">
                No lead = practice session. You can save it to a lead later; unsaved practice sessions clear after 30 days.
              </p>
            </div>
          )}
        </section>

        <section>
          <div className="text-[11px] font-bold tracking-[0.12em] text-taupe-2 uppercase">2 · Choose a storyboard</div>
          {error && (
            <div className="mt-3 rounded-[10px] border border-alert-red/30 bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-alert-red">
              {error}
            </div>
          )}
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {STORYBOARD_MODULES.map((m, n) => (
              <motion.button
                key={m}
                type="button"
                disabled={pending}
                onClick={() => start(m)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: n * 0.08, duration: 0.4 }}
                whileHover={{ y: -3 }}
                className={`relative overflow-hidden rounded-[20px] bg-gradient-to-br ${MODULE_ART[m].from} p-5 text-left text-white disabled:opacity-60`}
              >
                <span aria-hidden className="absolute -right-3 -bottom-6 text-[110px] leading-none text-white/10">
                  {MODULE_ART[m].glyph}
                </span>
                <div className="text-[11px] font-bold tracking-[0.14em] text-gold uppercase">0{n + 1}</div>
                <div className="mt-1 text-[22px] font-extrabold tracking-[-0.02em]">{t.modules[m].name}</div>
                <div className="mt-1 max-w-[240px] text-[12.5px] font-medium text-white/70">{t.modules[m].tagline}</div>
                <div className="mt-5 inline-flex rounded-full bg-gold px-3 py-1.5 text-[12px] font-bold text-navy">
                  {pending ? "Starting…" : lead ? `Start for ${lead.fullName.split(" ")[0]}` : "Start practice"}
                </div>
              </motion.button>
            ))}
            {UPCOMING_MODULES.map((m) => (
              <div key={m.key} className="rounded-[20px] border border-dashed border-sand-2 p-5">
                <div className="text-[11px] font-bold tracking-[0.14em] text-taupe uppercase">Coming soon</div>
                <div className="mt-1 text-[18px] font-bold text-muted">{m.en}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[20px] border border-sand bg-white">
          <div className="border-b border-sand-3 px-5 py-4 text-[14px] font-bold text-navy">Recent sessions</div>
          {sessions.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] font-medium text-muted">No sessions yet. Start one above.</div>
          ) : (
            <div className="divide-y divide-sand-3">
              {sessions.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <Link href={`/storyboard/${s.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-bold text-navy">{t.modules[s.module].name}</span>
                      <span className="text-[13px] font-semibold text-ink">
                        {s.lead?.full_name ?? (s.nickname ? `${s.nickname} · practice` : "Practice")}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase ${STATUS_CHIP[s.status]}`}>{s.status}</span>
                    </div>
                    <div className="mt-0.5 text-[11.5px] font-medium text-taupe">
                      Gap {rm(s.gap)} · {s.coveredPct}% covered · {malaysiaDateTime(s.updated_at)}
                    </div>
                  </Link>
                  {!s.lead && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => startTransition(async () => void (await deleteSession(s.id)))}
                      className="text-[12px] font-semibold text-muted hover:text-alert-red"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
