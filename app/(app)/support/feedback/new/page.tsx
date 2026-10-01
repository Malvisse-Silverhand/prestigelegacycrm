import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { Notice } from "../feedback-chips";
import { FormBuilder } from "../form-builder";

export default async function NewFeedbackFormPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "superadmin") {
    return <Notice title="Not allowed" body="Only a SuperAdmin can create feedback forms." />;
  }
  return <FormBuilder />;
}
