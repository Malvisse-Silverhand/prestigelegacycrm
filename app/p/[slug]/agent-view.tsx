"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PublicLandingPage } from "@/lib/landing-public";
import { tabsFor, type LandingAgentProduct } from "@/lib/landing-content";
import { AgentLeadForm } from "./agent-lead-form";
import { useLandingCapture } from "./use-landing-capture";

// Digital profile-card layout. Content structure (header, photo, name,
// socials, the GE Takaful logo box, quote, three CTAs, badges, products grid,
// a "Form" section, a call button and the footer) follows the plan; the
// visual treatment is a deliberate departure from the reference site per
// Kamal's design brief -- a modern, fluid, red-themed card with scroll
// reveals and a few small CSS animations, all `prefers-reduced-motion`-safe.
//
// The "Form" section keeps the same calculator embeds every other layout
// uses (tabsFor(page.product), the real /tools/*.html iframes, captured via
// the shared useLandingCapture postMessage listener) and adds the new
// 7-field agent lead form underneath -- calculator first, then the form,
// stacked rather than as sibling tabs, because every other section on this
// page is already a vertical stack and a second, unrelated tab strip right
// next to the calculator's own tab strip reads as two competing controls on
// a narrow screen.

const RED = "#D23B44";
const RED_DARK = "#A82C34";
const RED_LIGHT = "#FDEEEF";

function withName(text: string, name: string) {
  return text.replaceAll("{nama}", name);
}

const BADGE_ICONS = [ShieldCheckIcon, HeartHandshakeIcon, BadgePercentIcon];
const PRODUCT_ICONS = [CreditCardIcon, GiftIcon, ShieldIcon, ActivityIcon];

export function AgentLandingView({ page }: { page: PublicLandingPage }) {
  const { content, agent } = page;
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [geLogoOk, setGeLogoOk] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabs = tabsFor(page.product);
  const [activeTab, setActiveTab] = useState(tabs[0].key);
  const captured = useLandingCapture(page.slug);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // Page-level overrides win; otherwise fall back to the agent's own default
  // images from Settings > My Profile.
  const headerUrl = content.agentHeaderUrl || agent.headerUrl || "";
  const photoUrl = content.agentPhotoUrl || agent.photoUrl || "";
  const personalLogoUrl = content.agentLogoUrl || agent.logoUrl || "";
  const year = new Date().getFullYear();

  const socials = [
    { key: "tiktok", url: content.agentSocials.tiktok, bg: "#000000", icon: <TikTokIcon /> },
    { key: "threads", url: content.agentSocials.threads, bg: "#000000", icon: <ThreadsIcon /> },
    {
      key: "instagram",
      url: content.agentSocials.instagram,
      bg: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)",
      icon: <InstagramIcon />,
    },
    { key: "facebook", url: content.agentSocials.facebook, bg: "#1877F2", icon: <FacebookIcon /> },
  ].filter((s) => s.url.trim());

  const waHref = agent.waNumber
    ? `https://wa.me/${agent.waNumber}?text=${encodeURIComponent(withName(content.agentWhatsappMessage, agent.firstName))}`
    : null;

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  function selectProduct(p: LandingAgentProduct) {
    setSelectedInterest(p.interest);
    showToast(`Pilihan '${p.name}' telah dipilih!`);
    document.getElementById("borang")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = { title: agent.fullName, text: content.agentQuote, url };
    let shared = false;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(shareData);
        shared = true;
      } catch {
        // Cancelled or unsupported -- fall through to clipboard.
      }
    }
    if (shared) return;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Pautan profil berjaya disalin ke clipboard!");
    } catch {
      showToast("Tidak dapat menyalin pautan.");
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-[#FDEEEF] md:py-10">
      <style>{AGENT_LP_CSS}</style>

      <div className="relative mx-auto w-full max-w-md overflow-hidden bg-white shadow-none md:max-w-lg md:rounded-[2rem] md:shadow-2xl">
        {/* HEADER */}
        <div className="relative h-52 overflow-hidden sm:h-56">
          {headerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary agent-uploaded URL
            <img src={headerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- local asset shown behind a color overlay
            <img src="/brand/ge-pattern-red.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: headerUrl
                ? "linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.42))"
                : `linear-gradient(150deg, ${RED}e6, ${RED_DARK}f5)`,
            }}
          />
          {!headerUrl && (
            <>
              <span
                className="agentlp-blob agentlp-blob-a"
                style={{ width: 170, height: 170, top: -50, left: -40, background: "#ffffff" }}
              />
              <span
                className="agentlp-blob agentlp-blob-b"
                style={{ width: 210, height: 210, bottom: -80, right: -60, background: "#ffffff" }}
              />
              <div
                className="absolute inset-0 opacity-[0.14]"
                style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "16px 16px" }}
              />
            </>
          )}
          {personalLogoUrl && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 py-1 pl-1 pr-3 shadow-md backdrop-blur">
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary agent-uploaded URL */}
              <img src={personalLogoUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
              <span className="text-[10.5px] font-bold text-slate-700">{agent.firstName}</span>
            </div>
          )}
        </div>

        {/* PHOTO */}
        <div className="relative -mt-16 flex justify-center px-6 sm:-mt-[4.6rem]">
          <div className="relative h-32 w-32 sm:h-36 sm:w-36">
            <div
              className="agentlp-ring absolute -inset-1 rounded-full"
              style={{ background: `conic-gradient(${RED}, ${RED_LIGHT}, ${RED_DARK}, ${RED})` }}
            />
            <div className="absolute inset-[3px] rounded-full bg-white" />
            <div className="absolute inset-[6px] overflow-hidden rounded-full bg-white shadow-inner">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary agent-uploaded URL
                <img src={photoUrl} alt={agent.fullName} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-[34px] font-extrabold"
                  style={{ background: RED_LIGHT, color: RED_DARK }}
                >
                  {agent.initials}
                </div>
              )}
            </div>
            <div
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white shadow-md"
              style={{ background: RED }}
            >
              <AwardIcon />
            </div>
          </div>
        </div>

        {/* NAME + TAGLINES */}
        <Reveal className="mt-4 px-6 text-center">
          <h1 className="text-[clamp(20px,5vw,26px)] font-extrabold uppercase leading-tight tracking-tight text-slate-900">
            {agent.fullName}
          </h1>
          <div className="mt-1.5 text-[12.5px] font-bold uppercase tracking-wider" style={{ color: RED }}>
            {content.agentTagline}
          </div>
          <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
            {content.agentSubTagline}
          </div>
        </Reveal>

        {/* SOCIALS */}
        {socials.length > 0 && (
          <Reveal className="mt-4 flex justify-center gap-3 px-6" delay={60}>
            {socials.map((s) => (
              <a
                key={s.key}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="press flex h-11 w-11 items-center justify-center rounded-full text-white shadow-md transition-transform duration-200 hover:-translate-y-1"
                style={{ background: s.bg }}
                aria-label={s.key}
              >
                {s.icon}
              </a>
            ))}
          </Reveal>
        )}

        {/* GE TAKAFUL LOGO BOX */}
        {geLogoOk && (
          <Reveal className="mt-5 flex justify-center px-6" delay={90}>
            <div className="flex w-full max-w-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element -- needs onError to hide the box gracefully */}
              <img
                src="/brand/great-eastern-takaful.png"
                alt="Great Eastern Takaful"
                className="h-10 w-full object-contain"
                onError={() => setGeLogoOk(false)}
              />
            </div>
          </Reveal>
        )}

        {/* QUOTE */}
        <Reveal className="mt-5 px-6" delay={120}>
          <div className="relative overflow-hidden rounded-2xl px-5 py-4" style={{ background: RED_LIGHT }}>
            <div className="absolute -right-2 -top-3 opacity-40" style={{ color: RED }}>
              <QuoteIcon />
            </div>
            <p className="relative text-[12.5px] font-medium italic leading-relaxed text-slate-700">
              {content.agentQuote}
            </p>
          </div>
        </Reveal>

        {/* THREE CTAs */}
        <Reveal className="mt-5 flex flex-col gap-2.5 px-6" delay={150}>
          <a
            href="#borang"
            className="press flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-[13.5px] font-bold text-white shadow-md transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <ClipboardIcon /> {content.agentCtaForm}
          </a>
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="press flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[13.5px] font-bold text-white shadow-lg transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: `linear-gradient(135deg, ${RED}, ${RED_DARK})`, boxShadow: `0 12px 28px -10px ${RED}80` }}
            >
              <MessageIcon /> {content.agentCtaWhatsapp}
            </a>
          )}
          <button
            type="button"
            onClick={share}
            className="press flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 py-3.5 text-[13.5px] font-bold text-slate-700 transition-transform duration-200 hover:-translate-y-0.5 hover:border-slate-300 active:translate-y-0"
          >
            <ShareIcon /> {content.agentCtaShare}
          </button>
        </Reveal>

        {/* TRUST BADGES */}
        {content.agentBadges.length > 0 && (
          <Reveal className="mt-5 grid grid-cols-3 gap-2.5 px-6" delay={180}>
            {content.agentBadges.map((b, i) => {
              const Icon = BADGE_ICONS[i % BADGE_ICONS.length];
              return (
                <div key={i} className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 px-2 py-3 text-center">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: RED_LIGHT, color: RED_DARK }}
                  >
                    <Icon />
                  </div>
                  <span className="text-[10px] font-bold leading-tight text-slate-600">{b}</span>
                </div>
              );
            })}
          </Reveal>
        )}

        {/* PRODUCTS */}
        {content.agentProducts.length > 0 && (
          <Reveal className="mt-6 px-6" delay={210}>
            <div
              className="rounded-2xl border p-4"
              style={{ background: `linear-gradient(180deg, ${RED_LIGHT}, #ffffff)`, borderColor: `${RED}33` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: RED }}>
                    <SparklesIcon />
                  </span>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: RED_DARK }}>
                    {content.agentProductsTitle}
                  </span>
                </div>
                <span
                  className="motion-safe:animate-pulse rounded-full px-2.5 py-1 text-[9.5px] font-bold text-white"
                  style={{ background: RED }}
                >
                  {content.agentProductsPill}
                </span>
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                {content.agentProducts.map((p, i) => {
                  const selected = selectedInterest === p.interest;
                  const Icon = PRODUCT_ICONS[i % PRODUCT_ICONS.length];
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectProduct(p)}
                      className="press relative flex min-h-[95px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 bg-white px-2 py-3 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:translate-y-0"
                      style={{
                        borderColor: selected ? RED : "#e2e8f0",
                        boxShadow: selected ? `0 10px 22px -8px ${RED}66` : undefined,
                      }}
                    >
                      {p.badge && (
                        <span
                          className="absolute -top-2 right-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white shadow"
                          style={{ background: p.badge === "Syor" ? "#F59E0B" : RED }}
                        >
                          {p.badge}
                        </span>
                      )}
                      <span style={{ color: selected ? RED : "#94a3b8" }}>
                        <Icon />
                      </span>
                      <span className="text-[11.5px] font-bold text-slate-700">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Reveal>
        )}

        {/* FORM -- the existing calculator embeds, then the new lead form */}
        <div id="borang" className="mt-6 scroll-mt-6 px-5">
          <Reveal delay={220}>
            <div className="rounded-2xl bg-white p-4 shadow-[0_2px_24px_-8px_rgba(15,23,42,0.12)] sm:p-5">
              <div className="text-center">
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: RED_LIGHT, color: RED_DARK }}
                >
                  Kalkulator Pantas
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
                  Kira anggaran caruman anda dahulu, atau terus isi borang di bawah.
                </p>
              </div>

              {tabs.length > 1 && (
                <div className="mt-4 flex justify-center gap-1 rounded-xl bg-slate-100 p-1.5">
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key)}
                      className={`press flex-1 rounded-[9px] px-3 py-2.5 text-[12.5px] font-bold transition-colors ${
                        activeTab === t.key ? "bg-slate-900 text-white" : "text-slate-500"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Each tab keeps its own iframe mounted -- switching tabs must
                  not throw away a half-filled form or a calculated estimate. */}
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                {tabs.map((t) => (
                  <div key={t.key} hidden={activeTab !== t.key}>
                    <iframe
                      src={`/tools/${t.tool}?wa=${encodeURIComponent(agent.waNumber)}&lp=${encodeURIComponent(page.slug)}`}
                      title={t.label}
                      className="h-[1500px] w-full border-0 bg-white"
                    />
                  </div>
                ))}
              </div>

              {captured && (
                <div className="mt-3.5 flex items-center gap-2.5 rounded-xl bg-success-bg px-3.5 py-3">
                  <CheckCircleIcon />
                  <span className="text-[12px] font-semibold text-green">
                    Maklumat anda dah sampai kepada {agent.firstName}. Beliau akan hubungi anda tak lama lagi.
                  </span>
                </div>
              )}
            </div>
          </Reveal>

          <div className="mt-5">
            <Reveal delay={250}>
              <AgentLeadForm
                slug={page.slug}
                content={content}
                agentFirstName={agent.firstName}
                waNumber={agent.waNumber}
                interest={selectedInterest}
              />
            </Reveal>
          </div>
        </div>

        {/* CALL CTA */}
        {agent.phone && (
          <Reveal className="mt-4 px-5" delay={270}>
            <a
              href={`tel:${agent.phone}`}
              className="press flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-[13.5px] font-bold text-white shadow-md transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <PhoneIcon /> {content.agentCallCta}
            </a>
          </Reveal>
        )}

        {/* FOOTER */}
        <div className="mt-6 bg-slate-50 px-6 py-6 text-center">
          <div className="text-[10px] font-medium text-slate-400">
            © {year} {agent.fullName}. Hak Cipta Terpelihara.
          </div>
          <div className="mt-1 text-[10px] font-medium text-slate-400">{content.agentFooterLine}</div>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div
          className="agentlp-toast fixed left-1/2 top-4 z-50 flex items-center gap-2 rounded-full bg-slate-900/95 px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-xl"
          role="status"
        >
          <CheckCircleIcon />
          {toast}
        </div>
      )}
    </div>
  );
}

// Fades and lifts a section in once it's roughly 12% visible. Falls back to
// showing content immediately with no observer, no window, or when the
// visitor asked for less motion -- reduced motion should never mean "content
// stuck at opacity 0".
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Computed once, synchronously, rather than set from inside the effect
  // below: with no observer support or reduced motion, there's nothing to
  // wait for, so the initial render should already be the final one.
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
    // `visible` is read only to skip re-subscribing once it flips true; the
    // observer must not re-attach when it does, so it's deliberately left out
    // of the dependency array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      className={`${visible ? "agentlp-rise" : "opacity-0"} ${className}`}
      style={visible ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

const AGENT_LP_CSS = `
@keyframes agentlp-float-a { 0%, 100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(16px,-20px,0) scale(1.08); } }
@keyframes agentlp-float-b { 0%, 100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(-18px,16px,0) scale(1.1); } }
@keyframes agentlp-spin-slow { to { transform: rotate(360deg); } }
@keyframes agentlp-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes agentlp-toast-in { from { opacity: 0; transform: translate(-50%,-14px); } to { opacity: 1; transform: translate(-50%,0); } }
@keyframes agentlp-ring-flash { 0%, 45%, 100% { box-shadow: 0 0 0 0 rgba(210,59,68,0); } 20% { box-shadow: 0 0 0 6px rgba(210,59,68,.28); } }

.agentlp-blob { position: absolute; border-radius: 9999px; filter: blur(30px); opacity: .5; pointer-events: none; }
.agentlp-blob-a { animation: agentlp-float-a 9s ease-in-out infinite; }
.agentlp-blob-b { animation: agentlp-float-b 11s ease-in-out infinite; }
.agentlp-ring { animation: agentlp-spin-slow 16s linear infinite; }
.agentlp-rise { animation: agentlp-rise .6s cubic-bezier(.2,.7,.2,1) both; }
.agentlp-toast { animation: agentlp-toast-in .28s ease-out both; left: 50%; }
.agentlp-ring-flash { animation: agentlp-ring-flash 1.1s ease-out; }

@media (prefers-reduced-motion: reduce) {
  .agentlp-blob-a, .agentlp-blob-b, .agentlp-ring, .agentlp-rise, .agentlp-toast, .agentlp-ring-flash {
    animation: none !important;
  }
  .agentlp-toast { transform: translate(-50%,0); }
}
`;

function AwardIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function HeartHandshakeIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M12 5.36 8.87 8.5a2.13 2.13 0 0 0 0 3l.13.12a2.18 2.18 0 0 0 3 0l.5-.48a2.19 2.19 0 0 1 3 0l2.5 2.5" />
      <path d="m18 15-2-2" />
      <path d="m15 18-2-2" />
    </svg>
  );
}

function BadgePercentIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.75Z" />
      <path d="m15 9-6 6" />
      <path d="M9 9h.01" />
      <path d="M15 15h.01" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8" />
      <path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.734 1.6l-.46.36a1 1 0 0 0-.303 1.212 12.04 12.04 0 0 0 6.336 6.335Z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 7h4v4c0 2.5-1.5 4.5-4 5v-2c1.2-.4 2-1.4 2-2.5H7V7Zm7 0h4v4c0 2.5-1.5 4.5-4 5v-2c1.2-.4 2-1.4 2-2.5h-2V7Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 2h-3v13.2a2.8 2.8 0 1 1-2-2.68v-3.1a5.9 5.9 0 1 0 5 5.83V9.4a7.4 7.4 0 0 0 3.8 1.06V7.44A4.6 4.6 0 0 1 16.5 2Z" />
    </svg>
  );
}

function ThreadsIcon() {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
      <path d="M12 2a9 9 0 1 0 9 9c0-2.8-1.4-4.7-3.4-4.7-1.3 0-2.2.75-2.7 1.7.3-1.9-.5-3.1-2.1-3.1-1.6 0-2.8 1.3-2.8 3.4 0 2.5 1.8 4.1 4.3 4.1 2.7 0 4.5-1.7 4.5-4.1 0-.5-.05-.95-.15-1.35" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="#fff" strokeWidth={1.8} />
      <circle cx="12" cy="12" r="4" stroke="#fff" strokeWidth={1.8} />
      <circle cx="17.4" cy="6.6" r="1.15" fill="#fff" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="#fff">
      <path d="M13.5 9H15V6.5h-1.5C11.6 6.5 10 8 10 10v1.5H8V14h2v7h2.5v-7H15l.5-2.5h-3V10c0-.6.4-1 1-1Z" />
    </svg>
  );
}
