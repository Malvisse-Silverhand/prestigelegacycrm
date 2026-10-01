import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getFormById } from "../../data";
import { NotSetUp, Notice } from "../../feedback-chips";
import { FormBuilder } from "../../form-builder";

export default async function EditFeedbackFormPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "superadmin") {
    return <Notice title="Not allowed" body="Only a SuperAdmin can edit feedback forms." />;
  }

  const { id } = await params;
  const result = await getFormById(id);
  if (result.state === "not_setup") return <NotSetUp />;
  if (result.state === "not_found") {
    return <Notice title="Form not found" body="This form may have been deleted." />;
  }
  return <FormBuilder initial={result.form} />;
}
