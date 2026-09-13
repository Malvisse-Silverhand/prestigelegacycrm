import { getCurrentProfile } from "@/lib/supabase/profile";
import { getCases, getSubmittableLeads, getBenefitOptions } from "../data";
import { SubmitCaseView } from "./submit-case-view";

export default async function SubmitCasePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [cases, leads, benefitOptions] = await Promise.all([
    getCases(),
    getSubmittableLeads(),
    getBenefitOptions(),
  ]);

  return <SubmitCaseView cases={cases} leads={leads} benefitOptions={benefitOptions} />;
}
