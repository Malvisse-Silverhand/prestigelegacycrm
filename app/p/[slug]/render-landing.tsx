import type { PublicLandingPage } from "@/lib/landing-public";
import { LandingPageView } from "./landing-view";
import { MedicalLandingView } from "./medical-view";
import { AgentLandingView } from "./agent-view";
import { TrackingCode } from "@/components/tracking-code";

// Shared by /p/<slug> and /<agent>/<page> -- same page, same tracking slots,
// just reached by two different URLs. Picks the right layout component and
// wraps it with the SuperAdmin-configured tracking snippets exactly once, so
// neither route has to remember to do it itself.
export function RenderLanding({ page }: { page: PublicLandingPage }) {
  return (
    <>
      {/* Page components render inside <body>, so "head" here means the top of
          the document body -- first thing parsed, before any content. That is
          early enough for a pixel to fire; it is not literally inside <head>,
          and the Settings screen says so. */}
      <TrackingCode slot="head" />
      <TrackingCode slot="body" />
      {page.layout === "agent" ? (
        <AgentLandingView page={page} />
      ) : page.layout === "medical" ? (
        <MedicalLandingView page={page} />
      ) : (
        <LandingPageView page={page} />
      )}
      <TrackingCode slot="footer" />
    </>
  );
}
