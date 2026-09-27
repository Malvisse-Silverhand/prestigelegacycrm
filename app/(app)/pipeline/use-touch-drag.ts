"use client";

import { useEffect, useRef, useState } from "react";
import type { PipelineStage } from "@/lib/pipeline-stages";

// Long-press-then-drag for the mobile board's swipeable, one-column-per-
// screen layout. Pointer events would be the natural fit, but the browser
// sends `pointercancel` the moment it decides a touch is a page pan/scroll,
// which is exactly the gesture this needs to *become* a drag rather than
// lose to. Raw touch events, with a manual `preventDefault()` only once a
// press has been held still for LONG_PRESS_MS, are the only way to tell a
// scroll and a drag apart without the browser jumping in first.
const LONG_PRESS_MS = 450;
const MOVE_CANCEL_PX = 8;
const EDGE_ZONE_PX = 36;
const EDGE_DELAY_MS = 350;
const EDGE_REPEAT_MS = 700;

type DragState = {
  leadId: string;
  stage: PipelineStage;
  label: string;
  startX: number;
  startY: number;
  active: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  edgeTimer: ReturnType<typeof setTimeout> | null;
  edgeInterval: ReturnType<typeof setInterval> | null;
  edgeDir: "left" | "right" | null;
};

export function useTouchDrag(opts: {
  scroller: React.RefObject<HTMLDivElement | null>;
  onDrop: (leadId: string, fromStage: PipelineStage) => void;
  enabled: boolean;
}) {
  const { scroller, onDrop, enabled } = opts;
  const [drag, setDrag] = useState<null | { leadId: string; x: number; y: number; label: string }>(null);
  // A ref, not state: touchmove fires far too often to route through React,
  // and the document-level listeners below (added once per `enabled`/`onDrop`
  // change) need to see whichever press is currently pending or active.
  const stateRef = useRef<DragState | null>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function clearTimers(s: DragState) {
      if (s.longPressTimer) clearTimeout(s.longPressTimer);
      if (s.edgeTimer) clearTimeout(s.edgeTimer);
      if (s.edgeInterval) clearInterval(s.edgeInterval);
      s.longPressTimer = null;
      s.edgeTimer = null;
      s.edgeInterval = null;
      s.edgeDir = null;
    }

    function scrollByOneColumn(dir: "left" | "right") {
      const el = scroller.current;
      if (!el) return;
      const width = el.clientWidth;
      const target = dir === "left" ? el.scrollLeft - width : el.scrollLeft + width;
      el.scrollTo({ left: Math.max(0, target), behavior: reducedMotionRef.current ? "auto" : "smooth" });
    }

    function handleMove(e: TouchEvent) {
      const s = stateRef.current;
      if (!s) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - s.startX;
      const dy = t.clientY - s.startY;

      if (!s.active) {
        // Not a drag yet -- if the finger has actually moved, this is a
        // scroll or a swipe between columns, so let the browser have it.
        if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
          clearTimers(s);
          stateRef.current = null;
        }
        return;
      }

      // Once picked up, the gesture belongs to the drag: block the page
      // scroll and the column swipe that a raw touchmove would otherwise
      // trigger.
      e.preventDefault();
      setDrag({ leadId: s.leadId, x: t.clientX, y: t.clientY, label: s.label });

      const el = scroller.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nearLeft = t.clientX - rect.left < EDGE_ZONE_PX;
      const nearRight = rect.right - t.clientX < EDGE_ZONE_PX;
      const dir: "left" | "right" | null = nearLeft ? "left" : nearRight ? "right" : null;
      if (dir !== s.edgeDir) {
        if (s.edgeTimer) clearTimeout(s.edgeTimer);
        if (s.edgeInterval) clearInterval(s.edgeInterval);
        s.edgeTimer = null;
        s.edgeInterval = null;
        s.edgeDir = dir;
        if (dir) {
          s.edgeTimer = setTimeout(() => {
            scrollByOneColumn(dir);
            s.edgeInterval = setInterval(() => scrollByOneColumn(dir), EDGE_REPEAT_MS);
          }, EDGE_DELAY_MS);
        }
      }
    }

    function handleEnd() {
      const s = stateRef.current;
      if (!s) return;
      clearTimers(s);
      stateRef.current = null;
      setDrag(null);
      if (s.active) onDrop(s.leadId, s.stage);
    }

    // React's own touch handlers are passive, so preventDefault() during a
    // drag has to go through a manually attached, non-passive listener.
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", handleEnd);
    return () => {
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
      document.removeEventListener("touchcancel", handleEnd);
      const s = stateRef.current;
      if (s) clearTimers(s);
    };
  }, [enabled, onDrop, scroller]);

  function bind(leadId: string, stage: PipelineStage) {
    return {
      onTouchStart: (e: React.TouchEvent) => {
        if (!enabled) return;
        // Let taps on real controls behave normally -- a drag only ever
        // starts from a still press on the card body.
        if ((e.target as HTMLElement).closest("a, button, select, input")) return;
        const t = e.touches[0];
        if (!t) return;
        const label = (e.currentTarget as HTMLElement).dataset.label ?? "";
        const s: DragState = {
          leadId,
          stage,
          label,
          startX: t.clientX,
          startY: t.clientY,
          active: false,
          longPressTimer: null,
          edgeTimer: null,
          edgeInterval: null,
          edgeDir: null,
        };
        stateRef.current = s;
        s.longPressTimer = setTimeout(() => {
          if (stateRef.current !== s) return;
          s.active = true;
          navigator.vibrate?.(12);
          setDrag({ leadId, x: t.clientX, y: t.clientY, label });
        }, LONG_PRESS_MS);
      },
    };
  }

  return { bind, drag };
}
