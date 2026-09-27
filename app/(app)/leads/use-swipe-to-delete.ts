"use client";

import { useEffect, useRef, useState } from "react";

export const SWIPE_REVEAL_PX = 84;
const OPEN_AT = SWIPE_REVEAL_PX * 0.4;
// Below this, a touch hasn't committed to a direction yet -- lets a finger
// that's actually starting a vertical scroll pass straight through instead
// of being grabbed the instant it moves at all.
const DECIDE_PX = 6;

/**
 * A left-swipe-to-reveal drag, Shopee-cart-style: drag left to reveal a
 * fixed-width action strip behind the card, release past 40% of it to snap
 * open, anywhere short of that snaps closed. Vertical scrolling is never
 * hijacked -- the first ~6px of movement decides whether this gesture is a
 * horizontal swipe or a page scroll, and once it's decided "vertical" this
 * hook gets out of the way entirely for the rest of that touch.
 *
 * Native listeners in an effect, not React's onTouchMove props: React
 * attaches touch handlers as passive by default, so calling
 * preventDefault() from a synthetic handler is silently ignored in most
 * mobile browsers and the page would scroll out from under the drag (the
 * same reason app/(app)/pipeline/use-touch-drag.ts does the same thing).
 */
export function useSwipeToDelete() {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const xRef = useRef(0);
  const elRef = useRef<HTMLDivElement | null>(null);
  const gesture = useRef<{ startX: number; startY: number; baseX: number; locked: "h" | "v" | null } | null>(null);

  useEffect(() => {
    xRef.current = x;
  }, [x]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      gesture.current = { startX: t.clientX, startY: t.clientY, baseX: xRef.current, locked: null };
    }

    function onMove(e: TouchEvent) {
      const g = gesture.current;
      if (!g) return;
      const t = e.touches[0];
      const dx = t.clientX - g.startX;
      const dy = t.clientY - g.startY;

      if (!g.locked) {
        if (Math.abs(dx) < DECIDE_PX && Math.abs(dy) < DECIDE_PX) return;
        g.locked = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        if (g.locked === "h") setDragging(true);
      }
      if (g.locked !== "h") return;

      e.preventDefault();
      setX(Math.max(-SWIPE_REVEAL_PX, Math.min(0, g.baseX + dx)));
    }

    function onEnd() {
      const g = gesture.current;
      gesture.current = null;
      setDragging(false);
      if (!g || g.locked !== "h") return;
      setX((current) => (current <= -OPEN_AT ? -SWIPE_REVEAL_PX : 0));
    }

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
    // Mount once -- xRef (not x itself) is what onStart reads, so the
    // listeners never need to be torn down and re-attached mid-gesture.
  }, []);

  // Closing one open card when the page starts scrolling elsewhere (a
  // second card being opened, or just scrolling past this one) -- cheap,
  // and skipped entirely while nothing is open.
  useEffect(() => {
    if (x === 0) return;
    function onScroll() {
      setX(0);
    }
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", onScroll, { capture: true });
  }, [x]);

  return { ref: elRef, x, dragging, close: () => setX(0) };
}
