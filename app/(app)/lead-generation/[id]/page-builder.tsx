"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LandingPageDetail } from "../data";
import type { LandingContent, LandingProduct } from "@/lib/landing-content";
import { landingPath } from "@/lib/agent-slug";
import { ImageUploadField } from "@/components/image-upload-field";
import { saveLandingContent, saveLandingSettings, setLandingPublished, saveAgentSlug } from "../actions";

const FIELD =
  "mt-1.5 w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold";
const LABEL = "text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2";

type Tab =
  | "hero"
  | "problem"
  | "benefits"
  | "why"
  | "advisor"
  | "testimonials"
  | "providers"
  | "faq"
  | "profile"
  | "buttons"
  | "products"
  | "form"
  | "settings";

// The medical funnel has four bands the standard template doesn't, and the
// agent layout is its own thing entirely (a profile card, not a marketing
// page) -- each layout only shows the tabs for sections it actually renders.
const MEDICAL_ONLY: Tab[] = ["problem", "why", "advisor", "providers"];
const STANDARD_ONLY: Tab[] = ["faq"];
const AGENT_ONLY: Tab[] = ["profile", "buttons", "products", "form"];

const TABS: { key: Tab; label: string }[] = [
  { key: "hero", label: "Hero" },
  { key: "problem", label: "The case" },
  { key: "benefits", label: "Benefits" },
  { key: "why", label: "Why you" },
  { key: "advisor", label: "Your profile" },
  { key: "testimonials", label: "Testimonials" },
  { key: "providers", label: "Operators" },
  { key: "faq", label: "FAQ" },
  { key: "profile", label: "Profile" },
  { key: "buttons", label: "Buttons" },
  { key: "products", label: "Products" },
  { key: "form", label: "Form" },
  { key: "settings", label: "Settings" },
];

export function PageBuilder({ page }: { page: LandingPageDetail }) {
  const router = useRouter();
  const isMedical = page.layout === "medical";
  const isAgent = page.layout === "agent";
  const [tab, setTab] = useState<Tab>(isAgent ? "profile" : "hero");
  const visibleTabs = TABS.filter((t) => {
    if (t.key === "settings") return true;
    if (isAgent) return AGENT_ONLY.includes(t.key);
    if (AGENT_ONLY.includes(t.key)) return false;
    return isMedical ? !STANDARD_ONLY.includes(t.key) : !MEDICAL_ONLY.includes(t.key);
  });
  const [content, setContent] = useState<LandingContent>(page.content);
  const [name, setName] = useState(page.name);
  const [slug, setSlug] = useState(page.slug);
  const [product, setProduct] = useState<LandingProduct>(page.product);
  const [published, setPublished] = useState(page.isPublished);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The agent link belongs to the agent, not this page, so it saves through
  // its own action and its own pending/error state rather than riding along
  // with the page's Save button.
  const [agentSlug, setAgentSlug] = useState(page.agentSlug);
  const [agentSlugInput, setAgentSlugInput] = useState(page.agentSlug ?? "");
  const [agentSlugError, setAgentSlugError] = useState<string | null>(null);
  const [agentSlugSaved, setAgentSlugSaved] = useState(false);
  const [slugPending, startSlugTransition] = useTransition();

  const publicPath = landingPath(agentSlug, slug);

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

  function saveAgentLink() {
    setAgentSlugError(null);
    setAgentSlugSaved(false);
    startSlugTransition(async () => {
      const result = await saveAgentSlug(page.id, agentSlugInput);
      if (result.error) {
        setAgentSlugError(result.error);
        return;
      }
      setAgentSlug(result.agentSlug);
      if (result.agentSlug) setAgentSlugInput(result.agentSlug);
      setAgentSlugSaved(true);
      router.refresh();
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
      <div className="sticky top-0 z-20 lg:static flex flex-wrap items-start justify-between gap-4 border-b border-sand bg-white/85 backdrop-blur-md px-5 py-5 lg:bg-white lg:backdrop-blur-none lg:px-[30px]">
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
          <div className="mt-1 font-mono text-[12px] font-medium text-muted">{publicPath}</div>
        </div>

        <div className="flex flex-none flex-wrap items-center gap-2.5">
          {published && (
            <a
              href={publicPath}
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
          {visibleTabs.map((t) => (
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

          {tab === "problem" && (
            <Card
              title="The case"
              hint="Why this matters before you ask for anything: what treatment actually costs, and what's in the news about it."
            >
              <Text label="Eyebrow" value={content.problemEyebrow} onChange={(v) => edit("problemEyebrow", v)} />
              <Text label="Section heading" value={content.problemTitle} onChange={(v) => edit("problemTitle", v)} />
              <Area label="Opening line" value={content.problemBody} onChange={(v) => edit("problemBody", v)} rows={3} />
              <List
                label="Cost row"
                items={content.costRows}
                onChange={(v) => edit("costRows", v)}
                blank={{ label: "", amount: "" }}
                render={(item, set) => (
                  <div className="grid grid-cols-[1fr_140px] gap-3">
                    <Text label="Treatment" value={item.label} onChange={(v) => set({ ...item, label: v })} />
                    <Text label="Cost" value={item.amount} onChange={(v) => set({ ...item, amount: v })} />
                  </div>
                )}
              />
              <Text label="Small print under the table" value={content.costNote} onChange={(v) => edit("costNote", v)} />
              <List
                label="Headline"
                items={content.newsHeadlines}
                onChange={(v) => edit("newsHeadlines", v)}
                blank=""
                render={(item, set) => <Text label="News headline" value={item} onChange={set} />}
              />
            </Card>
          )}

          {tab === "why" && (
            <Card title="Why you" hint="What makes working with you different. Six is what fits the layout neatly.">
              <Text label="Section heading" value={content.whyTitle} onChange={(v) => edit("whyTitle", v)} />
              <List
                label="Reason"
                items={content.whyPoints}
                onChange={(v) => edit("whyPoints", v)}
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

          {tab === "advisor" && (
            <Card
              title="Your profile"
              hint="Who the visitor is about to trust. Leave the name blank to use the name on the account."
            >
              <Text label="Name" value={content.advisorName} onChange={(v) => edit("advisorName", v)} />
              <Text label="Title" value={content.advisorTitle} onChange={(v) => edit("advisorTitle", v)} />
              <Text
                label="Photo URL"
                value={content.advisorPhotoUrl}
                onChange={(v) => edit("advisorPhotoUrl", v)}
              />
              <p className="-mt-1 text-[11px] font-medium text-taupe">
                Paste a link to a photo of yourself. Without one the page shows your initials instead.
              </p>
              <Area label="About you" value={content.advisorBio} onChange={(v) => edit("advisorBio", v)} rows={4} />
              <List
                label="Credential"
                items={content.advisorStats}
                onChange={(v) => edit("advisorStats", v)}
                blank={{ value: "", label: "" }}
                render={(item, set) => (
                  <div className="grid grid-cols-2 gap-3">
                    <Text label="Figure" value={item.value} onChange={(v) => set({ ...item, value: v })} />
                    <Text label="Caption" value={item.label} onChange={(v) => set({ ...item, label: v })} />
                  </div>
                )}
              />
            </Card>
          )}

          {tab === "providers" && (
            <Card
              title="Operators"
              hint="The takaful operators you compare. A logo URL is optional — without one the name shows as text."
            >
              <Text
                label="Section heading"
                value={content.providersTitle}
                onChange={(v) => edit("providersTitle", v)}
              />
              <List
                label="Operator"
                items={content.providers}
                onChange={(v) => edit("providers", v)}
                blank={{ name: "", logoUrl: "" }}
                render={(item, set) => (
                  <>
                    <Text label="Name" value={item.name} onChange={(v) => set({ ...item, name: v })} />
                    <Text label="Logo URL" value={item.logoUrl} onChange={(v) => set({ ...item, logoUrl: v })} />
                  </>
                )}
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

          {tab === "profile" && (
            <Card title="Profile" hint="Your photo, tagline, quote and socials on the profile card.">
              <Text label="Tagline" value={content.agentTagline} onChange={(v) => edit("agentTagline", v)} />
              <Text label="Sub-tagline" value={content.agentSubTagline} onChange={(v) => edit("agentSubTagline", v)} />
              <Area label="Quote" value={content.agentQuote} onChange={(v) => edit("agentQuote", v)} rows={3} />

              <div className="mt-5 grid gap-4 border-t border-sand pt-4 sm:grid-cols-3">
                <ImageUploadField
                  label="Logo"
                  kind="logo"
                  value={content.agentLogoUrl}
                  onChange={(v) => edit("agentLogoUrl", v)}
                  hint="Blank = use the image from Settings › My Profile"
                  fallbackPreview={page.ownerBranding?.logoUrl ?? null}
                />
                <ImageUploadField
                  label="Header background"
                  kind="header"
                  value={content.agentHeaderUrl}
                  onChange={(v) => edit("agentHeaderUrl", v)}
                  hint="Blank = use the image from Settings › My Profile"
                  fallbackPreview={page.ownerBranding?.headerUrl ?? null}
                />
                <ImageUploadField
                  label="Profile photo"
                  kind="photo"
                  value={content.agentPhotoUrl}
                  onChange={(v) => edit("agentPhotoUrl", v)}
                  hint="Blank = use the image from Settings › My Profile"
                  fallbackPreview={page.ownerBranding?.photoUrl ?? null}
                />
              </div>

              <div className="mt-5 border-t border-sand pt-4">
                <span className={LABEL}>Social links</span>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Text
                    label="TikTok URL"
                    value={content.agentSocials.tiktok}
                    onChange={(v) => edit("agentSocials", { ...content.agentSocials, tiktok: v })}
                  />
                  <Text
                    label="Threads URL"
                    value={content.agentSocials.threads}
                    onChange={(v) => edit("agentSocials", { ...content.agentSocials, threads: v })}
                  />
                  <Text
                    label="Instagram URL"
                    value={content.agentSocials.instagram}
                    onChange={(v) => edit("agentSocials", { ...content.agentSocials, instagram: v })}
                  />
                  <Text
                    label="Facebook URL"
                    value={content.agentSocials.facebook}
                    onChange={(v) => edit("agentSocials", { ...content.agentSocials, facebook: v })}
                  />
                </div>
              </div>
            </Card>
          )}

          {tab === "buttons" && (
            <Card title="Buttons" hint="The three call-to-action buttons on the card, and your trust badges.">
              <Text label="Form button" value={content.agentCtaForm} onChange={(v) => edit("agentCtaForm", v)} />
              <Text label="WhatsApp button" value={content.agentCtaWhatsapp} onChange={(v) => edit("agentCtaWhatsapp", v)} />
              <Area
                label="WhatsApp message"
                value={content.agentWhatsappMessage}
                onChange={(v) => edit("agentWhatsappMessage", v)}
                rows={3}
              />
              <p className="-mt-1 text-[11px] font-medium text-taupe">
                {"{nama}"} becomes your first name.
              </p>
              <Text label="Share button" value={content.agentCtaShare} onChange={(v) => edit("agentCtaShare", v)} />
              <List
                label="Trust badge"
                items={content.agentBadges}
                onChange={(v) => edit("agentBadges", v)}
                blank=""
                render={(item, set) => <Text label="Badge" value={item} onChange={set} />}
              />
            </Card>
          )}

          {tab === "products" && (
            <Card title="Products" hint="The product tiles a visitor taps before filling in the form.">
              <Text
                label="Section heading"
                value={content.agentProductsTitle}
                onChange={(v) => edit("agentProductsTitle", v)}
              />
              <Text label="Pill text" value={content.agentProductsPill} onChange={(v) => edit("agentProductsPill", v)} />
              <List
                label="Product"
                items={content.agentProducts}
                onChange={(v) => edit("agentProducts", v)}
                blank={{ name: "", badge: "", interest: "" }}
                render={(item, set) => (
                  <>
                    <Text label="Name" value={item.name} onChange={(v) => set({ ...item, name: v })} />
                    <div className="grid grid-cols-2 gap-3">
                      <Text label="Badge (optional)" value={item.badge} onChange={(v) => set({ ...item, badge: v })} />
                      <Text
                        label="Interest sent to lead"
                        value={item.interest}
                        onChange={(v) => set({ ...item, interest: v })}
                      />
                    </div>
                  </>
                )}
              />
            </Card>
          )}

          {tab === "form" && (
            <Card title="Form" hint="The calculator sits above this on the page; these are the lead-capture texts around it.">
              <Text label="Eyebrow" value={content.agentFormEyebrow} onChange={(v) => edit("agentFormEyebrow", v)} />
              <Text label="Title" value={content.agentFormTitle} onChange={(v) => edit("agentFormTitle", v)} />
              <Area label="Body" value={content.agentFormBody} onChange={(v) => edit("agentFormBody", v)} rows={2} />
              <Text label="Submit button" value={content.agentFormSubmit} onChange={(v) => edit("agentFormSubmit", v)} />
              <Text
                label="Success title"
                value={content.agentFormSuccessTitle}
                onChange={(v) => edit("agentFormSuccessTitle", v)}
              />
              <Area
                label="Success body"
                value={content.agentFormSuccessBody}
                onChange={(v) => edit("agentFormSuccessBody", v)}
                rows={2}
              />
              <div className="mt-5 border-t border-sand pt-4">
                <Text label="Call button" value={content.agentCallCta} onChange={(v) => edit("agentCallCta", v)} />
                <Text label="Footer line" value={content.agentFooterLine} onChange={(v) => edit("agentFooterLine", v)} />
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
                  <span className="px-3.5 py-2.5 font-mono text-[12.5px] text-taupe">
                    {isAgent ? `/${agentSlug ?? "…"}/` : "/p/"}
                  </span>
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
                <span className={LABEL}>{isAgent ? "Form" : "Calculators"}</span>
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
                {isAgent && (
                  <span className="mt-1.5 block text-[11px] font-medium text-taupe">
                    Plus a lead form (Full Name, Phone, Email, DOB, Gender, Smoker, Occupation) — each submission
                    becomes a Warm lead.
                  </span>
                )}
              </label>

              {isAgent && (
                <div className="mt-5 rounded-[12px] border border-sand-2 bg-cream px-4 py-3.5">
                  <div className="text-[12.5px] font-bold text-navy">Your agent link</div>
                  <div className="mt-1 text-[11.5px] font-medium leading-relaxed text-muted">
                    Every landing page you own shares this one link segment. Old links stop working if you change it;
                    /p/&hellip; links keep working regardless.
                  </div>
                  <div className="mt-3 flex items-center gap-0 overflow-hidden rounded-[10px] border border-sand-2 bg-white">
                    <span className="px-3.5 py-2.5 font-mono text-[12.5px] text-taupe">/</span>
                    <input
                      value={agentSlugInput}
                      onChange={(e) => {
                        setAgentSlugInput(e.target.value);
                        setAgentSlugSaved(false);
                        setAgentSlugError(null);
                      }}
                      className="flex-1 bg-transparent py-2.5 pr-3.5 font-mono text-[13px] font-medium text-navy outline-none"
                      placeholder="nama-anda"
                    />
                  </div>
                  {agentSlugError && (
                    <div className="mt-2 rounded-[8px] bg-alert-red-bg px-3 py-2 text-[11.5px] font-semibold text-alert-red">
                      {agentSlugError}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[10.5px] font-medium text-taupe">
                      This changes the link of every landing page you own. Old /{agentSlug ?? "…"}/&hellip; links stop
                      working; /p/&hellip; links keep working.
                    </span>
                    <button
                      type="button"
                      disabled={slugPending || !agentSlugInput.trim()}
                      onClick={saveAgentLink}
                      className="flex-none rounded-[9px] bg-brand px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                    >
                      {slugPending ? "Saving…" : agentSlugSaved ? "Saved" : "Save agent link"}
                    </button>
                  </div>
                </div>
              )}

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
// and benefits/testimonials/FAQ/agent products (objects) all go through one
// control.
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
