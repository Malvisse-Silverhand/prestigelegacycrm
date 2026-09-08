"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LandingPageDetail } from "../data";
import type { LandingContent, LandingProduct } from "@/lib/landing-content";
import { saveLandingContent, saveLandingSettings, setLandingPublished } from "../actions";

const FIELD =
  "mt-1.5 w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold";
const LABEL = "text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2";

type Tab = "hero" | "benefits" | "testimonials" | "faq" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "hero", label: "Hero" },
  { key: "benefits", label: "Benefits" },
  { key: "testimonials", label: "Testimonials" },
  { key: "faq", label: "FAQ" },
  { key: "settings", label: "Settings" },
];

export function PageBuilder({ page }: { page: LandingPageDetail }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("hero");
  const [content, setContent] = useState<LandingContent>(page.content);
  const [name, setName] = useState(page.name);
  const [slug, setSlug] = useState(page.slug);
  const [product, setProduct] = useState<LandingProduct>(page.product);
  const [published, setPublished] = useState(page.isPublished);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function edit<K extends keyof LandingContent>(key: K, value: LandingContent[K]) {
    setContent((c) => ({ ...c, [key]: value }));
    setDirty(true);
    setSaved(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const [a, b] = await Promise.all([
          saveLandingContent(page.id, content),
          saveLandingSettings({ id: page.id, name, slug, product }),
        ]);
        const err = a.error ?? b.error;
        if (err) {
          setError(err);
          return;
        }
        // The slug may have been de-duplicated server-side.
        if (b.slug && b.slug !== slug) setSlug(b.slug);
        setDirty(false);
        setSaved(true);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  function togglePublish() {
    setError(null);
    startTransition(async () => {
      const next = !published;
      const result = await setLandingPublished(page.id, next);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPublished(next);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sand bg-white px-5 py-5 lg:px-[30px]">
        <div className="min-w-0">
          <Link href="/lead-generation" className="text-[12px] font-semibold text-taupe hover:text-navy">
            ← Lead Generation
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <span className="text-[22px] font-extrabold tracking-[-0.02em] text-navy">{name || "Untitled"}</span>
            <span
              className={`rounded-[6px] px-2 py-[3px] text-[9.5px] font-bold ${
                published ? "bg-success-bg text-green" : "bg-sand-3 text-taupe-2"
              }`}
            >
              {published ? "LIVE" : "DRAFT"}
            </span>
          </div>
          <div className="mt-1 font-mono text-[12px] font-medium text-muted">/p/{slug}</div>
        </div>

        <div className="flex flex-none flex-wrap items-center gap-2.5">
          {published && (
            <a
              href={`/p/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[11px] border border-sand-2 bg-white px-4 py-3 text-[12.5px] font-semibold text-navy"
            >
              View page
            </a>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={togglePublish}
            className="rounded-[11px] border border-sand-2 bg-white px-4 py-3 text-[12.5px] font-semibold text-navy disabled:opacity-60"
          >
            {published ? "Unpublish" : "Publish"}
          </button>
          <button
            type="button"
            disabled={pending || (!dirty && !saved)}
            onClick={save}
            className="rounded-[11px] bg-gold px-[17px] py-3 text-[12.5px] font-bold text-navy shadow-sm disabled:opacity-50"
          >
            {pending ? "Saving…" : saved && !dirty ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div className="border-b border-sand bg-white px-5 lg:px-[30px]">
        <div className="flex gap-[22px] overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-none whitespace-nowrap pb-3 text-[13.5px] transition-colors ${
                tab === t.key
                  ? "border-b-[2.5px] border-gold font-bold text-navy"
                  : "border-b-[2.5px] border-transparent font-medium text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-[22px] lg:px-[30px]">
        {error && (
          <div className="mb-4 rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-alert-red">
            {error}
          </div>
        )}

        <div className="max-w-[760px]">
          {tab === "hero" && (
            <Card title="Hero" hint="The first thing a visitor reads. Written in Malay — make it sound like you.">
              <Text label="Eyebrow" value={content.heroEyebrow} onChange={(v) => edit("heroEyebrow", v)} />
              <Text label="Headline" value={content.heroHeadline} onChange={(v) => edit("heroHeadline", v)} />
              <Text label="Headline (gold line)" value={content.heroHighlight} onChange={(v) => edit("heroHighlight", v)} />
              <Area label="Opening line" value={content.heroBody} onChange={(v) => edit("heroBody", v)} rows={3} />
              <Text label="Button text" value={content.heroCta} onChange={(v) => edit("heroCta", v)} />
              <List
                label="Quick points"
                items={content.heroPoints}
                onChange={(v) => edit("heroPoints", v)}
                blank=""
                render={(item, set) => <Text label="Point" value={item} onChange={set} />}
              />
            </Card>
          )}

          {tab === "benefits" && (
            <Card title="Benefits" hint="Your prospect's three biggest worries — answered up front.">
              <Text label="Section heading" value={content.benefitsTitle} onChange={(v) => edit("benefitsTitle", v)} />
              <List
                label="Benefit"
                items={content.benefits}
                onChange={(v) => edit("benefits", v)}
                blank={{ title: "", body: "" }}
                render={(item, set) => (
                  <>
                    <Text label="Headline" value={item.title} onChange={(v) => set({ ...item, title: v })} />
                    <Area label="Description" value={item.body} onChange={(v) => set({ ...item, body: v })} rows={2} />
                  </>
                )}
              />
            </Card>
          )}

          {tab === "testimonials" && (
            <Card title="Testimonials" hint="Use your own clients' words. Empty the list to hide this section.">
              <Text
                label="Section heading"
                value={content.testimonialsTitle}
                onChange={(v) => edit("testimonialsTitle", v)}
              />
              <List
                label="Testimonial"
                items={content.testimonials}
                onChange={(v) => edit("testimonials", v)}
                blank={{ quote: "", name: "", meta: "" }}
                render={(item, set) => (
                  <>
                    <Area label="Quote" value={item.quote} onChange={(v) => set({ ...item, quote: v })} rows={2} />
                    <div className="grid grid-cols-2 gap-3">
                      <Text label="Name" value={item.name} onChange={(v) => set({ ...item, name: v })} />
                      <Text label="Product / date" value={item.meta} onChange={(v) => set({ ...item, meta: v })} />
                    </div>
                  </>
                )}
              />
            </Card>
          )}

          {tab === "faq" && (
            <Card title="FAQ" hint="What people ask before they fill anything in.">
              <Text label="Section heading" value={content.faqTitle} onChange={(v) => edit("faqTitle", v)} />
              <List
                label="Question"
                items={content.faqs}
                onChange={(v) => edit("faqs", v)}
                blank={{ q: "", a: "" }}
                render={(item, set) => (
                  <>
                    <Text label="Question" value={item.q} onChange={(v) => set({ ...item, q: v })} />
                    <Area label="Answer" value={item.a} onChange={(v) => set({ ...item, a: v })} rows={2} />
                  </>
                )}
              />
              <div className="mt-5 border-t border-sand pt-4">
                <Text label="Closing heading" value={content.closingTitle} onChange={(v) => edit("closingTitle", v)} />
                <Area label="Closing line" value={content.closingBody} onChange={(v) => edit("closingBody", v)} rows={2} />
              </div>
            </Card>
          )}

          {tab === "settings" && (
            <Card title="Settings" hint="The name is for you; the slug is the public link.">
              <Text
                label="Name (internal)"
                value={name}
                onChange={(v) => {
                  setName(v);
                  setDirty(true);
                  setSaved(false);
                }}
              />
              <label className="mt-3.5 block">
                <span className={LABEL}>Public link</span>
                <div className="mt-1.5 flex items-center gap-0 overflow-hidden rounded-[10px] border border-sand-2 bg-cream">
                  <span className="px-3.5 py-2.5 font-mono text-[12.5px] text-taupe">/p/</span>
                  <input
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setDirty(true);
                      setSaved(false);
                    }}
                    className="flex-1 bg-transparent py-2.5 pr-3.5 font-mono text-[13px] font-medium text-navy outline-none"
                  />
                </div>
                <span className="mt-1.5 block text-[11px] font-medium text-taupe">
                  Lowercase and dashes. If it&rsquo;s already taken, a number is added automatically.
                </span>
              </label>
              <label className="mt-3.5 block">
                <span className={LABEL}>Calculators</span>
                <select
                  value={product}
                  onChange={(e) => {
                    setProduct(e.target.value as LandingProduct);
                    setDirty(true);
                    setSaved(false);
                  }}
                  className={FIELD}
                >
                  <option value="both">Medical Card + Hibah (tabs)</option>
                  <option value="medical">Medical Card only</option>
                  <option value="hibah">Hibah only</option>
                </select>
              </label>

              <div className="mt-5 rounded-[12px] bg-info-blue-bg-2 px-4 py-3.5">
                <div className="text-[12.5px] font-bold text-info-blue-text">Leads go to {page.agentName}</div>
                <div className="mt-1 text-[11.5px] font-medium leading-relaxed text-info-blue-text/80">
                  The WhatsApp number on the &ldquo;Hantar kepada Ejen&rdquo; button, and every lead this page captures,
                  belong to the page owner. To change owner, create a new page under their name.
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-sand bg-white px-[22px] pb-[22px] pt-5">
      <div className="text-[15px] font-bold text-navy">{title}</div>
      <div className="mt-[3px] text-[11.5px] font-medium text-taupe">{hint}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="mt-3.5 block first:mt-0">
      <span className={LABEL}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={FIELD} />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <label className="mt-3.5 block first:mt-0">
      <span className={LABEL}>{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} resize-none leading-relaxed`}
      />
    </label>
  );
}

// Add / remove / reorder a repeated section. Generic so hero points (strings)
// and benefits/testimonials/FAQ (objects) all go through one control.
function List<T>({
  label,
  items,
  onChange,
  blank,
  render,
}: {
  label: string;
  items: T[];
  onChange: (v: T[]) => void;
  blank: T;
  render: (item: T, set: (v: T) => void) => React.ReactNode;
}) {
  return (
    <div className="mt-5 border-t border-sand pt-4">
      <div className="flex items-center justify-between">
        <span className={LABEL}>{label}</span>
        <button
          type="button"
          onClick={() => onChange([...items, blank])}
          className="rounded-[8px] border border-sand-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy"
        >
          + Add
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-[12px] border border-sand-2 bg-cream px-3.5 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-taupe-2">#{i + 1}</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => {
                    const next = [...items];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    onChange(next);
                  }}
                  className="rounded-[7px] border border-sand-2 bg-white px-2 py-1 text-[11px] font-semibold text-navy disabled:opacity-40"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={i === items.length - 1}
                  onClick={() => {
                    const next = [...items];
                    [next[i + 1], next[i]] = [next[i], next[i + 1]];
                    onChange(next);
                  }}
                  className="rounded-[7px] border border-sand-2 bg-white px-2 py-1 text-[11px] font-semibold text-navy disabled:opacity-40"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  className="rounded-[7px] border border-[#f6d5cf] bg-white px-2 py-1 text-[11px] font-semibold text-alert-red"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="mt-2">
              {render(item, (v) => {
                const next = [...items];
                next[i] = v;
                onChange(next);
              })}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="rounded-[10px] border border-dashed border-sand-2 px-3.5 py-4 text-center text-[11.5px] font-medium text-taupe">
            Empty &mdash; this section won&rsquo;t be shown.
          </p>
        )}
      </div>
    </div>
  );
}
