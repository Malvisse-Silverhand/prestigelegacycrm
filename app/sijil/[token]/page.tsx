import type { Metadata } from "next";
import { getPortalPayload, recordPortalOpen } from "@/lib/client-portal";
import { malaysiaToday } from "@/lib/malaysia-date";
import { PortalView } from "./portal-view";
import { PortalClosed } from "./portal-closed";

// A forwarded link should never render a preview card naming the client, and
// none of this belongs in a search index.
export const metadata: Metadata = {
  title: "Portal Klien — Prestige Legacy",
  robots: { index: false, follow: false },
};

// The token is the credential, so nothing here may be cached or statically
// rendered: every request resolves the link afresh, and a revoked link stops
// working the moment it is revoked.
export const dynamic = "force-dynamic";

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Today is settled on the server, where the timezone is known. Every waiting
  // period date is counted from it, and the server runs UTC while the people
  // reading this are in UTC+8 -- so a client-side clock would put the whole
  // page a day out for anyone browsing in the evening.
  const today = malaysiaToday();
  const payload = await getPortalPayload(token, today);

  // Revoked, deleted, or never real: all one answer. Telling them apart would
  // let someone probe for which tokens once existed.
  if (!payload) return <PortalClosed />;

  // Fire-and-forget: a view counter must never delay or break the page.
  void recordPortalOpen(payload.linkId);

  // No `today` goes to the browser: every waiting-period date was already
  // resolved against it server-side, so the page cannot drift by a day for a
  // client whose device clock or timezone disagrees.
  return <PortalView payload={payload} />;
}
