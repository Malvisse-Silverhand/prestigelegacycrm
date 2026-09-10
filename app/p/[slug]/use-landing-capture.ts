"use client";

import { useEffect, useState } from "react";
import { captureLandingLead } from "../actions";

/**
 * Listens for a lead coming back out of an embedded calculator.
 *
 * The calculators are the real /tools/*.html files, embedded as-is: they carry
 * the rate tables and all the plan maths, so a landing page never
 * re-implements any of it. It passes the owning agent's WhatsApp number and
 * the page slug in, and this hook picks the lead up on the way out.
 *
 * Shared by every layout so the capture rule -- what counts as a lead, and
 * what gets stored -- has exactly one definition.
 */
export function useLandingCapture(slug: string) {
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // Same-origin only: the iframes are our own /tools pages, so anything
      // from elsewhere is not ours to trust.
      if (e.origin !== window.location.origin) return;
      const data = e.data as
        | { source?: string; type?: string; slug?: string; lead?: Record<string, unknown> }
        | null;
      if (!data || data.source !== "plc-landing" || data.type !== "lead" || !data.lead) return;

      const lead = data.lead as {
        name?: string; phone?: string; email?: string; product?: string;
        dob?: string; gender?: string; smoker?: boolean; estimate?: number | null;
      };
      if (!lead.name || !lead.phone) return;

      // The visitor already has their estimate on screen; this is bookkeeping
      // behind it, so a failure here is logged, never shown to them.
      captureLandingLead({
        slug,
        name: lead.name,
        phone: lead.phone,
        email: lead.email ?? "",
        product: lead.product ?? "Medical Card",
        dob: lead.dob ?? null,
        gender: lead.gender ?? null,
        smoker: lead.smoker ?? null,
        estimate: lead.estimate ?? null,
      })
        .then(() => setCaptured(true))
        .catch(() => {});
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [slug]);

  return captured;
}
