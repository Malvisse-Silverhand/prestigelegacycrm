import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getFormBySlug } from "../../data";
import { NotSetUp, Notice } from "../../feedback-chips";
import { FillForm } from "./fill-form";

export default async function FillFeedbackFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { slug } = await params;
  const query = await searchParams;
  const from = typeof query.from === "string" ? query.from : "";

  const result = await getFormBySlug(slug);
  if (result.state === "not_setup") return <NotSetUp />;
  if (result.state === "not_found") {
    return <Notice title="Form not found" body="This link may be wrong, or the form has been removed." />;
  }
  if (!result.form.isOpen) {
    return <Notice title="This form is closed" body="It isn't taking answers any more. Thank you for your interest." />;
  }

  return <FillForm form={result.form} from={from} />;
}
