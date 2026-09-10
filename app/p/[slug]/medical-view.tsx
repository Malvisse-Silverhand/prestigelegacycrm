"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { PublicLandingPage } from "@/lib/landing-public";
import { tabsFor } from "@/lib/landing-content";
import { useLandingCapture } from "./use-landing-capture";

/**
 * The long-form medical card funnel.
 *
 * Same ownership, same capture, same counters and same calculators as every
 * other layout -- what differs is how much case it makes before it asks for
 * anything: the cost of treatment, what the cover does about it, why this
 * adviser, who they are, who else trusted them, and which operators are being
 * compared. The ask itself is the same calculator the other layouts end on.
 */
export function MedicalLandingView({ page }: { page: PublicLandingPage }) {
  const tabs = tabsFor(page.product);
  const [active, setActive] = useState(tabs[0].key);
  const captured = useLandingCapture(page.slug);
  const calcRef = useRef<HTMLDivElement>(null);
  const { content, agent } = page;

  // The adviser block falls back to the page's owning agent, so a page is
  // never published showing a blank name.
  const advisorName = content.advisorName.trim() || agent.fullName;

  const waHref = agent.waNumber
    ? `https://wa.me/${agent.waNumber}?text=${encodeURIComponent(
        `Salam ${agent.firstName}, saya lihat halaman anda dan nak tanya pasal medical card.`,
      )}`
    : undefined;

  function scrollToCalc() {
    calcRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-dvh bg-cream text-navy">
      {/* NAV */}
      <div className="sticky top-0 z-20 flex items-center gap-3 bg-navy px-5 py-3 lg:px-20">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-gold">
          <Image src="/logo.jpeg" alt="" width={32} height={32} className="h-8 w-8 rounded-[10px] object-cover" />
        </div>
        <div className="flex-1 truncate text-[14px] font-bold text-white lg:text-[15.5px]">
          {advisorName}
        </div>
        <button
          type="button"
          onClick={scrollToCalc}
          className="flex-none rounded-full bg-gold px-4 py-2 text-[12px] font-bold text-navy"
        >
          Dapatkan Sebut Harga
        </button>
      </div>

      {/* HERO */}
      <div className="bg-navy px-5 pb-12 pt-8 lg:px-20 lg:pb-16 lg:pt-14">
        <div className="mx-auto max-w-[1100px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold/[.14] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold">
              {content.heroEyebrow}
            </span>
          </div>
          <h1 className="mt-4 text-[30px] font-extrabold leading-[1.12] tracking-[-0.03em] text-white lg:text-[46px]">
            {content.heroHeadline}{" "}
            <span className="text-gold">{content.heroHighlight}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[46em] text-[14.5px] leading-relaxed text-white/70 lg:text-[16px]">
            {content.heroBody}
          </p>

          <div className="mt-7 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={scrollToCalc}
              className="w-full rounded-[13px] bg-gold px-7 py-4 text-[15px] font-bold text-navy sm:w-auto"
            >
              {content.heroCta}
            </button>
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12.5px] font-semibold text-white/60 underline underline-offset-4 hover:text-white"
              >
                Atau WhatsApp {agent.firstName} terus
              </a>
            )}
          </div>

          <div className="mt-8 grid gap-2.5 sm:grid-cols-3">
            {content.heroPoints.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-center gap-2 rounded-[12px] bg-white/[.06] px-4 py-3 text-[12.5px] font-semibold text-white/85"
              >
                <CheckIcon />
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* THE PROBLEM */}
      <Band>
        <Eyebrow>{content.problemEyebrow}</Eyebrow>
        <H2>{content.problemTitle}</H2>
        <p className="mx-auto mt-3 max-w-[46em] text-center text-[14px] leading-relaxed text-muted lg:text-[15px]">
          {content.problemBody}
        </p>

        <div className="mt-8 overflow-hidden rounded-card border border-sand bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-sand bg-cream px-5 py-3">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">
              Rawatan
            </span>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">
              Anggaran kos swasta
            </span>
          </div>
          {content.costRows.map((row, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 border-b border-sand-3 px-5 py-3.5 last:border-b-0"
            >
              <span className="text-[13.5px] font-semibold text-navy">{row.label}</span>
              <span className="flex-none text-[15px] font-extrabold tracking-[-0.02em] text-alert-red">
                {row.amount}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-center text-[11.5px] font-medium text-taupe">{content.costNote}</p>

        <div className="mt-7 grid gap-2.5 md:grid-cols-3">
          {content.newsHeadlines.map((h, i) => (
            <div key={i} className="rounded-[13px] border border-sand-2 bg-white px-4 py-3.5">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-alert-red">
                Berita
              </div>
              <div className="mt-1.5 text-[12.5px] font-semibold leading-relaxed text-navy">{h}</div>
            </div>
          ))}
        </div>
      </Band>

      {/* BENEFITS */}
      <Band tone="white">
        <Eyebrow>Manfaat utama</Eyebrow>
        <H2>{content.benefitsTitle}</H2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {content.benefits.map((b, i) => (
            <div key={i} className="flex gap-4 rounded-card border border-sand bg-cream p-5">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[13px] bg-success-bg">
                <ShieldIcon />
              </div>
              <div className="min-w-0">
                <div className="text-[15.5px] font-bold tracking-[-0.01em] text-navy">{b.title}</div>
                <div className="mt-1.5 text-[13px] leading-relaxed text-muted">{b.body}</div>
              </div>
            </div>
          ))}
        </div>
      </Band>

      {/* WHY ME */}
      <Band>
        <Eyebrow>Kenapa pilih saya</Eyebrow>
        <H2>{content.whyTitle}</H2>
        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {content.whyPoints.map((p, i) => (
            <div key={i} className="rounded-card border border-sand bg-white p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-navy text-[13px] font-bold text-gold">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="mt-3.5 text-[14.5px] font-bold tracking-[-0.01em] text-navy">{p.title}</div>
              <div className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{p.body}</div>
            </div>
          ))}
        </div>
      </Band>

      {/* ADVISER */}
      <Band tone="navy">
        <div className="grid items-center gap-8 lg:grid-cols-[260px_1fr]">
          <div className="mx-auto w-full max-w-[260px]">
            {content.advisorPhotoUrl ? (
              // Arbitrary external host (the agent pastes their own URL), so
              // this stays a plain <img>: next/image would need every one of
              // them in remotePatterns up front.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.advisorPhotoUrl}
                alt={advisorName}
                className="aspect-[4/5] w-full rounded-card object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center rounded-card bg-white/[.07] text-[46px] font-extrabold text-gold">
                {initialsOf(advisorName)}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gold">
              Perunding anda
            </div>
            <div className="mt-2 text-[26px] font-extrabold tracking-[-0.025em] text-white lg:text-[32px]">
              {advisorName}
            </div>
            <div className="mt-1 text-[13px] font-semibold text-white/60">{content.advisorTitle}</div>
            <p className="mt-4 max-w-[44em] text-[14px] leading-relaxed text-white/75">
              {content.advisorBio}
            </p>

            <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
              {content.advisorStats.map((s, i) => (
                <div key={i} className="rounded-[13px] bg-white/[.06] px-4 py-3">
                  <div className="text-[19px] font-extrabold tracking-[-0.02em] text-gold">{s.value}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/55">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Band>

      {/* TESTIMONIALS */}
      <Band tone="white">
        <Eyebrow>Apa kata mereka</Eyebrow>
        <H2>{content.testimonialsTitle}</H2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {content.testimonials.map((t, i) => (
            <div key={i} className="flex flex-col rounded-card border border-sand bg-cream p-5">
              <QuoteIcon />
              <p className="mt-3 flex-1 text-[13px] leading-relaxed text-ink">“{t.quote}”</p>
              <div className="mt-4 border-t border-sand-3 pt-3.5">
                <div className="text-[13px] font-bold text-navy">{t.name}</div>
                <div className="text-[11.5px] font-semibold text-taupe">{t.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </Band>

      {/* PROVIDERS */}
      <Band>
        <H2>{content.providersTitle}</H2>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          {content.providers.map((p, i) => (
            <div
              key={i}
              className="flex h-[58px] min-w-[150px] flex-1 items-center justify-center rounded-[13px] border border-sand-2 bg-white px-5 sm:flex-none"
            >
              {p.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.logoUrl} alt={p.name} className="max-h-[30px] max-w-[130px] object-contain" />
              ) : (
                <span className="text-center text-[12px] font-bold text-taupe-2">{p.name}</span>
              )}
            </div>
          ))}
        </div>
      </Band>

      {/* CALCULATOR -- the same one every layout ends on */}
      <div ref={calcRef} className="scroll-mt-16 bg-white px-5 py-12 lg:px-20 lg:py-16">
        <div className="mx-auto max-w-[1100px]">
          <div className="text-center">
            <Eyebrow>Langkah terakhir</Eyebrow>
            <H2>{content.closingTitle}</H2>
            <p className="mx-auto mt-3 max-w-[44em] text-[14px] leading-relaxed text-muted lg:text-[15px]">
              {content.closingBody}
            </p>
          </div>

          {tabs.length > 1 && (
            <div className="mt-7 flex justify-center">
              <div className="flex gap-1 rounded-[14px] border border-sand-2 bg-cream p-1.5">
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

          <p className="mt-4 text-center text-[11.5px] font-medium text-taupe">
            Maklumat anda sulit dan dilindungi. Dihantar terus kepada {agent.firstName} sahaja.
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="bg-navy px-5 py-8 text-center lg:px-20">
        <div className="text-[13px] font-bold text-white">{advisorName}</div>
        <div className="mt-1 text-[11.5px] font-medium text-white/45">
          {content.advisorTitle} · Prestige Legacy
        </div>
      </div>
    </div>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

function Band({
  children,
  tone = "cream",
}: {
  children: React.ReactNode;
  tone?: "cream" | "white" | "navy";
}) {
  const bg = tone === "white" ? "bg-white" : tone === "navy" ? "bg-navy" : "bg-cream";
  return (
    <div className={`${bg} px-5 py-12 lg:px-20 lg:py-16`}>
      <div className="mx-auto max-w-[1100px]">{children}</div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center text-[10.5px] font-bold uppercase tracking-[0.12em] text-taupe-2">
      {children}
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-2.5 text-center text-[24px] font-extrabold leading-tight tracking-[-0.025em] text-navy lg:text-[32px]">
      {children}
    </h2>
  );
}

function CheckIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className="flex-none text-gold">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-none text-green">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" className="text-gold">
      <path d="M7 7h4v4c0 2.5-1.5 4.5-4 5v-2c1.2-.4 2-1.4 2-2.5H7V7Zm7 0h4v4c0 2.5-1.5 4.5-4 5v-2c1.2-.4 2-1.4 2-2.5h-2V7Z" />
    </svg>
  );
}
