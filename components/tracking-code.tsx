import { getTrackingSettings } from "@/lib/site-settings";

// Drops the tracking snippets a SuperAdmin saved in Settings into the public
// landing pages.
//
// The markup goes out with the server-rendered HTML, so the browser parses and
// runs it during the initial parse, the way a pixel expects. (Setting the same
// string with innerHTML on the client would insert the <script> tags without
// ever executing them.)
//
// Deliberately server-side and deliberately public-only: this is never
// rendered inside the CRM itself. A third-party pixel on the authenticated app
// would ship lead names, phone numbers and quotation URLs to an ad network,
// and page URLs in this app carry lead ids.
export async function TrackingCode({ slot }: { slot: "head" | "body" | "footer" }) {
  const settings = await getTrackingSettings();
  if (!settings.enabled) return null;

  const html = settings[slot];
  if (!html.trim()) return null;

  return <div data-tracking={slot} dangerouslySetInnerHTML={{ __html: html }} />;
}
