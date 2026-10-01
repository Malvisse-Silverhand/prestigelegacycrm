import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getForms } from "./data";
import { NotSetUp } from "./feedback-chips";
import { FeedbackView } from "./feedback-view";

export default async function FeedbackPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const isAdmin = profile.role === "superadmin";
  const canSeeSubmissions = isAdmin || profile.role === "group_manager" || profile.role === "unit_manager";

  const result = await getForms(canSeeSubmissions);
  if (!result.setup) return <NotSetUp />;

  return <FeedbackView forms={result.forms} isAdmin={isAdmin} canSeeSubmissions={canSeeSubmissions} />;
}
