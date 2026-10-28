// The branded top bar and page frame shared by every screen of the lead form
// (closed, gate, form, thank-you). Plain markup, no hooks, so server and
// client components can both use it.
export function FormHeader() {
  return (
    <header className="flex items-center gap-2.5 bg-brand px-4 py-3">
      <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-gold">
        <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] text-navy" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3 4 6.2v5.4c0 4.4 3.3 8.5 8 9.4 4.7-.9 8-5 8-9.4V6.2z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold leading-tight tracking-[-0.01em] text-white">Prestige Legacy</div>
        <div className="text-[9.5px] font-semibold uppercase leading-snug tracking-[0.1em] text-gold">Secure Form</div>
      </div>
    </header>
  );
}

/** Centered single-card layout for the dead-end, gate and thank-you screens. */
export function FormCardPage({ children, footnote }: { children: React.ReactNode; footnote?: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <FormHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="rounded-[20px] border border-sand bg-white p-6 shadow-card">{children}</div>
        {footnote && <p className="mt-5 text-center text-[10.5px] font-medium leading-relaxed text-taupe">{footnote}</p>}
      </main>
    </div>
  );
}

export function FormIcon({ tone, children }: { tone: "brand" | "muted" | "ok"; children: React.ReactNode }) {
  const bg = tone === "brand" ? "bg-brand" : tone === "ok" ? "bg-brand" : "bg-sand-3";
  const fg = tone === "muted" ? "text-taupe" : "text-gold";
  return (
    <div className={`flex h-12 w-12 items-center justify-center rounded-[16px] ${bg}`}>
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${fg}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </div>
  );
}

export const LOCK_ICON = (
  <>
    <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </>
);

export const CHECK_ICON = <path d="m5 12.5 4.5 4.5L19 7.5" />;
