import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getLandingPage } from "../data";
import { PageBuilder } from "./page-builder";

export default async function LandingPageBuilderRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  // RLS scopes this to pages the caller may manage, so "not found" and
  // "not yours" are indistinguishable here -- which is what we want.
  const page = await getLandingPage(id);
  if (!page) notFound();

  return <PageBuilder page={page} />;
}
