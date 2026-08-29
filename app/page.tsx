import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-cream px-4 py-10">
      <div className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-card bg-cream shadow-elevated">
        <div className="bg-navy px-10 pt-11 pb-13 text-white">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="Prestige Legacy"
              width={40}
              height={40}
              className="h-10 w-10 flex-none rounded-xl object-cover"
              priority
            />
            <div className="text-[17px] font-bold">Prestige Legacy</div>
          </div>
          <div className="mt-7 text-[27px] leading-[1.25] font-extrabold tracking-[-0.02em]">
            One system for every lead,
            <br />
            <span className="text-gold">quote, and follow-up.</span>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/70">
            Prestige Legacy CRM keeps your team&apos;s leads, quotations, and pipeline
            organised in one place — built for agents and managers who can&apos;t
            afford to let a lead slip through.
          </p>
        </div>

        <div className="flex flex-col gap-3 px-10 pt-[30px] pb-[34px]">
          <Link
            href="/login"
            className="flex h-[52px] items-center justify-center rounded-[13px] bg-navy text-[15px] font-semibold text-white transition-colors hover:bg-navy/90"
          >
            Log In
          </Link>
          <a
            href="https://syedamirul.my/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[52px] items-center justify-center rounded-[13px] bg-gold text-[15px] font-semibold text-navy transition-colors hover:bg-gold/85"
          >
            Daftar Ejen
          </a>

          <div className="mt-[6px] flex items-center justify-center gap-2 border-t border-sand pt-[22px] text-[11px] font-semibold text-taupe">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <rect x="4" y="10" width="16" height="11" rx="2.5" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Agent portal · authorised users only
          </div>
        </div>
      </div>
    </div>
  );
}
