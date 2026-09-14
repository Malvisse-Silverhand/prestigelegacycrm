// The dead end, deliberately identical for a revoked link, a deleted case and
// a token that was never real. Telling them apart would let someone probe for
// which tokens once existed, and it would tell a forwarded-to stranger
// something about a client they have no business knowing.
//
// Bilingual at once rather than behind a toggle: whoever landed here has no
// portal to set a language preference in.
export function PortalClosed() {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="flex items-center gap-2.5 bg-navy px-4 py-3">
        <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-gold">
          <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] text-navy" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4 6.2v5.4c0 4.4 3.3 8.5 8 9.4 4.7-.9 8-5 8-9.4V6.2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold leading-tight tracking-[-0.01em] text-white">Prestige Legacy</div>
          <div className="text-[9.5px] font-semibold uppercase leading-snug tracking-[0.1em] text-gold">Portal Klien</div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="rounded-[20px] border border-sand bg-white p-6 shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-sand-3">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-taupe" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
              <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
            </svg>
          </div>

          <h1 className="mt-4 text-[18px] font-bold leading-tight tracking-[-0.02em] text-navy">
            Pautan ini tidak lagi aktif
          </h1>
          <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-ink">
            Pautan portal ini telah ditamatkan atau sudah tidak sah. Sila hubungi ejen anda untuk mendapatkan pautan
            baharu.
          </p>

          <div className="mt-5 border-t border-sand-3 pt-5">
            <h2 className="text-[15px] font-bold leading-tight tracking-[-0.02em] text-navy">
              This link is no longer active
            </h2>
            <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-ink">
              This portal link has been revoked or is no longer valid. Please contact your agent for a new link.
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-[10.5px] font-medium leading-relaxed text-taupe">
          Portal agensi Prestige Legacy. Bukan sistem rasmi Great Eastern Takaful Berhad.
        </p>
      </main>
    </div>
  );
}
