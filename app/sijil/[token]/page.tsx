import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getPortalCertificates, recordPortalOpens, resolvePortalAnchor } from "@/lib/client-portal";
import { verifySessionToken, PORTAL_SESSION_COOKIE } from "@/lib/portal-session";
import { malaysiaToday } from "@/lib/malaysia-date";
import { PortalView } from "./portal-view";
import { PortalLogin } from "./portal-login";
import { PortalClosed } from "./portal-closed";

// A forwarded link should never render a preview card naming the client, and
// none of this belongs in a search index.
export const metadata: Metadata = {
  title: "Portal Klien — Prestige Legacy",
  robots: { index: false, follow: false },
};

// The token is a live credential and identity is checked fresh every visit,
// so nothing here may be cached or statically rendered.
export const dynamic = "force-dynamic";

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Today is settled on the server, where the timezone is known. Every
  // waiting period date is counted from it, and the server runs UTC while the
  // people reading this are in UTC+8 -- so a client-side clock would put the
  // whole page a day out for anyone browsing in the evening.
  const today = malaysiaToday();

  const jar = await cookies();
  const session = verifySessionToken(jar.get(PORTAL_SESSION_COOKIE)?.value);

  if (session) {
    // Logged in already: what they see is decided fresh, by NRIC, from
    // whichever certificates still carry a live link -- never from which
    // specific token they used to log in. A link revoked mid-session drops
    // out of this list on the very next render with no extra plumbing.
    const certificates = await getPortalCertificates(session, today);
    if (certificates.length === 0) return <PortalClosed />;

    void recordPortalOpens(certificates.map((c) => c.linkId).filter((id): id is string => id !== null));
    return <PortalView payloads={certificates} />;
  }

  // Not logged in: this ONE token has to resolve to something real before a
  // login form is worth showing at all.
  const anchor = await resolvePortalAnchor(token);
  if (!anchor) return <PortalClosed />;

  return <PortalLogin token={token} />;
}
