"use client";

import { useState, useSyncExternalStore } from "react";
import type { PortalPayload } from "@/lib/client-portal";
import {
  PORTAL_STATUS_COPY,
  PORTAL_CONDITIONS,
  PORTAL_PERIODS,
  PORTAL_COVER_NOTES,
  PORTAL_GUIDES,
  OFFICIAL_PORTAL_URL,
  type PortalLang,
} from "@/lib/portal-copy";

type Tab = "cert" | "benefits" | "waiting" | "nominees" | "guides";

// Two small preferences, kept on the client's own device. Nothing is sent
// back: the portal is view-only in both directions.
const LANG_KEY = "pl-portal-lang";
const ONBOARD_KEY = "pl-portal-onboarded";

const COPY = {
  bm: {
    portalTag: "Portal Klien",
    helpAria: "Panduan portal",
    certEyebrow: "Sijil Takaful Anda",
    certNo: "No. Sijil",
    plan: "Pelan Asas",
    contribution: "Sumbangan",
    commenced: "Mula Perlindungan",
    nextDue: "Sumbangan Seterusnya",
    riderMore: "+ {n} manfaat tambahan",
    noCert: "Belum dikeluarkan",
    tabCert: "Sijil",
    tabBenefits: "Manfaat",
    tabWaiting: "Tempoh",
    tabNominees: "Penama",
    tabGuides: "Panduan",
    benefitsTitle: "Manfaat Anda",
    benefitsSub: "Senarai manfaat yang direkodkan dalam sijil anda, berserta jumlah perlindungan.",
    sumCovered: "Jumlah Dilindungi",
    base: "Asas",
    rider: "Tambahan",
    notStated: "Tidak dinyatakan",
    waitingTitle: "Tempoh Menunggu",
    waitingSub: "Dikira dari tarikh mula perlindungan anda, {date}. Ketik mana-mana kategori untuk lihat senarai penuh.",
    included: "Termasuk",
    tapForInfo: "Ketik mana-mana penyakit untuk penerangan ringkas.",
    covered: "DILINDUNGI",
    coveredSince: "Dilindungi sejak",
    coveredFrom: "Dilindungi mulai",
    daysLeft: "LAGI {n} HARI",
    coveredCount: "{n} dari {total} sudah aktif",
    notesTitle: "Perkara Penting",
    nomineeTitle: "Penama Anda",
    nomineeSub: "Nama dan bahagian peratusan seperti yang direkodkan dalam sijil anda.",
    nomineeFoot: "Untuk menukar penama atau peratusan, sila hubungi ejen anda. Perubahan perlu dibuat melalui borang rasmi Great Eastern Takaful.",
    nomineeEmpty: "Tiada penama direkodkan lagi. Sila hubungi ejen anda.",
    allocated: "{n}% diagihkan",
    officialEyebrow: "Sistem Rasmi",
    officialTitle: "Portal Great Eastern Takaful",
    officialNote: "eConnect — sijil, penyata dan tuntutan rasmi anda.",
    guidesTitle: "Panduan Anda",
    guidesSub: "Panduan yang dipaparkan mengikut manfaat dalam sijil anda.",
    agentTitle: "Ejen Anda",
    agentRole: "Perunding Takaful Bertauliah",
    agentCta: "Hubungi melalui WhatsApp",
    onboardTitle: "Selamat datang",
    onboardSub: "Tiga perkara sebelum anda mula.",
    onboardCta: "Saya faham, mula",
    onboardMute: "Jangan tunjuk lagi",
    onboardSteps: [
      ["Guna menu di bawah", "{tabs} — semuanya satu ketikan sahaja."],
      ["Tukar BM / EN di atas", "Seluruh portal bertukar bahasa serta-merta."],
      ["Paparan sahaja", "Ini portal agensi untuk rujukan. Untuk urusan rasmi, gunakan butang Portal Great Eastern Takaful."],
    ],
    lapsedTitle: "Perlindungan anda tidak aktif",
    lapsedBody: "Rekod kami menunjukkan sijil ini tidak lagi aktif. Sila hubungi ejen anda untuk menyemak status sebenar dan pilihan pemulihan.",
    pendingTitle: "Sijil sedang diproses",
    pendingBody: "Permohonan anda telah dihantar dan sedang dinilai. Ejen anda akan memaklumkan sebaik sahaja sijil aktif.",
    disclaimerTitle: "Portal agensi, bukan sistem rasmi",
    disclaimerBody:
      "Portal ini disediakan oleh agensi Prestige Legacy sebagai rujukan mudah. Ia bukan sistem rasmi Great Eastern Takaful Berhad. Maklumat di sini adalah salinan rekod ejen anda. Untuk maklumat rasmi sijil, tuntutan dan pembayaran, sila rujuk saluran rasmi Great Eastern Takaful atau hubungi ejen anda.",
    footerViewOnly: "Paparan sahaja · Prestige Legacy",
  },
  en: {
    portalTag: "Client Portal",
    helpAria: "Portal guide",
    certEyebrow: "Your Takaful Certificate",
    certNo: "Certificate No.",
    plan: "Base Plan",
    contribution: "Contribution",
    commenced: "Cover Start",
    nextDue: "Next Contribution",
    riderMore: "+ {n} additional benefits",
    noCert: "Not yet issued",
    tabCert: "Certificate",
    tabBenefits: "Benefits",
    tabWaiting: "Waiting",
    tabNominees: "Nominees",
    tabGuides: "Guides",
    benefitsTitle: "Your Benefits",
    benefitsSub: "The benefits recorded on your certificate, with the sum covered for each.",
    sumCovered: "Sum Covered",
    base: "Base",
    rider: "Rider",
    notStated: "Not stated",
    waitingTitle: "Waiting Periods",
    waitingSub: "Counted from your cover start date, {date}. Tap any category to see the full list.",
    included: "Included",
    tapForInfo: "Tap any illness for a plain-language explanation.",
    covered: "COVERED",
    coveredSince: "Covered since",
    coveredFrom: "Covered from",
    daysLeft: "{n} DAYS LEFT",
    coveredCount: "{n} of {total} active",
    notesTitle: "Worth Knowing",
    nomineeTitle: "Your Nominees",
    nomineeSub: "Names and percentage shares as recorded on your certificate.",
    nomineeFoot: "To change a nominee or a percentage, speak to your agent. Changes have to go through Great Eastern Takaful's official form.",
    nomineeEmpty: "No nominees recorded yet. Please speak to your agent.",
    allocated: "{n}% allocated",
    officialEyebrow: "Official System",
    officialTitle: "Great Eastern Takaful Portal",
    officialNote: "eConnect — your official certificate, statements and claims.",
    guidesTitle: "Your Guides",
    guidesSub: "The guides shown here follow the benefits on your certificate.",
    agentTitle: "Your Agent",
    agentRole: "Licensed Takaful Consultant",
    agentCta: "Message on WhatsApp",
    onboardTitle: "Welcome",
    onboardSub: "Three things before you start.",
    onboardCta: "Got it, let's go",
    onboardMute: "Don't show this again",
    onboardSteps: [
      ["Use the menu below", "{tabs} — each one tap away."],
      ["Switch BM / EN at the top", "The whole portal changes language straight away."],
      ["View only", "This is an agency portal for reference. For anything official, use the Great Eastern Takaful Portal button."],
    ],
    lapsedTitle: "Your cover is not active",
    lapsedBody: "Our records show this certificate is no longer active. Please contact your agent to check the current status and your options for reinstating it.",
    pendingTitle: "Certificate being processed",
    pendingBody: "Your application has been submitted and is being assessed. Your agent will let you know as soon as the certificate is inforce.",
    disclaimerTitle: "Agency portal, not the official system",
    disclaimerBody:
      "This portal is provided by the Prestige Legacy agency for easy reference. It is not the official system of Great Eastern Takaful Berhad. What you see here is a copy of your agent's records. For official certificate, claim and payment information, please use Great Eastern Takaful's own channels or speak to your agent.",
    footerViewOnly: "View only · Prestige Legacy",
  },
} as const;

// Either language, widened: the two blocks have identical shapes but `as const`
// gives each field its own literal type, so a helper taking one would refuse
// the other.
type Copy = (typeof COPY)[PortalLang];

const FREQUENCY_LABEL: Record<PortalLang, Record<string, string>> = {
  bm: { monthly: "sebulan", quarterly: "suku tahun", half_yearly: "setengah tahun", yearly: "setahun" },
  en: { monthly: "a month", quarterly: "a quarter", half_yearly: "a half year", yearly: "a year" },
};

const STATUS_TONE: Record<string, string> = {
  green: "bg-success-bg text-green",
  gold: "bg-warn-gold-bg text-warn-gold-text",
  red: "bg-alert-red-bg text-alert-red",
  grey: "bg-sand-2 text-taupe-2",
};

function fmtDate(key: string | null): string {
  if (!key) return "—";
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

function fmtRM(value: number | null): string | null {
  if (value === null) return null;
  return `RM${value.toLocaleString("en-MY", { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

const LANGS = ["bm", "en"] as const;
const FLAGS = ["0", "1"] as const;

/**
 * A preference that lives on the client's own device.
 *
 * localStorage is an external store whose value the server cannot know, so it
 * is read through useSyncExternalStore rather than in an effect: the server
 * snapshot is the default, which is what gets rendered into the HTML and what
 * React hydrates against, and the real value arrives on the first client
 * render. Reading it during render would make the first paint disagree with
 * the server's HTML; reading it in an effect would work but costs a cascading
 * render and hides the fact that this is external state.
 *
 * Every access is wrapped: in a private window, or with site data blocked,
 * localStorage throws on read as well as write. The portal has to work anyway
 * -- the client just gets the default each visit.
 */
function useDevicePref<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  return useSyncExternalStore(
    subscribePrefs,
    () => {
      try {
        const value = window.localStorage.getItem(key);
        return allowed.includes(value as T) ? (value as T) : fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
}

// localStorage fires "storage" only for OTHER tabs, so writes from this one
// are announced here. Module-level, because the store is.
const prefListeners = new Set<() => void>();

function subscribePrefs(onChange: () => void) {
  prefListeners.add(onChange);
  return () => {
    prefListeners.delete(onChange);
  };
}

function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Nothing to do: the choice still applies for this render, it just will
    // not survive a reload.
  }
  for (const listener of prefListeners) listener();
}

export function PortalView({ payload }: { payload: PortalPayload }) {
  const [tab, setTab] = useState<Tab>("cert");
  const [openPeriod, setOpenPeriod] = useState<string | null>(null);
  const [openTip, setOpenTip] = useState<string | null>(null);
  // null = follow the saved preference; set only when the client opens the
  // welcome card from the ? button or dismisses it this visit.
  const [onboardOverride, setOnboardOverride] = useState<boolean | null>(null);

  const lang = useDevicePref(LANG_KEY, "bm", LANGS);
  const dismissed = useDevicePref(ONBOARD_KEY, "0", FLAGS);
  const showOnboard = onboardOverride ?? dismissed !== "1";

  function chooseLang(next: PortalLang) {
    writePref(LANG_KEY, next);
  }

  function dismissOnboard(permanent: boolean) {
    setOnboardOverride(false);
    if (permanent) writePref(ONBOARD_KEY, "1");
  }

  const t = COPY[lang];
  const status = PORTAL_STATUS_COPY[payload.status];
  const periods = PORTAL_PERIODS[lang];
  const conditions = PORTAL_CONDITIONS[lang];

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "cert", label: t.tabCert, icon: <IconCert /> },
    { key: "benefits", label: t.tabBenefits, icon: <IconShield /> },
    // The Waiting tab exists only where a medical benefit is attached, so a
    // hibah-only certificate gets four tabs rather than an empty fifth.
    ...(payload.hasMedical ? [{ key: "waiting" as Tab, label: t.tabWaiting, icon: <IconClock /> }] : []),
    { key: "nominees", label: t.tabNominees, icon: <IconPeople /> },
    { key: "guides", label: t.tabGuides, icon: <IconBook /> },
  ];

  // "A, B, C dan D" / "A, B, C and D", from whichever tabs this certificate has.
  const tabNames = tabs.map((item) => item.label);
  const tabList =
    tabNames.slice(0, -1).join(", ") + (lang === "bm" ? " dan " : " and ") + tabNames[tabNames.length - 1];

  const activeCount = payload.waitingPeriods.filter((p) => p.active).length;
  const allocated = payload.nominees.reduce((sum, n) => sum + (n.percentage ?? 0), 0);

  return (
    <div className="relative flex min-h-screen flex-col bg-cream">
      {/* Top bar */}
      <header className="flex items-center gap-2.5 bg-navy px-4 py-3">
        <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-gold">
          <IconShield className="h-[17px] w-[17px] text-navy" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold leading-tight tracking-[-0.01em] text-white">Prestige Legacy</div>
          <div className="text-[9.5px] font-semibold uppercase leading-snug tracking-[0.1em] text-gold">{t.portalTag}</div>
        </div>
        <button
          type="button"
          onClick={() => setOnboardOverride(true)}
          aria-label={t.helpAria}
          className="press flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/10"
        >
          <IconHelp className="h-[15px] w-[15px] text-gold" />
        </button>
        <div className="flex flex-none gap-0.5 rounded-full bg-white/10 p-[3px]">
          {(["bm", "en"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => chooseLang(code)}
              className={`press min-h-8 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
                lang === code ? "bg-gold text-navy" : "text-white/60"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3.5 px-4 pt-4">
        {/* A certificate that is not inforce says so before anything else. */}
        {payload.status !== "inforce" && (
          <div
            className={`rounded-[16px] border p-4 ${
              status.tone === "red" ? "border-[#f0cdc9] bg-alert-red-bg" : "border-sand-2 bg-warn-gold-bg"
            }`}
          >
            <div className={`text-[13px] font-bold ${status.tone === "red" ? "text-alert-red" : "text-warn-gold-text"}`}>
              {payload.status === "pending" ? t.pendingTitle : t.lapsedTitle}
            </div>
            <div className="mt-1.5 text-[11.5px] font-medium leading-relaxed text-ink">
              {payload.status === "pending" ? t.pendingBody : t.lapsedBody}
            </div>
          </div>
        )}

        {tab === "cert" && (
          <>
            <section className="rounded-[20px] bg-navy p-[18px] shadow-[0_8px_20px_-12px_rgba(15,37,64,.4)]">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gold">{t.certEyebrow}</div>
              <div className="mt-1.5 text-[19px] font-bold leading-tight tracking-[-0.02em] text-white">
                {payload.clientName}
              </div>

              <div className="mt-3.5 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5 rounded-[12px] bg-white/[0.07] px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-white/50">{t.certNo}</div>
                    <div className="mt-0.5 font-mono text-[16px] font-bold tracking-[0.02em] text-white">
                      {payload.certificateNo ?? t.noCert}
                    </div>
                  </div>
                  <span className={`flex-none rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.06em] ${STATUS_TONE[status.tone]}`}>
                    {status[lang]}
                  </span>
                </div>

                {/* The plan is named by its base benefit -- there is no separate
                    plan label anywhere in this portal. */}
                <div className="rounded-[12px] bg-white/[0.07] px-3.5 py-3">
                  <div className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-white/50">{t.plan}</div>
                  <div className="mt-1 text-[14px] font-bold leading-snug text-white">{payload.planName ?? "—"}</div>
                  {payload.benefits.length > 1 && (
                    <div className="mt-1 text-[11px] font-medium text-white/60">
                      {t.riderMore.replace("{n}", String(payload.benefits.length - 1))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[12px] bg-white/[0.07] px-3.5 py-3">
                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-white/50">{t.contribution}</div>
                    <div className="mt-1 text-[13px] font-bold text-gold">
                      {fmtRM(payload.contribution) ?? "—"}
                      <span className="font-medium text-white/50">
                        {payload.contribution !== null && ` / ${FREQUENCY_LABEL[lang][payload.frequency] ?? payload.frequency}`}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-[12px] bg-white/[0.07] px-3.5 py-3">
                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-white/50">{t.commenced}</div>
                    <div className="mt-1 text-[13px] font-bold text-white">{fmtDate(payload.commencementDate)}</div>
                  </div>
                </div>

                {payload.nextDueDate && payload.status === "inforce" && (
                  <div className="rounded-[12px] bg-white/[0.07] px-3.5 py-3">
                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-white/50">{t.nextDue}</div>
                    <div className="mt-1 text-[13px] font-bold text-white">{fmtDate(payload.nextDueDate)}</div>
                  </div>
                )}
              </div>
            </section>

            <AgentCard payload={payload} t={t} />
          </>
        )}

        {tab === "benefits" && (
          <section>
            <h2 className="text-[15px] font-bold tracking-[-0.01em] text-navy">{t.benefitsTitle}</h2>
            <p className="mt-0.5 text-[11.5px] font-medium leading-relaxed text-muted">{t.benefitsSub}</p>
            <div className="mt-3 flex flex-col gap-2.5">
              {payload.benefits.map((b, i) => (
                <div key={`${b.name}-${i}`} className="rounded-[16px] border border-sand bg-white p-3.5 shadow-card">
                  <div className="flex items-start gap-2.5">
                    <div className="min-w-0 flex-1 text-[13px] font-bold leading-snug tracking-[-0.01em] text-navy">
                      {b.name}
                    </div>
                    <span
                      className={`flex-none rounded-full px-2.5 py-1 text-[9.5px] font-bold tracking-[0.05em] ${
                        b.isBase ? "bg-navy text-gold" : "bg-sand-3 text-muted"
                      }`}
                    >
                      {b.isBase ? t.base : t.rider}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between gap-2.5 border-t border-sand-3 pt-2.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-taupe-2">{t.sumCovered}</span>
                    <span className="text-[14px] font-extrabold tracking-[-0.02em] text-navy">
                      {fmtRM(b.sumCovered) ?? t.notStated}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {payload.hasMedical && (
              <div className="mt-3.5 rounded-[16px] border border-sand-2 bg-sand-3 p-4">
                <div className="flex items-center gap-2">
                  <IconInfo className="h-[15px] w-[15px] text-warn-gold-text" />
                  <span className="text-[13px] font-bold text-navy">{t.notesTitle}</span>
                </div>
                <ul className="mt-2.5 flex flex-col gap-2">
                  {PORTAL_COVER_NOTES[lang].map((note) => (
                    <li key={note} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-warn-gold-text" />
                      <span className="text-[11.5px] font-medium leading-relaxed text-ink">{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {tab === "waiting" && (
          <section>
            <div className="flex items-baseline justify-between gap-2.5">
              <h2 className="text-[15px] font-bold tracking-[-0.01em] text-navy">{t.waitingTitle}</h2>
              <span className="text-[11px] font-semibold text-green">
                {t.coveredCount.replace("{n}", String(activeCount)).replace("{total}", String(payload.waitingPeriods.length))}
              </span>
            </div>
            <p className="mt-0.5 text-[11.5px] font-medium leading-relaxed text-muted">
              {t.waitingSub.replace("{date}", fmtDate(payload.commencementDate))}
            </p>

            <div className="mt-3 flex flex-col gap-2.5">
              {payload.waitingPeriods.map((p) => {
                const meta = periods[p.key];
                const isOpen = openPeriod === p.key;
                // Green once the window is open; gold when it is close enough
                // to plan around; quiet sand when it is still far off.
                const soon = !p.active && p.daysRemaining <= 60;
                return (
                  <div key={p.key} className="overflow-hidden rounded-[16px] border border-sand bg-white shadow-card">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenPeriod(isOpen ? null : p.key);
                        setOpenTip(null);
                      }}
                      aria-expanded={isOpen}
                      className="press flex min-h-11 w-full items-start gap-2.5 p-3.5 text-left"
                    >
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 flex-none rounded-full ${
                          p.active ? "bg-green" : soon ? "bg-gold" : "bg-sand-2"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[13.5px] font-bold tracking-[-0.01em] text-navy">{meta.label}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold tracking-[0.06em] ${
                              p.active ? "bg-success-bg text-green" : soon ? "bg-warn-gold-bg text-warn-gold-text" : "bg-sand-3 text-muted"
                            }`}
                          >
                            {p.active ? t.covered : t.daysLeft.replace("{n}", String(p.daysRemaining))}
                          </span>
                        </span>
                        <span className="mt-1 block text-[11.5px] font-medium leading-relaxed text-ink">{meta.summary}</span>
                        <span className="mt-1.5 block text-[11px] font-semibold text-taupe">
                          {(p.active ? t.coveredSince : t.coveredFrom) + " " + fmtDate(p.startsOn)}
                        </span>
                      </span>
                      <IconChevron className={`mt-1 h-3.5 w-3.5 flex-none text-taupe transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isOpen && (
                      <div className="border-t border-sand-3 px-3.5 pb-3.5 pt-3">
                        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2">{t.included}</div>
                        <div className="mt-1 text-[10.5px] font-medium text-taupe">{t.tapForInfo}</div>
                        <ul className="mt-2.5 flex flex-col gap-1.5">
                          {conditions[p.key].map((c) => {
                            const tipId = `${p.key}:${c.label}`;
                            const tipOpen = openTip === tipId;
                            return (
                              <li key={c.label}>
                                {/* Tap to expand on a phone, hover for the same
                                    sentence on a desktop -- a tooltip that only
                                    answers to hover answers nobody here. */}
                                <button
                                  type="button"
                                  title={c.tip}
                                  aria-expanded={tipOpen}
                                  onClick={() => setOpenTip(tipOpen ? null : tipId)}
                                  className={`press flex w-full items-start gap-2 rounded-[10px] px-2 py-1.5 text-left ${
                                    tipOpen ? "bg-info-blue-bg-2" : ""
                                  }`}
                                >
                                  <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-taupe" />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[11.5px] font-medium leading-snug text-ink">{c.label}</span>
                                    {tipOpen && (
                                      <span className="mt-1 block text-[11px] font-medium leading-relaxed text-info-blue-text">
                                        {c.tip}
                                      </span>
                                    )}
                                  </span>
                                  <IconInfo className={`mt-0.5 h-3 w-3 flex-none ${tipOpen ? "text-info-blue-text" : "text-taupe"}`} />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === "nominees" && (
          <section>
            <div className="flex items-baseline justify-between gap-2.5">
              <h2 className="text-[15px] font-bold tracking-[-0.01em] text-navy">{t.nomineeTitle}</h2>
              {payload.nominees.length > 0 && (
                <span className="text-[11px] font-bold text-green">{t.allocated.replace("{n}", String(allocated))}</span>
              )}
            </div>
            <p className="mt-0.5 text-[11.5px] font-medium leading-relaxed text-muted">{t.nomineeSub}</p>

            <div className="mt-3 flex flex-col gap-2.5">
              {payload.nominees.length === 0 && (
                <div className="rounded-[16px] border border-sand bg-white p-4 text-[11.5px] font-medium text-muted">
                  {t.nomineeEmpty}
                </div>
              )}
              {payload.nominees.map((n, i) => (
                <div key={`${n.name}-${i}`} className="flex items-center gap-3 rounded-[16px] border border-sand bg-white p-3.5 shadow-card">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[12px] bg-info-blue-bg-2 text-[11px] font-bold text-info-blue-text">
                    {initials(n.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold leading-snug text-navy">{n.name}</span>
                    {n.relationship && <span className="mt-0.5 block text-[11px] font-medium text-muted">{n.relationship}</span>}
                  </span>
                  <span className="flex-none text-[17px] font-extrabold tracking-[-0.02em] text-navy">
                    {n.percentage === null ? "—" : `${n.percentage}%`}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-3 rounded-[16px] border border-sand-2 bg-sand-3 p-3.5 text-[11.5px] font-medium leading-relaxed text-ink">
              {t.nomineeFoot}
            </p>
          </section>
        )}

        {tab === "guides" && (
          <section className="flex flex-col gap-3.5">
            {/* Gold, because it is the one link here that reaches the insurer's
                own system rather than ours. */}
            <a
              href={OFFICIAL_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="press flex min-h-11 items-center gap-3 rounded-[16px] bg-gold p-4 shadow-[0_10px_22px_-14px_rgba(15,37,64,.55)]"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[13px] bg-navy">
                <IconCert className="h-[19px] w-[19px] text-gold" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-navy/60">{t.officialEyebrow}</span>
                <span className="mt-0.5 block text-[14px] font-extrabold leading-tight tracking-[-0.015em] text-navy">
                  {t.officialTitle}
                </span>
                <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-navy/70">{t.officialNote}</span>
              </span>
              <IconExternal className="h-4 w-4 flex-none text-navy" />
            </a>

            <div>
              <h2 className="text-[15px] font-bold tracking-[-0.01em] text-navy">{t.guidesTitle}</h2>
              <p className="mt-0.5 text-[11.5px] font-medium leading-relaxed text-muted">{t.guidesSub}</p>
              <div className="mt-3 flex flex-col gap-2.5">
                {payload.guideKeys.map((key) => {
                  const guide = PORTAL_GUIDES[key];
                  return (
                    <a
                      key={key}
                      href={guide.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="press flex min-h-11 items-center gap-3 rounded-[16px] border border-sand bg-white p-3.5 shadow-card"
                    >
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[12px] bg-info-blue-bg-2">
                        <IconBook className="h-4 w-4 text-info-blue-text" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold leading-snug tracking-[-0.01em] text-navy">
                          {guide[lang].title}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-medium leading-snug text-muted">{guide[lang].note}</span>
                      </span>
                      <IconExternal className="h-[15px] w-[15px] flex-none text-taupe" />
                    </a>
                  );
                })}
              </div>
            </div>

            <AgentCard payload={payload} t={t} />
          </section>
        )}

        {/* On every tab, never behind a tap. */}
        <div className="rounded-[16px] border border-sand-2 bg-white p-3.5">
          <div className="flex items-start gap-2.5">
            <IconWarn className="mt-px h-4 w-4 flex-none text-alert-red" />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold leading-snug text-alert-red">{t.disclaimerTitle}</div>
              <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-ink">{t.disclaimerBody}</p>
            </div>
          </div>
        </div>

        <p className="pb-3 pt-0.5 text-center text-[10.5px] font-medium text-taupe">{t.footerViewOnly}</p>
      </main>

      {/* Bottom menu: the thumb reaches it, and it never scrolls away. */}
      <nav className="sticky bottom-0 mt-auto border-t border-sand-2 bg-cream/95 px-2 pb-2.5 pt-1.5 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-0.5">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              aria-current={tab === item.key ? "page" : undefined}
              className={`press flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[14px] px-0.5 pb-1.5 pt-1.5 ${
                tab === item.key ? "bg-warn-gold-bg text-navy" : "text-taupe"
              }`}
            >
              <span className="h-[19px] w-[19px]">{item.icon}</span>
              <span className="text-[9.5px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {showOnboard && (
        <div className="fixed inset-0 z-20 flex items-end bg-navy/55 p-4" role="dialog" aria-modal="true">
          <div className="mx-auto w-full max-w-md rounded-[22px] bg-white p-5 shadow-[0_24px_50px_-20px_rgba(15,37,64,.6)]">
            <div className="flex items-center gap-3">
              <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[13px] bg-gold">
                <IconShield className="h-5 w-5 text-navy" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-extrabold leading-tight tracking-[-0.02em] text-navy">{t.onboardTitle}</div>
                <div className="mt-0.5 text-[11.5px] font-medium leading-snug text-muted">{t.onboardSub}</div>
              </div>
            </div>

            <ol className="mt-4 flex flex-col gap-3">
              {t.onboardSteps.map(([title, body], i) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-info-blue-bg-2 text-[10.5px] font-extrabold text-info-blue-text">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold leading-snug text-navy">{title}</span>
                    <span className="mt-0.5 block text-[11.5px] font-medium leading-relaxed text-ink">
                      {body.replace("{tabs}", tabList)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() => dismissOnboard(false)}
              className="press mt-4 flex min-h-12 w-full items-center justify-center rounded-[12px] bg-navy p-3.5 text-[13px] font-bold text-white"
            >
              {t.onboardCta}
            </button>
            <button
              type="button"
              onClick={() => dismissOnboard(true)}
              className="press mt-2 flex min-h-10 w-full items-center justify-center gap-2 p-2 text-[11.5px] font-semibold text-muted"
            >
              <IconBox className="h-3.5 w-3.5" />
              {t.onboardMute}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AgentCard({ payload, t }: { payload: PortalPayload; t: Copy }) {
  return (
    <section className="rounded-[16px] border border-sand bg-white p-4 shadow-card">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-taupe-2">{t.agentTitle}</div>
      <div className="mt-2.5 flex items-center gap-3">
        <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[14px] bg-navy text-[14px] font-bold text-gold">
          {payload.agent.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold tracking-[-0.01em] text-navy">{payload.agent.name}</span>
          <span className="mt-0.5 block text-[11.5px] font-medium text-muted">{t.agentRole}</span>
        </span>
      </div>
      {payload.agent.waNumber && (
        <a
          href={`https://wa.me/${payload.agent.waNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="press mt-3 flex min-h-[46px] items-center justify-center gap-2 rounded-[12px] bg-green p-3.5 text-[13px] font-bold text-white"
        >
          <IconWhatsApp className="h-4 w-4" />
          {t.agentCta}
        </a>
      )}
    </section>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* Icons: inline so the portal loads nothing it does not need. currentColor
   throughout, so each one takes the colour of whatever it sits in. */
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IconShield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M12 3 4 6.2v5.4c0 4.4 3.3 8.5 8 9.4 4.7-.9 8-5 8-9.4V6.2z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconCert({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M7 10h5M7 14h8" />
    </svg>
  );
}
function IconClock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
function IconPeople({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c.6-3 2.9-4.6 5.5-4.6s4.9 1.6 5.5 4.6M16.5 7.5h4.5M16.5 11h4.5" />
    </svg>
  );
}
function IconBook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" />
    </svg>
  );
}
function IconHelp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4M12 17h.01" />
    </svg>
  );
}
function IconInfo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}
function IconWarn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
function IconChevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.4}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IconExternal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}
function IconBox({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.2}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
    </svg>
  );
}
function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Z" />
    </svg>
  );
}
