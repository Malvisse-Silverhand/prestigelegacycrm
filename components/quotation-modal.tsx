"use client";

import { useEffect, useRef, useState } from "react";

// Same-origin iframe modal for the two standalone calculators in
// public/tools/. Not a rebuild of the calculators as React components --
// they stay static HTML/JS, this just gives them an in-app frame instead of
// opening in a new tab. The calculators postMessage {type:"t4u-quote-dirty",
// dirty} whenever they have a calculated-but-unsaved quote, which is how the
// close button knows whether to warn before discarding in-progress state.
export function QuotationModal({ url, title, onClose }: { url: string | null; title: string; onClose: () => void }) {
  if (!url) return null;
  // Keyed on url so a new quote (a different URL) always starts from a
  // fresh mount -- dirty state resets for free instead of needing an effect
  // to reset it, which would set state synchronously during render.
  return <QuotationModalPanel key={url} url={url} title={title} onClose={onClose} />;
}

function QuotationModalPanel({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const [dirty, setDirty] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.type === "t4u-quote-dirty") setDirty(Boolean(e.data.dirty));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  function requestClose() {
    if (dirty && !window.confirm("This quotation hasn't been saved yet. Close anyway?")) return;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-4">
      <div className="flex h-[92vh] w-full max-w-[980px] flex-col overflow-hidden rounded-[20px] bg-cream shadow-elevated">
        <div className="flex items-center justify-between border-b border-sand bg-navy px-5 py-3">
          <span className="text-[13px] font-semibold text-white">{title}</span>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-[9px] text-white/70 hover:bg-white/10 hover:text-white"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <iframe ref={iframeRef} src={url} title={title} className="min-h-0 flex-1 border-0 bg-cream" />
      </div>
    </div>
  );
}
