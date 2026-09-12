import { getCurrentProfile } from "@/lib/supabase/profile";
import { getCases, getSubmittableLeads } from "../data";
import { SubmitCaseView } from "./submit-case-view";

export default async function SubmitCasePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [cases, leads] = await Promise.all([getCases(), getSubmittableLeads()]);

  return <SubmitCaseView cases={cases} leads={leads} />;
}
