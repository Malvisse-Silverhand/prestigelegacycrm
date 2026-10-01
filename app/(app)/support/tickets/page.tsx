import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getTickets } from "./data";
import { NotSetUp } from "./ticket-chips";
import { TicketsView } from "./tickets-view";

export default async function TicketsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const result = await getTickets();
  if (!result.setup) return <NotSetUp />;

  return <TicketsView tickets={result.tickets} isAdmin={profile.role === "superadmin"} />;
}
