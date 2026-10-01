import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { NewTicketForm } from "./new-ticket-form";

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  // A link from elsewhere in the app can pre-fill "the page this is about".
  const params = await searchParams;

  return <NewTicketForm initialPageUrl={params.page ?? ""} />;
}
