import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getFormById, getSubmissions } from "../../data";
import { NotSetUp, Notice } from "../../feedback-chips";
import { SubmissionsView } from "./submissions-view";

export default async function SubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "superadmin" && profile.role !== "group_manager" && profile.role !== "unit_manager") {
    return <Notice title="Not allowed" body="Only SuperAdmins, Group Managers and Unit Managers can view submissions." />;
  }

  const { id } = await params;
  const form = await getFormById(id);
  if (form.state === "not_setup") return <NotSetUp />;
  if (form.state === "not_found") return <Notice title="Form not found" body="This form may have been deleted." />;

  const subs = await getSubmissions(form.form.id);
  if (!subs.setup) return <NotSetUp />;

  return <SubmissionsView form={form.form} rows={subs.rows} truncated={subs.truncated} />;
}
