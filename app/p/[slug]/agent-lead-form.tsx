"use client";

import { useState, useTransition } from "react";
import type { LandingContent } from "@/lib/landing-content";
import { captureAgentFormLead } from "../actions";

const RED = "#D23B44";
const RED_DARK = "#A82C34";
const RED_LIGHT = "#FDEEEF";

const FIELD =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[14px] font-medium text-slate-800 outline-none transition-[border-color,box-shadow] duration-200 focus:border-[#D23B44] focus:bg-white focus:ring-4 focus:ring-[#D23B44]/10";
const LABEL = "text-[12.5px] font-semibold text-slate-700";

function withName(text: string, name: string) {
  return text.replaceAll("{nama}", name);
}

const TODAY = new Date().toISOString().slice(0, 10);

export function AgentLeadForm({
  slug,
  content,
  agentFirstName,
  waNumber,
  interest,
}: {
  slug: string;
  content: LandingContent;
  agentFirstName: string;
  waNumber: string;
  interest: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string } | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [smoker, setSmoker] = useState<"" | "no" | "yes">("");
  const [occupation, setOccupation] = useState("");

  function submit() {
    setError(null);
    if (fullName.trim().length < 2) return setError("Sila masukkan nama penuh anda.");
    if (phone.replace(/\D/g, "").length < 9) return setError("Sila masukkan nombor telefon yang sah.");
    if (!dob) return setError("Sila pilih tarikh lahir anda.");
    if (!gender) return setError("Sila pilih jantina anda.");
    if (!smoker) return setError("Sila nyatakan status merokok anda.");
    if (occupation.trim().length < 2) return setError("Sila masukkan pekerjaan anda.");

    startTransition(async () => {
      try {
        const result = await captureAgentFormLead({
          slug,
          name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          dob,
          gender,
          smoker: smoker === "yes",
          occupation: occupation.trim(),
          interest,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setDone({ name: fullName.trim() });
      } catch {
        setError("Tidak dapat berhubung. Sila semak internet anda dan cuba lagi.");
      }
    });
  }

  if (done) {
    const waMessage = [
      `Assalamualaikum ${agentFirstName}, saya ${done.name} baru sahaja mengisi borang di laman profil anda.`,
      "",
      "*Maklumat Diri:*",
      `Nama: ${done.name}`,
      `No. Telefon: ${phone}`,
      `Tarikh Lahir: ${dob}`,
      `Jantina: ${gender === "male" ? "Lelaki" : "Perempuan"}`,
      `Merokok: ${smoker === "yes" ? "Ya" : "Tidak"}`,
      `Pekerjaan: ${occupation}`,
      interest ? `Minat: ${interest}` : null,
      "",
      "Boleh saya dapatkan maklumat lanjut?",
    ]
      .filter((l) => l !== null)
      .join("\n");
    const waHref = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}` : null;

    return (
      <div className="agentlp-rise flex flex-col items-center rounded-2xl bg-white px-6 py-9 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: RED_LIGHT }}
        >
          <CheckIcon />
        </div>
        <div className="mt-4 text-[19px] font-extrabold tracking-[-0.01em] text-slate-900">
          {content.agentFormSuccessTitle}
        </div>
        <p className="mt-2 max-w-[30em] text-[13.5px] leading-relaxed text-slate-500">
          {withName(content.agentFormSuccessBody, agentFirstName)}
        </p>
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="press mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3.5 text-[14px] font-bold text-white shadow-md shadow-[#25D366]/25 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
          >
            <WhatsAppIcon />
            Sambung di WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_2px_24px_-8px_rgba(15,23,42,0.12)] sm:p-6">
      <div
        className="motion-safe:animate-pulse inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider"
        style={{ background: RED_LIGHT, color: RED_DARK }}
      >
        {content.agentFormEyebrow}
      </div>
      <h3 className="mt-3 text-[19px] font-extrabold leading-tight tracking-[-0.015em] text-slate-900">
        {content.agentFormTitle}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
        {withName(content.agentFormBody, agentFirstName)}
      </p>

      {interest && (
        <div
          key={interest}
          className="agentlp-ring-flash mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold"
          style={{ background: RED_LIGHT, color: RED_DARK }}
        >
          <SparkleIcon />
          Pilihan anda: {interest}
        </div>
      )}

      <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={LABEL}>
            Nama Penuh <span style={{ color: RED }}>*</span>
          </span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={FIELD} placeholder="Nama seperti dalam IC" />
        </label>

        <label className="block">
          <span className={LABEL}>
            No. Telefon <span style={{ color: RED }}>*</span>
          </span>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={FIELD}
            placeholder="012-345 6789"
          />
        </label>

        <label className="block">
          <span className={LABEL}>E-mel (pilihan)</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} placeholder="anda@email.com" />
        </label>

        <label className="block">
          <span className={LABEL}>
            Tarikh Lahir <span style={{ color: RED }}>*</span>
          </span>
          <input type="date" max={TODAY} value={dob} onChange={(e) => setDob(e.target.value)} className={FIELD} />
        </label>

        <label className="block">
          <span className={LABEL}>
            Jantina <span style={{ color: RED }}>*</span>
          </span>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as "" | "male" | "female")}
            className={FIELD}
          >
            <option value="" disabled>
              Pilih
            </option>
            <option value="male">Lelaki</option>
            <option value="female">Perempuan</option>
          </select>
        </label>

        <label className="block">
          <span className={LABEL}>
            Merokok <span style={{ color: RED }}>*</span>
          </span>
          <select value={smoker} onChange={(e) => setSmoker(e.target.value as "" | "no" | "yes")} className={FIELD}>
            <option value="" disabled>
              Pilih
            </option>
            <option value="no">Tidak</option>
            <option value="yes">Ya</option>
          </select>
        </label>

        <label className="block">
          <span className={LABEL}>
            Pekerjaan <span style={{ color: RED }}>*</span>
          </span>
          <input
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            className={FIELD}
            placeholder="Cth: Eksekutif, Polis"
          />
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-[#A82C34]">{error}</div>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="press mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[14.5px] font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:opacity-60"
        style={{ background: `linear-gradient(135deg, ${RED}, ${RED_DARK})`, boxShadow: `0 10px 24px -8px ${RED}66` }}
      >
        {pending ? "Menghantar…" : content.agentFormSubmit}
        {!pending && <SendIcon />}
      </button>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={RED_DARK} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.8 5.6L19.4 9.4 13.8 11.2 12 17l-1.8-5.8L4.6 9.4l5.6-1.8Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.45 1.33 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm5.83 14.24c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.12.11-1.8-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.8-4.16-4.94-4.35-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.26-.29.58-.36.77-.36.19 0 .39 0 .55.01.18.01.42-.07.65.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.15.31-.29.47-.15.17-.31.37-.44.5-.15.15-.3.31-.13.6.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.35 1.44.29.14.46.12.64-.07.18-.2.75-.87.95-1.17.19-.29.39-.24.65-.14.26.1 1.68.79 1.97.93.29.15.48.22.55.34.07.13.07.73-.17 1.41Z" />
    </svg>
  );
}
