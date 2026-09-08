"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// A thin progress bar for route changes, in ~60 lines and no dependency.
//
// Next's App Router gives no navigation-start event, so this watches the two
// things that actually mean "a new page is coming": a click on an internal
// link, and a history back/forward. It fills toward 90% on a curve while the
// server works, then snaps to 100% and fades once the new pathname commits --
// so it never sits at 100% waiting, and never implies progress it doesn't
// have.
//
// A same-page click (an anchor, a link to where we already are) never starts
// it, and anything that resolves within 120ms never paints, so quick
// navigations don't flash a bar at you.
const PAINT_DELAY_MS = 120;
const TICK_MS = 90;

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);
  const timers = useRef<{ paint?: number; tick?: number; done?: number; finish?: number }>({});

  function clearTimers() {
    const t = timers.current;
    if (t.paint) window.clearTimeout(t.paint);
    if (t.tick) window.clearInterval(t.tick);
    if (t.done) window.clearTimeout(t.done);
    if (t.finish) window.clearTimeout(t.finish);
    timers.current = {};
  }

  useEffect(() => {
    function start() {
      clearTimers();
      timers.current.paint = window.setTimeout(() => {
        setProgress(8);
        timers.current.tick = window.setInterval(() => {
          // Decelerating: fast to ~50%, crawling by 80%, never past 90 until
          // the page actually arrives.
          setProgress((p) => (p === null ? null : p + Math.max(0.6, (90 - p) * 0.12)));
        }, TICK_MS);
      }, PAINT_DELAY_MS);
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(link.href);
      } catch {
        return;
      }
      // External, or the page we are already on -- neither is a navigation
      // worth showing a bar for.
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      start();
    }

    window.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", start);
    return () => {
      window.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", start);
      clearTimers();
    };
  }, []);

  // The new route committed: finish and get out of the way. The state change
  // is deferred into a callback rather than run in the effect body -- it is a
  // reaction to a navigation that already happened, and setting state
  // synchronously here just cascades an extra render.
  useEffect(() => {
    clearTimers();
    timers.current.finish = window.setTimeout(() => {
      setProgress((p) => (p === null ? null : 100));
      timers.current.done = window.setTimeout(() => setProgress(null), 260);
    }, 0);
    return () => clearTimers();
    // searchParams is part of "which page are we on" -- a filter change is a
    // navigation too.
  }, [pathname, searchParams]);

  if (progress === null) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2.5px]"
    >
      <div
        className="h-full bg-gold shadow-[0_0_8px_rgba(250,199,72,.7)]"
        style={{
          width: `${Math.min(progress, 100)}%`,
          transition: progress === 100 ? "width 180ms ease-out, opacity 200ms ease-out 120ms" : "width 180ms ease-out",
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
