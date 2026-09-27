import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicAgentLandingPage, recordLandingView } from "@/lib/landing-public";
import { isValidAgentSlug } from "@/lib/agent-slug";
import { RenderLanding } from "@/app/p/[slug]/render-landing";

// The per-agent public URL, /<agent-slug>/<page-slug> -- the same public
// landing page as /p/<slug>, just namespaced under the agent who owns it.
// This route only ever wins against a real two-segment path when nothing more
// specific matches (see middleware.ts and lib/agent-slug.ts for the full list
// of reserved first segments), so an invalid or reserved agent segment simply
// 404s here rather than shadowing another route.

async function resolve(agent: string, page: string) {
  if (!isValidAgentSlug(agent)) return null;
  return getPublicAgentLandingPage(agent, page);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agent: string; page: string }>;
}): Promise<Metadata> {
  const { agent, page: pageSlug } = await params;
  const page = await resolve(agent, pageSlug);
  if (!page) return { title: "Halaman tidak dijumpai" };

  if (page.layout === "agent") {
    const photo = page.content.agentPhotoUrl || page.agent.photoUrl || undefined;
    return {
      title: `${page.agent.fullName} — Profil Digital Takaful`,
      description: page.content.agentQuote,
      openGraph: {
        title: page.agent.fullName,
        description: page.content.agentQuote,
        images: photo ? [photo] : undefined,
      },
      robots: { index: false, follow: false },
    };
  }

  const title = `${page.content.heroHeadline} ${page.content.heroHighlight}`.trim();
  return {
    title: `${title} — ${page.agent.fullName}`,
    description: page.content.heroBody,
    openGraph: { title, description: page.content.heroBody, type: "website" },
    robots: { index: false, follow: false },
  };
}

// Public: reached by anyone the link is forwarded to, with no account and no
// session. Middleware exempts this two-segment shape for exactly that reason.
export default async function AgentLandingPage({
  params,
}: {
  params: Promise<{ agent: string; page: string }>;
}) {
  const { agent, page: pageSlug } = await params;
  const page = await resolve(agent, pageSlug);
  if (!page) notFound();

  // Fire-and-forget: a visit counter must never delay or break the page.
  void recordLandingView(page.id);

  return <RenderLanding page={page} />;
}
