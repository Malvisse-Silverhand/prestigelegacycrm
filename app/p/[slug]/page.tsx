import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicLandingPage, recordLandingView } from "@/lib/landing-public";
import { LandingPageView } from "./landing-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicLandingPage(slug);
  if (!page) return { title: "Halaman tidak dijumpai" };

  const title = `${page.content.heroHeadline} ${page.content.heroHighlight}`.trim();
  return {
    title: `${title} — ${page.agent.fullName}`,
    description: page.content.heroBody,
    // These links get pasted into WhatsApp constantly, so the preview card
    // matters as much as the page.
    openGraph: { title, description: page.content.heroBody, type: "website" },
    robots: { index: false, follow: false },
  };
}

// Public: reached by anyone the link is forwarded to, with no account and no
// session. Middleware exempts /p/* for exactly this reason.
export default async function PublicLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPublicLandingPage(slug);
  if (!page) notFound();

  // Fire-and-forget: a visit counter must never delay or break the page.
  void recordLandingView(page.id);

  return <LandingPageView page={page} />;
}
