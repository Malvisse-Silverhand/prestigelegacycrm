"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { PublicLandingPage } from "@/lib/landing-public";
import { tabsFor } from "@/lib/landing-content";
import { useLandingCapture } from "./use-landing-capture";

// The calculators are the real /tools/*.html files, embedded as-is. They carry
// the rate tables and all the plan maths, so the landing page never
// re-implements any of it -- it passes the owning agent's WhatsApp number and
// this page's slug in, and listens for the lead coming back out when a visitor
// unlocks their estimate.
export function LandingPageView({ page }: { page: PublicLandingPage }) {
  const tabs = tabsFor(page.product);
  // A QuickQuote form is the calculators and the agent's card, nothing else --
  // it is sent into a chat that already has the context a landing page has to
  // build from scratch.
  const isQuickQuote = page.layout === "quickquote";
  const [active, setActive] = useState(tabs[0].key);
  const captured = useLandingCapture(page.slug);
  const calcRef = useRef<HTMLDivElement>(null);
  const { content, agent } = page;

  const waHref = agent.waNumber
    ? `https://wa.me/${agent.waNumber}?text=${encodeURIComponent(
        `Salam ${agent.firstName}, saya lihat halaman anda dan nak tanya pasal takaful.`,
      )}`
    : undefined;

  function scrollToCalc() {
    calcRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-dvh bg-cream text-navy">
      {/* NAV */}
      <div className="flex items-center gap-3 bg-navy px-5 py-3.5 lg:px-20">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-gold">
          <Image src="/logo.jpeg" alt="" width={32} height={32} className="h-8 w-8 rounded-[10px] object-cover" />
        </div>
        <div className="flex-1 text-[14px] font-bold text-white lg:text-[15.5px]">Prestige Legacy</div>
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-green px-4 py-2.5 text-[12.5px] font-semibold text-white"
          >
            <WaIcon />
            <span className="hidden sm:inline">WhatsApp Saya</span>
          </a>
        )}
      </div>

      {/* HERO */}
      <div className="bg-navy px-5 pb-12 pt-7 lg:px-20 lg:pb-[76px] lg:pt-[60px]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-10 lg:flex-row lg:gap-16">
          {isQuickQuote ? (
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-gold/[.14] px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold">
                  {content.heroEyebrow}
                </span>
              </div>
              <h1 className="mt-5 text-[28px] font-extrabold leading-[1.15] tracking-[-0.03em] text-white text-pretty lg:text-[38px]">
                Kira anggaran caruman anda
              </h1>
              <p className="mt-3.5 max-w-[30em] text-[14.5px] font-normal leading-relaxed text-white/70">
                Isi maklumat asas, dapat anggaran serta-merta. Tiada IC, tiada dokumen &mdash; dan tiada sesiapa akan
                hubungi anda melainkan anda minta.
              </p>
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex h-[50px] items-center justify-center rounded-control border border-white/[.16] bg-white/[.08] px-6 text-[14px] font-semibold text-white"
                >
                  Tanya dulu di WhatsApp
                </a>
              )}
            </div>
          ) : (
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold/[.14] px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold">
                {content.heroEyebrow}
              </span>
            </div>

            <h1 className="mt-5 text-[34px] font-extrabold leading-[1.12] tracking-[-0.03em] text-white text-pretty lg:text-[52px] lg:leading-[1.1]">
              {content.heroHeadline}
              <br />
              <span className="text-gold">{content.heroHighlight}</span>
            </h1>

            <p className="mt-4 max-w-[30em] text-[15px] font-normal leading-relaxed text-white/70 text-pretty lg:mt-[22px] lg:text-[16.5px]">
              {content.heroBody}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:mt-8">
              <button
                type="button"
                onClick={scrollToCalc}
                className="flex h-[54px] items-center justify-center gap-2.5 rounded-control bg-gold px-7 text-[14.5px] font-bold text-navy"
              >
                {content.heroCta}
                <ArrowIcon />
              </button>
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-[54px] items-center justify-center rounded-control border border-white/[.16] bg-white/[.08] px-6 text-[14.5px] font-semibold text-white"
                >
                  Tanya dulu di WhatsApp
                </a>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-2.5 lg:flex-row lg:gap-7">
              {content.heroPoints.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <CheckIcon />
                  <span className="text-[13px] font-medium text-white/80">{p}</span>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Agent card */}
          <div className="w-full flex-none rounded-card bg-white p-[26px] shadow-elevated lg:w-[356px]">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-taupe-2">Ejen anda</div>
            <div className="mt-3.5 flex items-center gap-3.5">
              <div className="flex h-[54px] w-[54px] flex-none items-center justify-center rounded-2xl bg-gold text-[17px] font-bold text-navy">
                {agent.initials}
              </div>
              <div className="min-w-0">
                <div className="text-[17px] font-bold tracking-[-0.01em] text-navy">{agent.fullName}</div>
                <div className="mt-0.5 text-[12.5px] font-medium text-muted">Great Eastern Takaful Berhad</div>
              </div>
            </div>

            <div className="my-5 h-px bg-sand" />

            <div className="flex flex-col gap-3">
              {agent.phone && (
                <a href={`tel:${agent.phone}`} className="flex items-center gap-2.5 text-navy">
                  <PhoneIcon />
                  <span className="text-[13.5px] font-semibold">{agent.phone}</span>
                </a>
              )}
              <div className="flex items-center gap-2.5">
                <MailIcon />
                <span className="truncate text-[13.5px] font-medium text-ink">{agent.email}</span>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5 rounded-control bg-success-bg px-[15px] py-3.5">
              <ShieldIcon />
              <div className="text-[11.5px] font-medium leading-relaxed text-green">
                Maklumat anda dihantar terus kepada {agent.firstName} sahaja. Tiada pihak ketiga.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CALCULATOR */}
      <div ref={calcRef} className="scroll-mt-4 px-5 pt-12 lg:px-20 lg:pt-[54px]">
        <div className="mx-auto max-w-[1280px]">
          <div className="text-center">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-taupe-2">Langkah 01</div>
            <h2 className="mt-2.5 text-[26px] font-extrabold leading-tight tracking-[-0.025em] text-navy lg:text-[34px]">
              Kira anggaran caruman anda
            </h2>
            <p className="mx-auto mt-3 max-w-[44em] text-[14px] font-normal leading-relaxed text-muted lg:text-[15px]">
              Isi maklumat asas, dapat anggaran serta-merta. Tiada IC, tiada dokumen.
            </p>
          </div>

          {tabs.length > 1 && (
            <div className="mt-7 flex justify-center">
              <div className="flex gap-1 rounded-[14px] border border-sand-2 bg-white p-1.5">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActive(t.key)}
                    className={`rounded-[10px] px-5 py-3 text-[13.5px] font-bold transition-colors ${
                      active === t.key ? "bg-navy text-white" : "text-taupe hover:text-navy"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Each tab keeps its own iframe mounted -- switching tabs must not
              throw away a half-filled form or a calculated estimate. */}
          <div className="mt-6 overflow-hidden rounded-card border border-sand bg-white shadow-card">
            {tabs.map((t) => (
              <div key={t.key} hidden={active !== t.key}>
                <iframe
                  src={`/tools/${t.tool}?wa=${encodeURIComponent(agent.waNumber)}&lp=${encodeURIComponent(page.slug)}`}
                  title={t.label}
                  className="h-[1500px] w-full border-0 bg-cream lg:h-[1250px]"
                />
              </div>
            ))}
          </div>

          {captured && (
            <div className="mt-4 flex items-center justify-center gap-2.5 rounded-control bg-success-bg px-4 py-3.5">
              <ShieldIcon />
              <span className="text-[12.5px] font-semibold text-green">
                Maklumat anda dah sampai kepada {agent.firstName}. Beliau akan hubungi anda tak lama lagi.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* BENEFITS */}
      {!isQuickQuote && <Section title={content.benefitsTitle} eyebrow="Kenapa pelan ini">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {content.benefits.map((b, i) => (
            <div key={i} className="rounded-card border border-sand bg-white p-[26px]">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-success-bg">
                <SparkIcon />
              </div>
              <div className="mt-4 text-[16.5px] font-bold tracking-[-0.01em] text-navy">{b.title}</div>
              <div className="mt-2 text-[13.5px] font-normal leading-relaxed text-muted">{b.body}</div>
            </div>
          ))}
        </div>
      </Section>}

      {/* TESTIMONIALS */}
      {!isQuickQuote && content.testimonials.length > 0 && (
        <Section title={content.testimonialsTitle} eyebrow="Apa kata mereka">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {content.testimonials.map((t, i) => (
              <div key={i} className="rounded-card border border-sand bg-white p-6">
                <div className="flex gap-[3px]">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <StarIcon key={s} />
                  ))}
                </div>
                <div className="mt-3.5 text-[14px] font-normal leading-[1.7] text-ink text-pretty">
                  &ldquo;{t.quote}&rdquo;
                </div>
                <div className="mt-[18px] flex items-center gap-2.5">
                  <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-sand-3 text-[11.5px] font-bold text-ink">
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-navy">{t.name}</div>
                    <div className="text-[11.5px] font-medium text-taupe">{t.meta}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-4 max-w-[62em] text-center text-[11px] font-medium leading-relaxed text-taupe">
            Testimoni menggambarkan pengalaman individu dan bukan jaminan keputusan yang sama.
          </p>
        </Section>
      )}

      {/* FAQ */}
      {!isQuickQuote && content.faqs.length > 0 && (
        <Section title={content.faqTitle} eyebrow="Soalan lazim">
          <div className="mx-auto flex max-w-[900px] flex-col gap-2.5">
            {content.faqs.map((f, i) => (
              <details key={i} className="group rounded-[14px] border border-sand bg-white px-[22px] py-5">
                <summary className="flex cursor-pointer items-start gap-3 list-none">
                  <span className="flex-1 text-[14.5px] font-semibold text-navy">{f.q}</span>
                  <ChevronIcon />
                </summary>
                <div className="mt-2 text-[13.5px] font-normal leading-relaxed text-muted">{f.a}</div>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* CLOSING */}
      <div className="px-5 pt-14 lg:px-20 lg:pt-16">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 rounded-[24px] bg-navy px-7 py-10 lg:flex-row lg:items-center lg:px-[60px] lg:py-[52px]">
          <div className="flex-1">
            <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.025em] text-white text-pretty lg:text-[34px]">
              {content.closingTitle}
            </h2>
            <p className="mt-3 max-w-[34em] text-[14px] font-normal leading-relaxed text-white/[.68] lg:text-[15px]">
              {content.closingBody}
            </p>
          </div>
          <button
            type="button"
            onClick={scrollToCalc}
            className="flex h-[56px] flex-none items-center justify-center gap-2.5 rounded-control bg-gold px-8 text-[15px] font-bold text-navy"
          >
            {content.heroCta}
            <ArrowIcon />
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <div className="px-5 pb-12 pt-11 lg:px-20">
        <div className="mx-auto max-w-[1280px]">
          <div className="h-px bg-sand" />
          <div className="mt-7 flex flex-col gap-8 lg:flex-row lg:gap-12">
            <div className="lg:w-[300px] lg:flex-none">
              <div className="text-[14px] font-bold text-navy">Prestige Legacy</div>
              <div className="mt-3 text-[12.5px] font-medium leading-[1.7] text-muted">
                {agent.fullName}
                <br />
                {agent.phone}
                <br />
                {agent.email}
              </div>
            </div>
            <div className="flex-1 text-[11.5px] font-normal leading-[1.75] text-taupe">
              Halaman ini bersifat penerangan dan anggaran sahaja, dan bukan kontrak takaful. Sumbangan dan manfaat
              sebenar tertakluk kepada terma produk, underwriting dan kelulusan Great Eastern Takaful Berhad.
              Menghantar borang di halaman ini tidak bermakna perlindungan telah bermula.
              <br />
              <br />
              Sila rujuk Product Disclosure Sheet dan kontrak sijil sebelum membuat keputusan.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 pt-14 lg:px-20 lg:pt-16">
      <div className="mx-auto max-w-[1280px]">
        <div className="text-center">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-taupe-2">{eyebrow}</div>
          <h2 className="mt-2.5 text-[26px] font-extrabold leading-tight tracking-[-0.025em] text-navy lg:text-[32px]">
            {title}
          </h2>
        </div>
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}

/* ---- icons: stroke-based, matching components/icons.tsx ---- */
const ArrowIcon = () => (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const CheckIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="flex-none">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const ChevronIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-none text-taupe transition-transform group-open:rotate-180">
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const PhoneIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--color-taupe)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-none">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </svg>
);
const MailIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--color-taupe)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-none">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 6 10-6" />
  </svg>
);
const ShieldIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-px flex-none">
    <path d="M12 3l7.5 3.6v5.2c0 4.5-3.1 8.2-7.5 9.2-4.4-1-7.5-4.7-7.5-9.2V6.6z" />
    <path d="M9.5 12l1.8 1.8 3.4-3.6" />
  </svg>
);
const SparkIcon = () => (
  <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
  </svg>
);
const StarIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="var(--color-gold)">
    <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z" />
  </svg>
);
const WaIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="#ffffff" className="flex-none">
    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.6 14.2c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2.1.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2 0 .4 0 .5l-.4.5-.3.3c-.1.1-.2.3 0 .5l.9 1.4c.6.8 1.2 1.1 1.5 1.3.3.1.4.1.6-.1l.7-.9c.2-.2.3-.2.5-.1l1.8.9c.2.1.4.2.4.3.1.1.1.5-.1 1z" />
  </svg>
);
